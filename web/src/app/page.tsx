"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { ResultsTable } from "@/components/ResultsTable";
import { processInstagramData } from "@/lib/instagram-diff";
import type { DiffResult, FollowerEntry, FollowingData } from "@/lib/types";

export default function Home() {
  const [followersFile, setFollowersFile] = useState<File | null>(null);
  const [followingFile, setFollowingFile] = useState<File | null>(null);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = useCallback(async () => {
    if (!followersFile || !followingFile) {
      setError("Please select both files");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const [followersText, followingText] = await Promise.all([
        followersFile.text(),
        followingFile.text(),
      ]);

      const followersData: FollowerEntry[] = JSON.parse(followersText);
      const followingData: FollowingData = JSON.parse(followingText);

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
    setFollowersFile(null);
    setFollowingFile(null);
    setResult(null);
    setError(null);
  }, []);

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
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <FileUpload
                label="Followers File (followers_1.json)"
                onFileSelect={setFollowersFile}
                fileName={followersFile?.name}
              />
              <FileUpload
                label="Following File (following.json)"
                onFileSelect={setFollowingFile}
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
