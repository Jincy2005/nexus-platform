export type Purpose =
  | "personal"
  | "professional"
  | "business"
  | "education"
  | "creation"
  | "communities";

export type Profile = {
  id: string;
  username: string | null;
  full_name: string;
  bio: string | null;
  location: string | null;
  headline: string | null;
  professional_role: string | null;
  website: string | null;
  avatar_path: string | null;
  cover_path: string | null;
  visibility: "public" | "connections" | "private";
  contact_preference: "anyone" | "connections" | "nobody";
  is_onboarded: boolean;
  is_verified: boolean;
  is_admin: boolean;
  is_deactivated: boolean;
  purposes: Purpose[];
  networking_goals: string[];
  interests: string[];
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  body: string | null;
  type: string;
  audience: "public" | "followers" | "connections" | "private";
  link_url: string | null;
  topic_tags: string[];
  poll_options: string[] | null;
  community_id: string | null;
  organization_id: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PostMedia = {
  id: string;
  post_id: string;
  storage_path: string;
  mime_type: string;
  alt_text: string | null;
  sort_order: number;
};

export type FeedPost = Post & {
  author: Pick<
    Profile,
    "id" | "username" | "full_name" | "avatar_path" | "headline" | "is_verified"
  >;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  bookmarked_by_me: boolean;
  media: PostMedia[];
};
