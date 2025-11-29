import type {
  FollowerEntry,
  FollowingData,
  FollowingEntry,
  User,
  DiffResult,
} from "./types";

/**
 * Parse followers JSON data (array format)
 */
export function parseFollowers(data: FollowerEntry[]): User[] {
  return data
    .filter((entry) => entry.string_list_data && entry.string_list_data.length > 0)
    .map((entry) => {
      const stringData = entry.string_list_data[0];
      return {
        username: stringData.value,
        profileUrl: stringData.href,
        timestamp: stringData.timestamp,
      };
    });
}

/**
 * Parse following JSON data (object with relationships_following array)
 */
export function parseFollowing(data: FollowingData): User[] {
  if (!data.relationships_following) {
    return [];
  }

  return data.relationships_following
    .filter((entry: FollowingEntry) => entry.string_list_data && entry.string_list_data.length > 0)
    .map((entry: FollowingEntry) => {
      const stringData = entry.string_list_data[0];
      // Following uses 'title' for username, followers use 'value'
      return {
        username: entry.title,
        profileUrl: stringData.href,
        timestamp: stringData.timestamp,
      };
    });
}

/**
 * Compute diff between followers and following lists
 */
export function computeDiff(followers: User[], following: User[]): DiffResult {
  const followerUsernames = new Set(followers.map((u) => u.username.toLowerCase()));
  const followingUsernames = new Set(following.map((u) => u.username.toLowerCase()));

  // Create maps for quick lookup
  const followerMap = new Map(followers.map((u) => [u.username.toLowerCase(), u]));
  const followingMap = new Map(following.map((u) => [u.username.toLowerCase(), u]));

  // Mutual followers: intersection of both sets
  const mutualFollowers: User[] = [];
  for (const username of followerUsernames) {
    if (followingUsernames.has(username)) {
      const user = followerMap.get(username);
      if (user) mutualFollowers.push(user);
    }
  }

  // Not following back: people you follow but who don't follow you
  const notFollowingBack: User[] = [];
  for (const username of followingUsernames) {
    if (!followerUsernames.has(username)) {
      const user = followingMap.get(username);
      if (user) notFollowingBack.push(user);
    }
  }

  // You don't follow back: people who follow you but you don't follow
  const youDontFollowBack: User[] = [];
  for (const username of followerUsernames) {
    if (!followingUsernames.has(username)) {
      const user = followerMap.get(username);
      if (user) youDontFollowBack.push(user);
    }
  }

  return {
    mutualFollowers,
    notFollowingBack,
    youDontFollowBack,
    followers,
    following,
  };
}

/**
 * Main function to process Instagram data files and compute diff
 */
export function processInstagramData(
  followersJson: FollowerEntry[],
  followingJson: FollowingData
): DiffResult {
  const followers = parseFollowers(followersJson);
  const following = parseFollowing(followingJson);
  return computeDiff(followers, following);
}
