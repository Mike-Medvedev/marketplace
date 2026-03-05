import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { AuthRepository } from "./auth.repository.ts";
import { sendVerificationEmail } from "@/infra/email/email.client.ts";
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  VerificationTokenExpiredError,
} from "@/errors/errors.ts";

const SALT_ROUNDS = 10;

export const AuthService = {
  async signup(email: string, password: string): Promise<void> {
    const existing = await AuthRepository.getUser(email);
    if (existing) throw new UserAlreadyExistsError(email);

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await AuthRepository.createUser(email, passwordHash);

    const token = randomUUID();
    await AuthRepository.storeVerificationToken(token, email);
    await sendVerificationEmail(email, token);
  },

  async verifyEmail(token: string): Promise<{ sessionToken: string; email: string }> {
    const email = await AuthRepository.getVerificationToken(token);
    if (!email) throw new VerificationTokenExpiredError();

    await AuthRepository.markVerified(email);
    await AuthRepository.deleteVerificationToken(token);

    const sessionToken = randomUUID();
    await AuthRepository.storeSession(sessionToken, email);

    return { sessionToken, email };
  },

  async login(email: string, password: string): Promise<{ sessionToken: string; email: string }> {
    const user = await AuthRepository.getUser(email);
    if (!user) throw new InvalidCredentialsError();

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new InvalidCredentialsError();

    if (!user.verified) throw new EmailNotVerifiedError();

    const sessionToken = randomUUID();
    await AuthRepository.storeSession(sessionToken, email);

    return { sessionToken, email };
  },

  async logout(sessionToken: string): Promise<void> {
    await AuthRepository.deleteSession(sessionToken);
  },
};
