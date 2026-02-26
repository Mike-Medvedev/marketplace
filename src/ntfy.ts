import { NtfyError } from "@/errors/errors";

const NTFY_URL = "https://ntfy.sh";

export interface NtfyOptions {
  /** Enable Markdown formatting (links, bold, etc.). Works in web app; may show raw markdown elsewhere. */
  markdown?: boolean;
}

export async function sendNtfyNotification(
  topic: string,
  title: string,
  message: string,
  options: NtfyOptions = {},
): Promise<void> {
  const headers: Record<string, string> = {
    "X-Title": title,
    "Content-Type": options.markdown ? "text/markdown" : "text/plain",
  };
  if (options.markdown) {
    headers["X-Markdown"] = "yes";
  }
  const res = await fetch(`${NTFY_URL}/${topic}`, {
    method: "POST",
    headers,
    body: message,
  });
  if (!res.ok) {
    throw new NtfyError(`ntfy.sh returned ${res.status}: ${await res.text()}`, undefined);
  }
}
