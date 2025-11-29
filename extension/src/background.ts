import type {
  QueueItem,
  ActionType,
  ExternalRequest,
  ActionCompleteMessage,
  ExtensionResponse,
  User,
} from "@shared/types";

// Queue for processing follow/unfollow actions
let actionQueue: QueueItem[] = [];
let isProcessing = false;
let currentTab: chrome.tabs.Tab | null = null;

// Configuration
const CONFIG = {
  MIN_DELAY: 30000, // 30 seconds minimum between actions
  MAX_DELAY: 60000, // 60 seconds maximum
  RETRY_ATTEMPTS: 2,
} as const;

// Generate random delay between min and max
function getRandomDelay(): number {
  return Math.floor(
    Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY) + CONFIG.MIN_DELAY
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Listen for messages from the web app
chrome.runtime.onMessageExternal.addListener(
  (
    request: ExternalRequest,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: ExtensionResponse) => void
  ): boolean | undefined => {
    console.log("[Extension] Received message:", request);

    switch (request.action) {
      case "ping":
        sendResponse({ success: true, message: "Extension is active" });
        return;

      case "follow":
      case "unfollow":
        handleBulkAction(request.action, request.users, sendResponse);
        return true; // Keep channel open for async response

      case "getStatus":
        sendResponse({
          success: true,
          queueLength: actionQueue.length,
          isProcessing,
          queue: actionQueue,
        });
        return;

      case "cancelAll":
        actionQueue = [];
        isProcessing = false;
        sendResponse({ success: true, message: "Queue cleared" });
        return;

      default:
        sendResponse({ success: false, error: "Unknown action" });
        return;
    }
  }
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener(
  (
    request: ActionCompleteMessage,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response: unknown) => void
  ): void => {
    if (request.type === "actionComplete") {
      console.log("[Extension] Action complete:", request);
      handleActionComplete(request);
    }
  }
);

// Handle bulk follow/unfollow request
function handleBulkAction(
  action: ActionType,
  users: Array<string | User>,
  sendResponse: (response: ExtensionResponse) => void
): void {
  if (!users || users.length === 0) {
    sendResponse({ success: false, error: "No users provided" });
    return;
  }

  // Add users to queue
  const queueItems: QueueItem[] = users.map((user) => ({
    username: typeof user === "string" ? user : user.username,
    action,
    status: "pending",
    attempts: 0,
  }));

  actionQueue.push(...queueItems);

  sendResponse({
    success: true,
    message: `Added ${users.length} users to ${action} queue`,
    queueLength: actionQueue.length,
  });

  // Start processing if not already
  if (!isProcessing) {
    void processQueue();
  }
}

// Process the queue
async function processQueue(): Promise<void> {
  if (isProcessing || actionQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (actionQueue.length > 0) {
    const item = actionQueue.find((i) => i.status === "pending");
    if (!item) {
      break;
    }

    item.status = "processing";
    console.log(`[Extension] Processing: ${item.action} ${item.username}`);

    try {
      await processAction(item);
      item.status = "completed";

      // Notify any listeners
      broadcastProgress();

      // Wait before next action
      if (actionQueue.some((i) => i.status === "pending")) {
        const delay = getRandomDelay();
        console.log(`[Extension] Waiting ${delay / 1000}s before next action`);
        await sleep(delay);
      }
    } catch (error) {
      console.error(`[Extension] Error processing ${item.username}:`, error);
      item.attempts++;

      if (item.attempts < CONFIG.RETRY_ATTEMPTS) {
        item.status = "pending"; // Retry
      } else {
        item.status = "failed";
        item.error = error instanceof Error ? error.message : "Unknown error";
      }
    }
  }

  isProcessing = false;
  console.log("[Extension] Queue processing complete");
  broadcastProgress();
}

let pendingActionCallback: ((result: ActionCompleteMessage) => void) | null =
  null;

// Process a single action
function processAction(item: QueueItem): Promise<ActionCompleteMessage> {
  return new Promise((resolve, reject) => {
    const profileUrl = `https://www.instagram.com/${item.username}/`;

    const executeAction = async (): Promise<void> => {
      try {
        // Open or reuse tab
        if (currentTab?.id) {
          await chrome.tabs.update(currentTab.id, { url: profileUrl });
        } else {
          currentTab = await chrome.tabs.create({
            url: profileUrl,
            active: false,
          });
        }

        // Wait for page to load and set up listener for response
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for action to complete"));
        }, 30000);

        // Store callback for when content script reports back
        pendingActionCallback = (result: ActionCompleteMessage): void => {
          clearTimeout(timeout);
          if (result.success) {
            resolve(result);
          } else {
            reject(new Error(result.error ?? "Action failed"));
          }
        };

        // Wait for tab to load, then send message to content script
        if (currentTab?.id) {
          await waitForTabLoad(currentTab.id);

          // Send action to content script
          await chrome.tabs.sendMessage(currentTab.id, {
            type: "performAction",
            action: item.action,
            username: item.username,
          });
        }
      } catch (error) {
        reject(error);
      }
    };

    void executeAction();
  });
}

function handleActionComplete(result: ActionCompleteMessage): void {
  if (pendingActionCallback) {
    pendingActionCallback(result);
    pendingActionCallback = null;
  }
}

// Wait for tab to finish loading
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      id: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ): void => {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        // Extra delay for Instagram's dynamic content
        setTimeout(resolve, 2000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Broadcast progress to all connected pages
function broadcastProgress(): void {
  const progress = {
    type: "queueProgress" as const,
    queue: actionQueue.map((i) => ({
      username: i.username,
      action: i.action,
      status: i.status,
      error: i.error,
    })),
    isProcessing,
  };

  // Send to all tabs on localhost
  chrome.tabs.query(
    { url: ["http://localhost:*/*", "http://127.0.0.1:*/*"] },
    (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id !== undefined) {
          chrome.tabs.sendMessage(tab.id, progress).catch(() => {
            // Ignore errors for tabs that can't receive messages
          });
        }
      });
    }
  );
}

console.log("[Extension] Background service worker started");
