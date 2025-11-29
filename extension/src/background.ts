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

// Storage key for persistence
const STORAGE_KEY = "actionQueue";

// Save queue to chrome.storage
async function saveQueue(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: actionQueue });
    console.log("[Extension] Queue saved to storage");
  } catch (error) {
    console.error("[Extension] Failed to save queue:", error);
  }
}

// Load queue from chrome.storage
async function loadQueue(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
      actionQueue = result[STORAGE_KEY] as QueueItem[];
      console.log(`[Extension] Loaded ${actionQueue.length} items from storage`);

      // Reset any "processing" items to "pending" (was interrupted)
      actionQueue.forEach((item) => {
        if (item.status === "processing") {
          item.status = "pending";
        }
      });

      // Resume processing if there are pending items
      const hasPending = actionQueue.some((item) => item.status === "pending");
      if (hasPending && !isProcessing) {
        console.log("[Extension] Resuming queue processing...");
        void processQueue();
      }
    }
  } catch (error) {
    console.error("[Extension] Failed to load queue:", error);
  }
}

// Clear currentTab reference when the tab is closed
chrome.tabs.onRemoved.addListener((tabId: number) => {
  if (currentTab?.id === tabId) {
    console.log("[Extension] Tab closed, clearing reference");
    currentTab = null;
  }
});

// Configuration
const CONFIG = {
  MIN_DELAY: 30000, // 30 seconds minimum between actions
  MAX_DELAY: 60000, // 60 seconds maximum
  RETRY_ATTEMPTS: 2,
} as const;

// Load queue on startup
void loadQueue();

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
        void saveQueue();
        sendResponse({ success: true, message: "Queue cleared" });
        return;

      default:
        sendResponse({ success: false, error: "Unknown action" });
        return;
    }
  }
);

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener(
  (
    request: ActionCompleteMessage | { action: string },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ): boolean | undefined => {
    // Handle action complete from content script
    if ("type" in request && request.type === "actionComplete") {
      console.log("[Extension] Action complete:", request);
      handleActionComplete(request as ActionCompleteMessage);
      return;
    }

    // Handle requests from popup
    if ("action" in request) {
      switch (request.action) {
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
          void saveQueue();
          sendResponse({ success: true, message: "Queue cleared" });
          return;
      }
    }
  }
);

// Handle bulk follow/unfollow request
function handleBulkAction(
  action: ActionType,
  users: User[],
  sendResponse: (response: ExtensionResponse) => void
): void {
  if (!users || users.length === 0) {
    sendResponse({ success: false, error: "No users provided" });
    return;
  }

  // Add users to queue
  const queueItems: QueueItem[] = users.map((user) => ({
    username: user.username,
    profileUrl: user.profileUrl,
    action,
    status: "pending",
    attempts: 0,
  }));

  actionQueue.push(...queueItems);
  void saveQueue();

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
      void saveQueue();

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
      void saveQueue();
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
    const executeAction = async (): Promise<void> => {
      try {
        // Open or reuse tab using the profileUrl from the queue item
        if (currentTab?.id) {
          try {
            await chrome.tabs.update(currentTab.id, { url: item.profileUrl });
          } catch {
            // Tab was closed, create a new one
            currentTab = null;
            currentTab = await chrome.tabs.create({
              url: item.profileUrl,
              active: false,
            });
          }
        } else {
          currentTab = await chrome.tabs.create({
            url: item.profileUrl,
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
            profileUrl: item.profileUrl,
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
      profileUrl: i.profileUrl,
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
