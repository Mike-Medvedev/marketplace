import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  FB_COOKIE: z.string().min(1),
  FB_USER_ID: z.string().min(1),
  FB_DTSG: z.string().min(1),
  FB_LSD: z.string().min(1),
  FB_HS: z.string().min(1),
  FB_REV: z.string().min(1),
  FB_S: z.string().min(1),
  FB_HSI: z.string().min(1),
  FB_DYN: z.string().min(1),
  FB_CSR: z.string().min(1),
  FB_HSDP: z.string().min(1),
  FB_HBLP: z.string().min(1),
  FB_SJSP: z.string().min(1),
  FB_COMET_REQ: z.string().min(1),
  FB_JAZOEST: z.string().min(1),
  FB_SPIN_R: z.string().min(1),
  FB_SPIN_T: z.string().min(1),
  // Headers (extracted from fetch; rotate with session)
  FB_SEC_CH_UA: z.string().min(1),
  FB_SEC_CH_UA_FULL_VERSION_LIST: z.string().min(1),
  FB_SEC_CH_UA_MOBILE: z.string().min(1),
  FB_SEC_CH_UA_MODEL: z.string().transform((s) => (s || '""')), // often "" for desktop
  FB_SEC_CH_UA_PLATFORM: z.string().min(1),
  FB_SEC_CH_UA_PLATFORM_VERSION: z.string().min(1),
  FB_SEC_CH_PREFERS_COLOR_SCHEME: z.string().min(1),
  FB_X_ASBD_ID: z.string().min(1),
  FB_ACCEPT_LANGUAGE: z.string().min(1),
});

export const env = envSchema.parse(process.env);
