import type { Manifest } from "@shared/types";

export interface ManifestConfig {
  version: string;
  name?: string;
  description?: string;
}

export function createManifest(config: ManifestConfig): Manifest {
  return {
    manifest_version: 3,
    name: config.name ?? "Instagram Follower Manager",
    version: config.version,
    description:
      config.description ??
      "Bridge between Instagram Follower Diff app and Instagram for follow/unfollow actions",
    permissions: ["tabs", "scripting", "storage"],
    host_permissions: ["https://www.instagram.com/*"],
    externally_connectable: {
      matches: ["http://localhost:*/*", "http://127.0.0.1:*/*"],
    },
    background: {
      service_worker: "background.js",
      type: "module",
    },
    content_scripts: [
      {
        matches: ["https://www.instagram.com/*"],
        js: ["content.js"],
        run_at: "document_idle",
      },
    ],
    action: {
      default_popup: "popup.html",
    },
  };
}
