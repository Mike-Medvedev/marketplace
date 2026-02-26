import { env } from "@/env.ts";
import { setSession } from "@/session-store.ts";
import { NtfyError } from "@/errors/errors";
import { sendNtfyNotification } from "@/ntfy";
import logger from "@/logger/logger";
import type { Request, Response } from "express";

export async function handleAnalyzedListings(req: Request, res: Response): Promise<void> {
  logger.info("Recieved analyzed listings in webhook, notifying user");
  logger.info(req.body);
  res.sendStatus(200);
}

export async function handleContainerStarted(req: Request, res: Response): Promise<void> {
  const { ip, novnc_url } = req.body;
  const message = [
    "Facebook session refresh needed.",
    "",
    `Open in browser: ${novnc_url}`,
    "Password: check your VNC_PASSWORD secret",
    `IP: ${ip}`,
  ].join("\n");

  try {
    await sendNtfyNotification(env.NTFY_TOPIC, "Facebook Login Required", message, novnc_url);
  } catch (err) {
    throw new NtfyError("Failed to send container-started notification", err);
  }

  logger.info(`[container-started] Notification sent for container at ${ip}`);
  res.json({ success: true });
}

export async function handleRefresh(req: Request, res: Response): Promise<void> {
  const { headers, body, capturedAt } = req.body;

  if (!headers || !body) {
    logger.warn("[refresh] Received invalid session data");
    res.status(400).json({ error: "Missing headers or body" });
    return;
  }

  await setSession({ headers, body, capturedAt });
  logger.info(`[refresh] Session updated at ${capturedAt}`);
  res.json({ success: true });
}
