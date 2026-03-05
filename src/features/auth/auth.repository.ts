import { redis } from "@/infra/redis/redis.client.ts";
import type { StoredUser } from "./auth.types.ts";

const VERIFICATION_TTL = 86_400; // 24 hours
const SESSION_TTL = 604_800; // 7 days

function userKey(email: string): string {
  return `user:${email}`;
}

function verifyKey(token: string): string {
  return `verify:${token}`;
}

function sessionKey(token: string): string {
  return `session:${token}`;
}

export const AuthRepository = {
  async createUser(email: string, passwordHash: string): Promise<void> {
    const user: StoredUser = {
      passwordHash,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    await redis.set(userKey(email), JSON.stringify(user));
  },

  async getUser(email: string): Promise<StoredUser | null> {
    const raw = await redis.get(userKey(email));
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  },

  async markVerified(email: string): Promise<void> {
    const user = await this.getUser(email);
    if (!user) return;
    user.verified = true;
    await redis.set(userKey(email), JSON.stringify(user));
  },

  async storeVerificationToken(token: string, email: string): Promise<void> {
    await redis.set(verifyKey(token), email, "EX", VERIFICATION_TTL);
  },

  async getVerificationToken(token: string): Promise<string | null> {
    return redis.get(verifyKey(token));
  },

  async deleteVerificationToken(token: string): Promise<void> {
    await redis.del(verifyKey(token));
  },

  async storeSession(token: string, email: string): Promise<void> {
    await redis.set(sessionKey(token), email, "EX", SESSION_TTL);
  },

  async getSession(token: string): Promise<string | null> {
    return redis.get(sessionKey(token));
  },

  async deleteSession(token: string): Promise<void> {
    await redis.del(sessionKey(token));
  },
};
