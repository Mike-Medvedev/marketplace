import { db } from "@/infra/db/db.ts";
import { users } from "@/infra/db/schema.ts";
import { eq } from "drizzle-orm";
import type { UserProfile, UserUpdate } from "./users.types.ts";

export async function getUserById(id: string): Promise<UserProfile | null> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function updateUser(id: string, data: UserUpdate): Promise<UserProfile | null> {
  const [updated] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return updated ?? null;
}
