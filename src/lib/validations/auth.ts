import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be 24 characters or fewer.")
  .regex(
    /^[a-zA-Z][a-zA-Z0-9_]*$/,
    "Username must start with a letter and contain only letters, numbers, and underscores.",
  );

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name.").max(80),
    email: z.string().trim().email("Enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password is too long.")
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const resetRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72)
      .regex(/[A-Za-z]/, "Password must include a letter.")
      .regex(/[0-9]/, "Password must include a number."),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const PURPOSE_OPTIONS = [
  "personal",
  "professional",
  "business",
  "education",
  "creation",
  "communities",
] as const;

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: usernameSchema,
  bio: z.string().trim().max(280).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  professionalRole: z.string().trim().max(80).optional().default(""),
  headline: z.string().trim().max(120).optional().default(""),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  education: z.string().trim().max(200).optional().default(""),
  work: z.string().trim().max(200).optional().default(""),
  purposes: z.array(z.enum(PURPOSE_OPTIONS)).min(1, "Choose at least one purpose."),
  networkingGoals: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: usernameSchema,
  bio: z.string().trim().max(280).optional().default(""),
  location: z.string().trim().max(80).optional().default(""),
  headline: z.string().trim().max(120).optional().default(""),
  professionalRole: z.string().trim().max(80).optional().default(""),
  website: z
    .string()
    .trim()
    .url("Enter a valid URL.")
    .or(z.literal(""))
    .optional()
    .default(""),
  visibility: z.enum(["public", "connections", "private"]),
  contactPreference: z.enum(["anyone", "connections", "nobody"]),
});

export const postSchema = z.object({
  body: z.string().trim().max(4000).optional().default(""),
  type: z.enum([
    "text",
    "image",
    "gallery",
    "video",
    "link",
    "poll",
    "document",
    "professional_update",
    "project",
    "question",
    "job",
    "event",
  ]),
  audience: z.enum(["public", "followers", "connections", "private"]),
  linkUrl: z.string().trim().url().or(z.literal("")).optional(),
  topicTags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  pollOptions: z.array(z.string().trim().min(1).max(80)).min(2).max(6).optional(),
  communityId: z.string().uuid().optional().nullable(),
  organizationId: z.string().uuid().optional().nullable(),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment.").max(1000),
  parentId: z.string().uuid().optional().nullable(),
});

export const reportSchema = z.object({
  targetType: z.enum(["user", "post", "comment", "message", "job", "community", "event"]),
  targetId: z.string().uuid(),
  category: z.enum([
    "spam",
    "harassment",
    "hate",
    "misinformation",
    "scam",
    "inappropriate",
    "other",
  ]),
  details: z.string().trim().max(1000).optional().default(""),
});
