import { NtfyError } from "@/errors/errors";

const NTFY_URL = "https://ntfy.sh";

export async function sendNtfyNotification(
  topic: string,
  title: string,
  message: string,
): Promise<void> {
  const res = await fetch(`${NTFY_URL}/${topic}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain", "X-Title": title },
    body: message,
  });
  if (!res.ok) {
    throw new NtfyError(`ntfy.sh returned ${res.status}: ${await res.text()}`, undefined);
  }
}
