"use client";

import { useState, useCallback, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ResultsTable } from "@/components/ResultsTable";
import { processInstagramData } from "@/lib/instagram-diff";
import type { DiffResult, FollowerEntry, FollowingData } from "@/lib/types";

const STORAGE_KEYS = {
  followers: "ig-diff-followers",
  following: "ig-diff-following",
} as const;

interface StoredFile {
  name: string;
  content: string;
}

function HowToGetFiles() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        How do I get these files from Instagram?
      </button>

      {isOpen && (
        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-700/50 rounded-lg text-sm text-zinc-700 dark:text-zinc-300">
          <ol className="list-decimal list-inside space-y-3">
            <li>
              <strong>Navigate to Export your information:</strong>
              <ul className="ml-6 mt-1 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Open Instagram app or website</li>
                <li>Go to <strong>Settings → Accounts Center → Your information and permissions</strong></li>
                <li>Select <strong>Export your information</strong></li>
              </ul>
            </li>
            <li>
              <strong>Select your account and destination:</strong>
              <ul className="ml-6 mt-1 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>If you have multiple accounts linked (Facebook, Instagram), select your Instagram account</li>
                <li>Choose <strong>Export to device</strong></li>
              </ul>
            </li>
            <li>
              <strong>Customize your export:</strong>
              <ul className="ml-6 mt-1 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Click <strong>Customize information</strong></li>
                <li>Select only <strong>Followers and following</strong></li>
                <li>Set format to <strong>JSON</strong> (important!)</li>
                <li>Set date range to <strong>All time</strong></li>
                <li>Click <strong>Start export</strong></li>
              </ul>
            </li>
            <li>
              <strong>Wait for the report:</strong>
              <ul className="ml-6 mt-1 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Instagram will generate your report (this can take a few minutes to hours)</li>
                <li>You&apos;ll receive an email when it&apos;s ready, or check back in the Export section</li>
                <li>Download the ZIP file</li>
              </ul>
            </li>
            <li>
              <strong>Extract and upload:</strong>
              <ul className="ml-6 mt-1 list-disc list-inside text-zinc-600 dark:text-zinc-400 space-y-1">
                <li>Unzip the downloaded file</li>
                <li>Find <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-600 rounded">followers_and_following/followers_1.json</code></li>
                <li>Find <code className="px-1 py-0.5 bg-zinc-200 dark:bg-zinc-600 rounded">followers_and_following/following.json</code></li>
                <li>Upload both files above</li>
              </ul>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Your data never leaves your browser. All processing happens locally on your device.
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [followersFile, setFollowersFile] = useState<StoredFile | null>(null);
  const [followingFile, setFollowingFile] = useState<StoredFile | null>(null);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored files on mount and auto-process if both exist
  useEffect(() => {
    const loadStoredFiles = async () => {
      try {
        const storedFollowers = localStorage.getItem(STORAGE_KEYS.followers);
        const storedFollowing = localStorage.getItem(STORAGE_KEYS.following);

        if (storedFollowers && storedFollowing) {
          // Both files exist - load and process them
          const followers = JSON.parse(storedFollowers) as StoredFile;
          const following = JSON.parse(storedFollowing) as StoredFile;

          const followersData: FollowerEntry[] = JSON.parse(followers.content);
          const followingData: FollowingData = JSON.parse(following.content);

          const diffResult = processInstagramData(followersData, followingData);

          setFollowersFile(followers);
          setFollowingFile(following);
          setResult(diffResult);
        } else {
          // Only some or no files - just load what we have
          if (storedFollowers) {
            setFollowersFile(JSON.parse(storedFollowers) as StoredFile);
          }
          if (storedFollowing) {
            setFollowingFile(JSON.parse(storedFollowing) as StoredFile);
          }
        }
      } catch {
        // Ignore storage errors
      } finally {
        setIsLoading(false);
      }
    };

    void loadStoredFiles();
  }, []);

  const handleFileSelect = useCallback(
    async (file: File, type: "followers" | "following") => {
      try {
        const content = await file.text();
        const storedFile: StoredFile = { name: file.name, content };

        // Store in localStorage
        localStorage.setItem(
          type === "followers" ? STORAGE_KEYS.followers : STORAGE_KEYS.following,
          JSON.stringify(storedFile)
        );

        // Update state
        if (type === "followers") {
          setFollowersFile(storedFile);
        } else {
          setFollowingFile(storedFile);
        }
      } catch {
        setError("Failed to read file");
      }
    },
    []
  );

  const handleProcess = useCallback(async () => {
    if (!followersFile || !followingFile) {
      setError("Please select both files");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const followersData: FollowerEntry[] = JSON.parse(followersFile.content);
      const followingData: FollowingData = JSON.parse(followingFile.content);

      const diffResult = processInstagramData(followersData, followingData);
      setResult(diffResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to process files"
      );
    } finally {
      setIsProcessing(false);
    }
  }, [followersFile, followingFile]);

  const handleReset = useCallback(() => {
    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.followers);
    localStorage.removeItem(STORAGE_KEYS.following);

    setFollowersFile(null);
    setFollowingFile(null);
    setResult(null);
    setError(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-zinc-300 dark:border-zinc-600 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Instagram Follower Diff
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Compare your followers and following lists to see who doesn&apos;t
            follow you back
          </p>
        </header>

        {!result ? (
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6">
            <HowToGetFiles />

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <FileUpload
                label="Followers File (followers_1.json)"
                onFileSelect={(file) => handleFileSelect(file, "followers")}
                fileName={followersFile?.name}
              />
              <FileUpload
                label="Following File (following.json)"
                onFileSelect={(file) => handleFileSelect(file, "following")}
                fileName={followingFile?.name}
              />
            </div>

            {error && (
              <div
                className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm"
                data-testid="error-message"
              >
                {error}
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={!followersFile || !followingFile || isProcessing}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
              data-testid="process-button"
            >
              {isProcessing ? "Processing..." : "Compare Files"}
            </button>

            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Your data is processed locally and never uploaded to any server
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                data-testid="reset-button"
              >
                Upload New Files
              </button>
            </div>
            <ResultsTable result={result} />
          </div>
        )}
      </main>
    </div>
  );
}
