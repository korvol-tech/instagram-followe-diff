import type { QueueItem, SuccessResponse } from "@shared/types";

interface StatusResponse extends SuccessResponse {
  queueLength: number;
  isProcessing: boolean;
  queue?: QueueItem[];
}

// Popup script
document.addEventListener("DOMContentLoaded", () => {
  void updateStatus();

  // Update status every 2 seconds
  setInterval(() => {
    void updateStatus();
  }, 2000);

  // Cancel button
  const cancelBtn = document.getElementById("cancel-btn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      void (async (): Promise<void> => {
        await chrome.runtime.sendMessage({ action: "cancelAll" });
        await updateStatus();
      })();
    });
  }

  // Clear history button
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      void (async (): Promise<void> => {
        await chrome.runtime.sendMessage({ action: "cancelAll" });
        await updateStatus();
      })();
    });
  }
});

async function updateStatus(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({
      action: "getStatus",
    })) as StatusResponse | undefined;

    if (!response) return;

    const statusEl = document.getElementById("status");
    const queueContainer = document.getElementById("queue-container");
    const queueList = document.getElementById("queue-list");
    const cancelBtn = document.getElementById("cancel-btn");

    if (!statusEl || !queueContainer || !queueList) return;

    // Count pending items (not completed/failed)
    const pendingCount = response.queue?.filter(
      (item) => item.status === "pending" || item.status === "processing"
    ).length ?? 0;

    // Check if all items are done
    const allDone = response.queue?.every(
      (item) => item.status === "completed" || item.status === "failed"
    ) ?? true;

    if (response.isProcessing) {
      statusEl.className = "status active";
      statusEl.textContent = `Processing... (${pendingCount} remaining)`;
    } else if (pendingCount > 0) {
      statusEl.className = "status active";
      statusEl.textContent = `${pendingCount} items in queue`;
    } else if (response.queue && response.queue.length > 0 && allDone) {
      const completed = response.queue.filter((item) => item.status === "completed").length;
      const failed = response.queue.filter((item) => item.status === "failed").length;
      statusEl.className = "status idle";
      statusEl.textContent = failed > 0
        ? `Done! ${completed} completed, ${failed} failed`
        : `All ${completed} actions completed!`;
    } else {
      statusEl.className = "status idle";
      statusEl.textContent = "Idle - No actions in queue";
    }

    // Show queue if there are items
    if (response.queue && response.queue.length > 0) {
      queueContainer.style.display = "block";
      queueList.innerHTML = response.queue
        .slice(0, 10) // Show first 10
        .map(
          (item: QueueItem) => `
          <div class="queue-item">
            <span>@${item.username}</span>
            <span class="badge ${item.status}">${item.status}</span>
          </div>
        `
        )
        .join("");

      if (response.queue.length > 10) {
        queueList.innerHTML += `<div style="text-align: center; color: #999; padding: 8px;">... and ${response.queue.length - 10} more</div>`;
      }

      // Show Cancel button only if there are pending items
      // Show Clear button only if all items are done
      if (cancelBtn) {
        cancelBtn.style.display = pendingCount > 0 ? "block" : "none";
      }
      const clearBtn = document.getElementById("clear-btn");
      if (clearBtn) {
        clearBtn.style.display = allDone && response.queue.length > 0 ? "block" : "none";
      }
    } else {
      queueContainer.style.display = "none";
    }
  } catch (error) {
    console.error("Error getting status:", error);
  }
}
