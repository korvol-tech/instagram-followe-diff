import { describe, it, expect } from "vitest";
import {
  parseFollowers,
  parseFollowing,
  computeDiff,
  processInstagramData,
} from "../instagram-diff";
import type { FollowerEntry, FollowingData, User } from "../types";

describe("parseFollowers", () => {
  it("parses valid followers data", () => {
    const input: FollowerEntry[] = [
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/user1",
            value: "user1",
            timestamp: 1700000000,
          },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/user2",
            value: "user2",
            timestamp: 1700000001,
          },
        ],
      },
    ];

    const result = parseFollowers(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      username: "user1",
      profileUrl: "https://www.instagram.com/user1",
      timestamp: 1700000000,
    });
    expect(result[1]).toEqual({
      username: "user2",
      profileUrl: "https://www.instagram.com/user2",
      timestamp: 1700000001,
    });
  });

  it("handles empty array", () => {
    const result = parseFollowers([]);
    expect(result).toEqual([]);
  });

  it("filters out entries with empty string_list_data", () => {
    const input: FollowerEntry[] = [
      {
        title: "",
        media_list_data: [],
        string_list_data: [],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/validuser",
            value: "validuser",
            timestamp: 1700000000,
          },
        ],
      },
    ];

    const result = parseFollowers(input);

    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("validuser");
  });
});

describe("parseFollowing", () => {
  it("parses valid following data", () => {
    const input: FollowingData = {
      relationships_following: [
        {
          title: "user1",
          string_list_data: [
            {
              href: "https://www.instagram.com/_u/user1",
              timestamp: 1700000000,
            },
          ],
        },
        {
          title: "user2",
          string_list_data: [
            {
              href: "https://www.instagram.com/_u/user2",
              timestamp: 1700000001,
            },
          ],
        },
      ],
    };

    const result = parseFollowing(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      username: "user1",
      profileUrl: "https://www.instagram.com/_u/user1",
      timestamp: 1700000000,
    });
  });

  it("handles missing relationships_following", () => {
    const input = {} as FollowingData;
    const result = parseFollowing(input);
    expect(result).toEqual([]);
  });

  it("handles empty relationships_following array", () => {
    const input: FollowingData = { relationships_following: [] };
    const result = parseFollowing(input);
    expect(result).toEqual([]);
  });
});

describe("computeDiff", () => {
  const createUser = (username: string): User => ({
    username,
    profileUrl: `https://www.instagram.com/${username}`,
    timestamp: 1700000000,
  });

  it("identifies mutual followers", () => {
    const followers = [createUser("alice"), createUser("bob")];
    const following = [createUser("alice"), createUser("charlie")];

    const result = computeDiff(followers, following);

    expect(result.mutualFollowers).toHaveLength(1);
    expect(result.mutualFollowers[0].username).toBe("alice");
  });

  it("identifies people not following back", () => {
    const followers = [createUser("alice")];
    const following = [createUser("alice"), createUser("charlie")];

    const result = computeDiff(followers, following);

    expect(result.notFollowingBack).toHaveLength(1);
    expect(result.notFollowingBack[0].username).toBe("charlie");
  });

  it("identifies people you don't follow back", () => {
    const followers = [createUser("alice"), createUser("bob")];
    const following = [createUser("alice")];

    const result = computeDiff(followers, following);

    expect(result.youDontFollowBack).toHaveLength(1);
    expect(result.youDontFollowBack[0].username).toBe("bob");
  });

  it("handles case-insensitive username matching", () => {
    const followers = [createUser("Alice")];
    const following = [createUser("alice")];

    const result = computeDiff(followers, following);

    expect(result.mutualFollowers).toHaveLength(1);
    expect(result.notFollowingBack).toHaveLength(0);
    expect(result.youDontFollowBack).toHaveLength(0);
  });

  it("handles empty lists", () => {
    const result = computeDiff([], []);

    expect(result.mutualFollowers).toEqual([]);
    expect(result.notFollowingBack).toEqual([]);
    expect(result.youDontFollowBack).toEqual([]);
    expect(result.followers).toEqual([]);
    expect(result.following).toEqual([]);
  });

  it("includes original followers and following lists in result", () => {
    const followers = [createUser("alice")];
    const following = [createUser("bob")];

    const result = computeDiff(followers, following);

    expect(result.followers).toEqual(followers);
    expect(result.following).toEqual(following);
  });
});

describe("processInstagramData", () => {
  it("processes full Instagram data export", () => {
    const followersJson: FollowerEntry[] = [
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/mutual_friend",
            value: "mutual_friend",
            timestamp: 1700000000,
          },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/fan",
            value: "fan",
            timestamp: 1700000001,
          },
        ],
      },
    ];

    const followingJson: FollowingData = {
      relationships_following: [
        {
          title: "mutual_friend",
          string_list_data: [
            {
              href: "https://www.instagram.com/_u/mutual_friend",
              timestamp: 1700000000,
            },
          ],
        },
        {
          title: "celebrity",
          string_list_data: [
            {
              href: "https://www.instagram.com/_u/celebrity",
              timestamp: 1700000002,
            },
          ],
        },
      ],
    };

    const result = processInstagramData(followersJson, followingJson);

    expect(result.followers).toHaveLength(2);
    expect(result.following).toHaveLength(2);
    expect(result.mutualFollowers).toHaveLength(1);
    expect(result.mutualFollowers[0].username).toBe("mutual_friend");
    expect(result.notFollowingBack).toHaveLength(1);
    expect(result.notFollowingBack[0].username).toBe("celebrity");
    expect(result.youDontFollowBack).toHaveLength(1);
    expect(result.youDontFollowBack[0].username).toBe("fan");
  });
});
