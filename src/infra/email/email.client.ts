import nodemailer from "nodemailer";
import { env } from "@/configs/env.ts";
import logger from "@/logger/logger.ts";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export async function sendResyncEmail(): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_USER,
    to: env.NOTIFICATION_EMAIL,
    subject: "Facebook Session Needs Manual Refresh",
    text: [
      "Your Facebook session could not be automatically refreshed.",
      "All scheduled searches have been paused.",
      "",
      "Please open the app and click Resync to restore your session.",
    ].join("\n"),
  });
  logger.info(`[email] Resync notification sent to ${env.NOTIFICATION_EMAIL}`);
}
