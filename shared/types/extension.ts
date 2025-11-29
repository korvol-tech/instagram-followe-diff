export type ActionType = "follow" | "unfollow";
export type QueueItemStatus = "pending" | "processing" | "completed" | "failed";

/**
 * User data contract between web app and extension.
 * The web app must provide both username and profileUrl.
 */
export interface User {
  username: string;
  profileUrl: string;
}

export interface QueueItem {
  username: string;
  profileUrl: string;
  action: ActionType;
  status: QueueItemStatus;
  attempts: number;
  error?: string;
  createdAt: number; // Unix timestamp when item was added
  nextProcessAt?: number; // Unix timestamp when item should be processed next
}

// Messages from web app to extension
export interface PingRequest {
  action: "ping";
}

export interface FollowRequest {
  action: "follow" | "unfollow";
  users: User[];
}

export interface GetStatusRequest {
  action: "getStatus";
}

export interface CancelAllRequest {
  action: "cancelAll";
}

export type ExternalRequest =
  | PingRequest
  | FollowRequest
  | GetStatusRequest
  | CancelAllRequest;

// Messages from background to content script
export interface PerformActionMessage {
  type: "performAction";
  action: ActionType;
  username: string;
  profileUrl: string;
}

// Messages from content script to background
export interface ActionCompleteMessage {
  type: "actionComplete";
  success: boolean;
  action: ActionType;
  username: string;
  profileUrl: string;
  error?: string;
}

// Progress broadcast to web app
export interface QueueProgressMessage {
  type: "queueProgress";
  queue: {
    username: string;
    profileUrl: string;
    action: ActionType;
    status: QueueItemStatus;
    error?: string;
  }[];
  isProcessing: boolean;
}

// Responses
export interface SuccessResponse {
  success: true;
  message?: string;
  queueLength?: number;
  isProcessing?: boolean;
  queue?: QueueItem[];
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ExtensionResponse = SuccessResponse | ErrorResponse;
