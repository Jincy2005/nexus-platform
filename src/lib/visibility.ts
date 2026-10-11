export type Audience = "public" | "followers" | "connections" | "private";
export type ProfileVisibility = "public" | "connections" | "private";

export function canViewProfile(input: {
  ownerId: string;
  viewerId: string | null;
  visibility: ProfileVisibility;
  isConnected: boolean;
  isBlocked: boolean;
}) {
  if (input.isBlocked) return false;
  if (input.viewerId === input.ownerId) return true;
  if (input.visibility === "private") return false;
  if (input.visibility === "connections") return input.isConnected;
  return true;
}

export function canViewPost(input: {
  authorId: string;
  viewerId: string | null;
  audience: Audience;
  isFollowing: boolean;
  isConnected: boolean;
  isBlocked: boolean;
}) {
  if (input.isBlocked) return false;
  if (input.viewerId === input.authorId) return true;
  if (input.audience === "private") return false;
  if (input.audience === "connections") return input.isConnected;
  if (input.audience === "followers") return input.isFollowing;
  return true;
}

export function feedScore(input: {
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  isFollowing: boolean;
  isConnection: boolean;
}) {
  const hoursAgo = Math.max(0, (Date.now() - input.createdAt.getTime()) / 3_600_000);
  const recency = Math.max(0, 48 - hoursAgo);
  const engagement = input.likeCount * 0.4 + input.commentCount * 1.1;
  const relationship = (input.isFollowing ? 8 : 0) + (input.isConnection ? 5 : 0);
  return recency + engagement + relationship;
}
