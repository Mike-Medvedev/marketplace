import { SESSION } from "@/requests/session.ts";
import { REQUEST_SPECIFIC } from "./constants.ts";

const marketplaceProductListingPhotosParams = (
  targetId: string,
): Record<string, string> => {
  const bodyParams = {
    ...SESSION.body,
    ...REQUEST_SPECIFIC.PHOTOS,
    variables: JSON.stringify({ targetId }),
  };
  return bodyParams as Record<string, string>;
};

export const marketplaceProductListingPhotosRequestConfig = (
  targetId: string,
) => ({
  method: "POST" as const,
  headers: {
    ...SESSION.headers,
    cookie: SESSION.cookie,
    "x-fb-friendly-name": REQUEST_SPECIFIC.PHOTOS.fb_api_req_friendly_name,
    "x-fb-lsd": SESSION.body.lsd,
  },
  body: new URLSearchParams(
    marketplaceProductListingPhotosParams(targetId),
  ).toString(),
});
