"use client";

import { useState, useEffect, useCallback } from "react";
import type { User, DiffResult } from "@/lib/types";
import type { ActionType, QueueItem } from "@shared/types";
import { pingExtension, sendToExtension, getExtensionStatus } from "@/lib/extension";

type TabKey = "notFollowingBack" | "youDontFollowBack" | "mutualFollowers";

interface Tab {
  key: TabKey;
  label: string;
  description: string;
  action: ActionType;
  actionLabel: string;
}

const TABS: Tab[] = [
  {
    key: "notFollowingBack",
    label: "Not Following Back",
    description: "People you follow who don't follow you back",
    action: "unfollow",
    actionLabel: "Unfollow Selected",
  },
  {
    key: "youDontFollowBack",
    label: "You Don't Follow Back",
    description: "People who follow you but you don't follow back",
    action: "follow",
    actionLabel: "Follow Selected",
  },
  {
    key: "mutualFollowers",
    label: "Mutual",
    description: "People who follow you and you follow back",
    action: "unfollow",
    actionLabel: "Unfollow Selected",
  },
];

interface ResultsTableProps {
  result: DiffResult;
}

export function ResultsTable({ result }: ResultsTableProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("notFollowingBack");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [extensionConnected, setExtensionConnected] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<{ length: number; processing: boolean; queue?: QueueItem[] } | null>(null);

  const getUsers = useCallback((tab: TabKey): User[] => {
    return result[tab] || [];
  }, [result]);

  const filteredUsers = getUsers(activeTab).filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentTab = TABS.find((t) => t.key === activeTab)!;

  // Check extension connection on mount
  useEffect(() => {
    const checkExtension = async () => {
      const connected = await pingExtension();
      setExtensionConnected(connected);
    };
    checkExtension();
  }, []);

  // Poll for queue status when extension is connected
  useEffect(() => {
    if (!extensionConnected) return;

    const pollStatus = async () => {
      const response = await getExtensionStatus();
      if (response.success && "queueLength" in response) {
        const newInfo = {
          length: response.queueLength ?? 0,
          processing: response.isProcessing ?? false,
          queue: response.queue,
        };
        setQueueInfo(newInfo);

        // Update status message based on queue state
        if (newInfo.processing) {
          const current = newInfo.queue?.find((q) => q.status === "processing");
          setStatusMessage(
            current
              ? `Processing @${current.username}... (${newInfo.length} in queue)`
              : `Processing... (${newInfo.length} in queue)`
          );
        } else if (newInfo.length === 0 && statusMessage?.includes("Queued")) {
          setStatusMessage("All actions completed!");
        }
      }
    };

    // Poll immediately and then every 2 seconds
    pollStatus();
    const interval = setInterval(pollStatus, 2000);

    return () => clearInterval(interval);
  }, [extensionConnected, statusMessage]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSelectedUsers(new Set());
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.username)));
    }
  };

  const handleSelectUser = (username: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(username)) {
      newSelected.delete(username);
    } else {
      newSelected.add(username);
    }
    setSelectedUsers(newSelected);
  };

  const handleAction = async () => {
    if (selectedUsers.size === 0) return;

    const usersToProcess = filteredUsers.filter((u) =>
      selectedUsers.has(u.username)
    );

    setIsProcessing(true);
    setStatusMessage(null);

    const response = await sendToExtension(currentTab.action, usersToProcess);

    setIsProcessing(false);

    if (response.success) {
      setStatusMessage(
        `Queued ${usersToProcess.length} users for ${currentTab.action}. Check the extension popup for progress.`
      );
      setSelectedUsers(new Set());
    } else {
      setStatusMessage(`Error: ${response.error}`);
    }
  };

  const handleSingleAction = async (user: User) => {
    setProcessingUsers((prev) => new Set(prev).add(user.username));
    setStatusMessage(null);

    const response = await sendToExtension(currentTab.action, [user]);

    setProcessingUsers((prev) => {
      const next = new Set(prev);
      next.delete(user.username);
      return next;
    });

    if (response.success) {
      setStatusMessage(
        `Queued ${user.username} for ${currentTab.action}. Check the extension popup for progress.`
      );
    } else {
      setStatusMessage(`Error: ${response.error}`);
    }
  };

  return (
    <div className="w-full">
      {/* Extension Status */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            extensionConnected === null
              ? "bg-zinc-400"
              : extensionConnected
                ? "bg-green-500"
                : "bg-red-500"
          }`}
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {extensionConnected === null
            ? "Checking extension..."
            : extensionConnected
              ? "Extension connected"
              : "Extension not found - install it to enable follow/unfollow"}
        </span>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {result.followers.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Followers
          </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {result.following.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Following
          </div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {result.mutualFollowers.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">Mutual</div>
        </div>
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {result.notFollowingBack.length}
          </div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Not Following Back
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label} ({getUsers(tab.key).length})
          </button>
        ))}
      </div>

      {/* Search and Action Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 py-4 -mx-4 px-4 flex flex-col sm:flex-row gap-4 mb-4 border-b border-zinc-200 dark:border-zinc-700">
        <input
          type="text"
          placeholder="Search username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500"
          data-testid="search-input"
        />
        <button
          onClick={handleAction}
          disabled={selectedUsers.size === 0 || !extensionConnected || isProcessing}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            currentTab.action === "unfollow"
              ? "bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              : "bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          } text-white disabled:cursor-not-allowed`}
          data-testid="action-button"
        >
          {isProcessing
            ? "Processing..."
            : `${currentTab.actionLabel} (${selectedUsers.size})`}
        </button>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            statusMessage.startsWith("Error")
              ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Description */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        {currentTab.description}
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="w-full" data-testid="results-table">
          <thead className="bg-zinc-50 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    filteredUsers.length > 0 &&
                    selectedUsers.size === filteredUsers.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600"
                  data-testid="select-all-checkbox"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                #
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Username
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Profile
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                >
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr
                  key={user.username}
                  className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    selectedUsers.has(user.username)
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.username)}
                      onChange={() => handleSelectUser(user.username)}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600"
                      data-testid={`checkbox-${user.username}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {user.username}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={user.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                      data-testid={`profile-link-${user.username}`}
                    >
                      View Profile
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleSingleAction(user)}
                      disabled={!extensionConnected || processingUsers.has(user.username)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                        currentTab.action === "unfollow"
                          ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      data-testid={`action-${user.username}`}
                    >
                      {processingUsers.has(user.username)
                        ? "..."
                        : currentTab.action === "unfollow"
                          ? "Unfollow"
                          : "Follow"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Results count */}
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {filteredUsers.length} of {getUsers(activeTab).length} users
        {selectedUsers.size > 0 && ` • ${selectedUsers.size} selected`}
      </p>
    </div>
  );
}
