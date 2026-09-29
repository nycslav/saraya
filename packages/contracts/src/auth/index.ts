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

export const googleLoginRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
