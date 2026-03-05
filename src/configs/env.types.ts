import { z } from "zod";

export const envSchema = z.object({
  PORT: z.coerce.number().min(1),
  OPENAI_API_KEY: z.string().min(1),
  REDIS_CONNECTION_STRING: z.string().min(1),
  ROBOFLOW_API_KEY: z.string().min(1),

  AZURE_SUBSCRIPTION_ID: z.string().min(1),
  AZURE_RESOURCE_GROUP: z.string().min(1),
  ACI_CONTAINER_GROUP_NAME: z.string().min(1),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().min(1),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  NOTIFICATION_EMAIL: z.email(),
});
