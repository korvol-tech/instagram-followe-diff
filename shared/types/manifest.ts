export interface Manifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions: string[];
  externally_connectable: {
    matches: string[];
  };
  background: {
    service_worker: string;
    type: "module";
  };
  content_scripts: {
    matches: string[];
    js: string[];
    run_at: "document_idle" | "document_start" | "document_end";
  }[];
  action: {
    default_popup: string;
    default_icon?: {
      [key: string]: string;
    };
  };
  icons?: {
    [key: string]: string;
  };
}
