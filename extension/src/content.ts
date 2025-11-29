import type {
  ActionType,
  PerformActionMessage,
  ActionCompleteMessage,
} from "@shared/types";

// Content script for Instagram pages
console.log("[IG Extension] Content script loaded on:", window.location.href);

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (
    request: PerformActionMessage,
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response: unknown) => void
  ): void => {
    if (request.type === "performAction") {
      console.log("[IG Extension] Performing action:", request);
      void performAction(request.action, request.username);
    }
  }
);

async function performAction(action: ActionType, username: string): Promise<void> {
  try {
    // Wait for page to be fully loaded
    await waitForPageReady();

    // Find the follow/unfollow button
    const button = await findActionButton(action);

    if (!button) {
      throw new Error(`Could not find ${action} button`);
    }

    // Click the button
    button.click();

    // If unfollowing, handle the confirmation dialog
    if (action === "unfollow") {
      await handleUnfollowConfirmation();
    }

    // Report success
    const message: ActionCompleteMessage = {
      type: "actionComplete",
      success: true,
      action,
      username,
    };
    void chrome.runtime.sendMessage(message);
  } catch (error) {
    console.error("[IG Extension] Error:", error);
    const message: ActionCompleteMessage = {
      type: "actionComplete",
      success: false,
      action,
      username,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    void chrome.runtime.sendMessage(message);
  }
}

// Wait for Instagram's dynamic content to load
function waitForPageReady(): Promise<void> {
  return new Promise((resolve) => {
    const checkReady = (): void => {
      // Check if the main content is loaded
      const header = document.querySelector("header");
      const main = document.querySelector("main");

      if (header && main) {
        resolve();
      } else {
        setTimeout(checkReady, 500);
      }
    };

    // Initial delay for SPA navigation
    setTimeout(checkReady, 1000);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Find the follow/following/unfollow button
async function findActionButton(
  action: ActionType
): Promise<HTMLElement | null> {
  // Wait a bit for buttons to render
  await sleep(1000);

  // Instagram button selectors and text patterns
  const buttons = document.querySelectorAll("button");

  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const buttonText = button.textContent?.toLowerCase().trim();
    const ariaLabel = button.getAttribute("aria-label")?.toLowerCase();

    // For follow action, look for "Follow" button (not "Following")
    if (action === "follow") {
      if (
        (buttonText === "follow" || ariaLabel === "follow") &&
        !buttonText?.includes("following") &&
        !buttonText?.includes("requested")
      ) {
        return button;
      }
    }

    // For unfollow action, look for "Following" button
    if (action === "unfollow") {
      if (
        buttonText === "following" ||
        buttonText?.includes("following") ||
        ariaLabel === "following"
      ) {
        return button;
      }
    }
  }

  // Try alternative: look for buttons with specific div text
  const divs = document.querySelectorAll("div[role='button']");
  for (let i = 0; i < divs.length; i++) {
    const div = divs[i] as HTMLElement;
    const text = div.textContent?.toLowerCase().trim();

    if (action === "follow" && text === "follow") {
      return div;
    }
    if (action === "unfollow" && text === "following") {
      return div;
    }
  }

  return null;
}

// Handle the unfollow confirmation dialog
async function handleUnfollowConfirmation(): Promise<void> {
  // Wait for dialog to appear
  await sleep(500);

  // Look for the "Unfollow" confirmation button in the dialog
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Try to find the confirmation button
    const buttons = document.querySelectorAll("button");
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = button.textContent?.toLowerCase().trim();
      if (text === "unfollow") {
        button.click();
        return;
      }
    }

    // Also check for role="button" divs
    const divButtons = document.querySelectorAll("div[role='button']");
    for (let i = 0; i < divButtons.length; i++) {
      const div = divButtons[i] as HTMLElement;
      const text = div.textContent?.toLowerCase().trim();
      if (text === "unfollow") {
        div.click();
        return;
      }
    }

    await sleep(300);
  }

  console.log(
    "[IG Extension] No confirmation dialog found, action may have completed"
  );
}
