import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { DefaultAzureCredential } from "@azure/identity";
import { env } from "@/configs/env.ts";
import { ACI_POLL_INTERVAL_MS } from "./sync.constants.ts";
import logger from "@/infra/logger/logger.ts";

const credential = new DefaultAzureCredential();
const client = new ContainerInstanceManagementClient(credential, env.AZURE_SUBSCRIPTION_ID);

const TERMINAL_STATES = new Set(["Stopped", "Terminated", "Failed", "Succeeded"]);

export async function getContainerGroupHost(): Promise<string | null> {
  const group = await client.containerGroups.get(
    env.AZURE_RESOURCE_GROUP,
    env.ACI_CONTAINER_GROUP_NAME,
  );
  return group.ipAddress?.fqdn ?? group.ipAddress?.ip ?? null;
}

export async function stopContainerGroup(): Promise<void> {
  logger.info(
    `[aci] Stopping container group "${env.ACI_CONTAINER_GROUP_NAME}" in "${env.AZURE_RESOURCE_GROUP}"`,
  );
  await client.containerGroups.stop(env.AZURE_RESOURCE_GROUP, env.ACI_CONTAINER_GROUP_NAME);
  logger.info("[aci] Container group stopped");
}

export async function startContainerGroup(): Promise<void> {
  logger.info(
    `[aci] Starting container group "${env.ACI_CONTAINER_GROUP_NAME}" in "${env.AZURE_RESOURCE_GROUP}"`,
  );
  const poller = await client.containerGroups.beginStart(
    env.AZURE_RESOURCE_GROUP,
    env.ACI_CONTAINER_GROUP_NAME,
  );
  await poller.pollUntilDone();
  logger.info("[aci] Container group started");
}

/**
 * Polls the ACI container group state every ACI_POLL_INTERVAL_MS.
 * Resolves with the terminal state string when the container exits,
 * or null if polling was aborted via the AbortSignal.
 */
export function pollContainerState(signal: AbortSignal): Promise<string | null> {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (signal.aborted) {
        clearInterval(interval);
        resolve(null);
        return;
      }
      try {
        const group = await client.containerGroups.get(
          env.AZURE_RESOURCE_GROUP,
          env.ACI_CONTAINER_GROUP_NAME,
        );
        const state = group.instanceView?.state ?? "Unknown";
        logger.debug(`[aci-poll] Container state: ${state}`);
        if (TERMINAL_STATES.has(state)) {
          clearInterval(interval);
          logger.info(`[aci-poll] Container reached terminal state: ${state}`);
          resolve(state);
        }
      } catch {
        logger.debug("[aci-poll] Poll request failed, will retry");
      }
    }, ACI_POLL_INTERVAL_MS);

    signal.addEventListener("abort", () => {
      clearInterval(interval);
      resolve(null);
    });
  });
}
