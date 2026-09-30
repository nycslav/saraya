import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.union([
    z.string().url(),
    z.string().regex(/^\/uploads\/check-ins\/[A-Za-z0-9-]+\.(?:jpg|png|webp)$/),
  ]).nullable().default(null),
  homeRegion: z.string().min(1).nullable().default(null),
  travelStyle: z.string().min(1).nullable().default(null),
  budget: z.string().min(1).nullable().default(null),
  interests: z.array(z.string().min(1)).default([]),
  preferredRegions: z.array(z.string().min(1)).default([]),
  onboardingComplete: z.boolean(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  avatarUrl: userProfileSchema.shape.avatarUrl.optional(),
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

export const accountReauthenticationRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const accountReauthenticationResponseSchema = z.object({
  accountActionToken: z.string().min(1),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const deleteAccountRequestSchema = z.object({
  accountActionToken: z.string().min(1),
  confirmation: z.literal('DELETE'),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type GoogleLoginRequest = z.infer<typeof googleLoginRequestSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenRequestSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AccountReauthenticationRequest = z.infer<typeof accountReauthenticationRequestSchema>;
export type AccountReauthenticationResponse = z.infer<typeof accountReauthenticationResponseSchema>;
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
