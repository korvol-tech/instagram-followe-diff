import { build, context } from "esbuild";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createManifest } from "../src/manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const srcDir = resolve(rootDir, "src");
const distDir = resolve(rootDir, "dist");

const isWatch = process.argv.includes("--watch");

// Generate version: MAJOR.MINOR.PATCH based on date and build number
function generateVersion(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const buildNum = Math.floor(
    (now.getHours() * 60 + now.getMinutes()) / 10
  ); // ~144 builds per day max

  // Format: YYYY.MMDD.BUILD (Chrome extension version format)
  return `${year}.${month}${day.toString().padStart(2, "0")}.${buildNum}`;
}

// Build configuration
interface BuildConfig {
  version: string;
  buildDate: string;
  isDev: boolean;
}

function getBuildConfig(): BuildConfig {
  const version = process.env.VERSION ?? generateVersion();
  return {
    version,
    buildDate: new Date().toISOString(),
    isDev: isWatch,
  };
}

// Ensure dist directory exists
mkdirSync(distDir, { recursive: true });

// Build manifest.json
function buildManifest(config: BuildConfig): void {
  const manifest = createManifest({
    version: config.version,
  });

  writeFileSync(
    resolve(distDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`✓ manifest.json (v${config.version})`);
}

// Process HTML templates with dynamic values
function processHtml(config: BuildConfig): void {
  const templatePath = resolve(rootDir, "popup.html");
  let html = readFileSync(templatePath, "utf-8");

  // Replace template variables
  const replacements: Record<string, string> = {
    "{{VERSION}}": config.version,
    "{{BUILD_DATE}}": config.buildDate,
    "{{DEV_MODE}}": config.isDev ? "true" : "false",
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(key, "g"), value);
  }

  writeFileSync(resolve(distDir, "popup.html"), html);
  console.log("✓ popup.html");
}

// esbuild configuration
const sharedDir = resolve(rootDir, "..", "shared");

const buildOptions = {
  entryPoints: [
    resolve(srcDir, "background.ts"),
    resolve(srcDir, "content.ts"),
    resolve(srcDir, "popup.ts"),
  ],
  bundle: true,
  outdir: distDir,
  format: "esm" as const,
  target: "chrome100",
  minify: !isWatch,
  sourcemap: isWatch,
  alias: {
    "@shared": sharedDir,
  },
};

async function runBuild(): Promise<void> {
  const config = getBuildConfig();

  console.log("Building extension...");
  console.log(`Version: ${config.version}`);
  console.log(`Mode: ${config.isDev ? "development" : "production"}\n`);

  try {
    // Build TypeScript files
    await build(buildOptions);
    console.log("✓ TypeScript files bundled");

    // Build manifest
    buildManifest(config);

    // Process HTML
    processHtml(config);

    console.log("\n✓ Build complete!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

async function runWatch(): Promise<void> {
  const config = getBuildConfig();

  console.log("Starting watch mode...");
  console.log(`Version: ${config.version}\n`);

  try {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("✓ Watching for changes...");

    // Initial build of manifest and HTML
    buildManifest(config);
    processHtml(config);
  } catch (error) {
    console.error("Watch failed:", error);
    process.exit(1);
  }
}

if (isWatch) {
  void runWatch();
} else {
  void runBuild();
}
