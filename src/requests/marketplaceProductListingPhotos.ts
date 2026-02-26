import { getSessionOrThrow } from "@/requests/session.ts";
import { REQUEST_SPECIFIC } from "./constants.ts";

const marketplaceProductListingPhotosParams = (
  targetId: string,
  sessionBody: Record<string, string>,
): Record<string, string> => {
  const bodyParams = {
    ...sessionBody,
    ...REQUEST_SPECIFIC.PHOTOS,
    variables: JSON.stringify({ targetId }),
  };
  return bodyParams as Record<string, string>;
};

export async function marketplaceProductListingPhotosRequestConfig(targetId: string) {
  const session = await getSessionOrThrow();
  return {
    method: "POST" as const,
    headers: {
      ...session.headers,
      cookie: session.cookie,
      "x-fb-friendly-name": REQUEST_SPECIFIC.PHOTOS.fb_api_req_friendly_name,
      "x-fb-lsd": session.body.lsd,
    },
    body: new URLSearchParams(
      marketplaceProductListingPhotosParams(targetId, session.body),
    ).toString(),
  };
}
