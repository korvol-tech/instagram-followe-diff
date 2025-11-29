import type {
  ActionType,
  User,
  ExtensionResponse,
} from "@shared/types";

const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID;

function getChromeRuntime(): typeof chrome.runtime | null {
  if (typeof window !== "undefined" && window.chrome?.runtime) {
    return window.chrome.runtime;
  }
  return null;
}

export async function pingExtension(): Promise<boolean> {
  const runtime = getChromeRuntime();
  if (!runtime || !EXTENSION_ID) return false;

  return new Promise((resolve) => {
    runtime.sendMessage(EXTENSION_ID, { action: "ping" }, (response) => {
      resolve(response?.success === true);
    });
  });
}

export async function sendToExtension(
  action: ActionType,
  users: User[]
): Promise<ExtensionResponse> {
  const runtime = getChromeRuntime();

  if (!runtime) {
    return { success: false, error: "Chrome runtime not available" };
  }

  if (!EXTENSION_ID) {
    return { success: false, error: "Extension ID not configured" };
  }

  return new Promise((resolve) => {
    runtime.sendMessage(
      EXTENSION_ID,
      { action, users },
      (response: ExtensionResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message ?? "Unknown error" });
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function getExtensionStatus(): Promise<ExtensionResponse> {
  const runtime = getChromeRuntime();

  if (!runtime || !EXTENSION_ID) {
    return { success: false, error: "Extension not available" };
  }

  return new Promise((resolve) => {
    runtime.sendMessage(
      EXTENSION_ID,
      { action: "getStatus" },
      (response: ExtensionResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message ?? "Unknown error" });
        } else {
          resolve(response);
        }
      }
    );
  });
}

export async function cancelAllActions(): Promise<ExtensionResponse> {
  const runtime = getChromeRuntime();

  if (!runtime || !EXTENSION_ID) {
    return { success: false, error: "Extension not available" };
  }

  return new Promise((resolve) => {
    runtime.sendMessage(
      EXTENSION_ID,
      { action: "cancelAll" },
      (response: ExtensionResponse) => {
        resolve(response);
      }
    );
  });
}
