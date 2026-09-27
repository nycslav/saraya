import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable().default(null),
  homeRegion: z.string().min(1).nullable().default(null),
  travelStyle: z.string().min(1).nullable().default(null),
  budget: z.string().min(1).nullable().default(null),
  interests: z.array(z.string().min(1)).default([]),
  preferredRegions: z.array(z.string().min(1)).default([]),
  onboardingComplete: z.boolean(),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userProfileSchema,
});

export const loginRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerRequestSchema = loginRequestSchema.extend({
  displayName: z.string().trim().min(2, 'Enter your name.'),
});

export const googleLoginRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const updateProfileRequestSchema = z.object({
  displayName: z.string().trim().min(2).optional(),
  homeRegion: z.string().trim().min(1).nullable().optional(),
  travelStyle: z.string().trim().min(1).nullable().optional(),
  budget: z.string().trim().min(1).nullable().optional(),
  interests: z.array(z.string().min(1)).optional(),
  preferredRegions: z.array(z.string().min(1)).optional(),
  onboardingComplete: z.boolean().optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
