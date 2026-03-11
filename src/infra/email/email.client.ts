import nodemailer from "nodemailer";
import { env } from "@/configs/env.ts";
import logger from "@/infra/logger/logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendResyncEmail(to: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject: "Facebook Session Needs Manual Refresh",
    text: [
      "Your Facebook session could not be automatically refreshed.",
      "All scheduled searches have been paused.",
      "",
      "Please open the app and click Resync to restore your session.",
    ].join("\n"),
  });
  logger.info(`[email] Resync notification sent to ${to}`);
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const verifyUrl = `${env.BASE_URL}/api/v1/auth/verify?token=${token}`;
  await transporter.sendMail({
    from: env.SMTP_USER,
    to,
    subject: "Verify your email",
    text: `Click the link below to verify your email:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
  logger.info(`[email] Verification email sent to ${to}`);
}
