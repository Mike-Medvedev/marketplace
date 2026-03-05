import { z } from "zod";

export const signupBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const verifyQuerySchema = z.object({
  token: z.string().min(1),
});

export const authTokenResponseSchema = z.object({
  sessionToken: z.string(),
  email: z.string(),
});

export const meResponseSchema = z.object({
  email: z.string(),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export interface StoredUser {
  passwordHash: string;
  verified: boolean;
  createdAt: string;
}

export type SignupBody = z.infer<typeof signupBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
