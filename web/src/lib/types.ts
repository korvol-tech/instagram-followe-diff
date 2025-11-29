/**
 * Instagram data export types
 */

// Followers JSON structure (array format)
export interface FollowerEntry {
  title: string;
  media_list_data: unknown[];
  string_list_data: {
    href: string;
    value: string;
    timestamp: number;
  }[];
}

// Following JSON structure (object with relationships_following array)
export interface FollowingData {
  relationships_following: FollowingEntry[];
}

export interface FollowingEntry {
  title: string;
  string_list_data: {
    href: string;
    timestamp: number;
  }[];
}

// Normalized user representation
export interface User {
  username: string;
  profileUrl: string;
  timestamp: number;
}

// Diff result categories
export interface DiffResult {
  mutualFollowers: User[]; // People who follow you AND you follow them
  notFollowingBack: User[]; // People you follow but don't follow you back
  youDontFollowBack: User[]; // People who follow you but you don't follow back
  followers: User[]; // All your followers
  following: User[]; // Everyone you follow
}
