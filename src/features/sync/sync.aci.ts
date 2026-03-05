import { ContainerInstanceManagementClient } from "@azure/arm-containerinstance";
import { DefaultAzureCredential } from "@azure/identity";
import { env } from "@/configs/env.ts";
import logger from "@/logger/logger.ts";

const credential = new DefaultAzureCredential();
const client = new ContainerInstanceManagementClient(credential, env.AZURE_SUBSCRIPTION_ID);

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
