# Vercel NOT_FOUND Error - Solution Guide

## Problem Analysis

Your project is a **monorepo** with Next.js in the `web/` subdirectory, but your `vercel.json` was configured for root-level deployment, causing a mismatch.

## Root Cause

The `NOT_FOUND` error occurs because:
1. `framework: "nextjs"` tells Vercel to use Next.js-specific deployment logic
2. Vercel's Next.js detection expects the app at the project root OR proper root directory configuration
3. Your build commands point to `web/`, but the framework detection doesn't know where to find the actual Next.js app
4. Vercel can't locate the built files or the Next.js configuration correctly

## Solution: Set Root Directory (RECOMMENDED)

**Best practice for Next.js monorepos:**

1. **In Vercel Dashboard:**
   - Go to your project settings
   - Navigate to **Settings → General → Root Directory**
   - Set Root Directory to: `web`
   - Save changes

2. **Keep minimal `vercel.json` at root** (already done - current file is fine)
   - Or move `vercel.json` to `web/vercel.json` if you need project-specific config

3. **Result:** Vercel will:
   - Treat `web/` as the project root
   - Auto-detect Next.js
   - Run `npm install` and `npm run build` in the `web/` directory
   - Find `.next/` output automatically

## Alternative: Configure in vercel.json (Not Recommended for Next.js)

If you prefer to keep all config in vercel.json at root, you can use this, but it's less optimal:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd web && npm install && npm run build",
  "outputDirectory": "web/.next"
}
```

**Remove the `framework` field** - it conflicts with manual configuration in monorepos.

## Why This Approach Works

- Next.js has special deployment optimizations in Vercel
- Root Directory setting lets Vercel's auto-detection work properly
- No manual build command/output path guessing needed
- Vercel handles Next.js routing, ISR, and edge functions automatically
