import { SESSION } from "@/requests/session.ts";
import { REQUEST_SPECIFIC } from "./constants.ts";

const marketplaceProductListingDescriptionParams = (
  targetId: string,
): Record<string, string> => {
  const variables = {
    enableJobEmployerActionBar: true,
    enableJobSeekerActionBar: true,
    feedbackSource: 56,
    feedLocation: "MARKETPLACE_MEGAMALL",
    referralCode: "null",
    scale: 2,
    targetId,
    useDefaultActor: false,
    __relay_internal__pv__ShouldUpdateMarketplaceBoostListingBoostedStatusrelayprovider: false,
    __relay_internal__pv__CometUFISingleLineUFIrelayprovider: false,
    __relay_internal__pv__CometUFIShareActionMigrationrelayprovider: true,
    __relay_internal__pv__CometUFIReactionsEnableShortNamerelayprovider: false,
    __relay_internal__pv__CometUFICommentAvatarStickerAnimatedImagerelayprovider: false,
    __relay_internal__pv__CometUFICommentActionLinksRewriteEnabledrelayprovider: false,
    __relay_internal__pv__IsWorkUserrelayprovider: false,
    __relay_internal__pv__GHLShouldChangeSponsoredDataFieldNamerelayprovider: true,
    __relay_internal__pv__GHLShouldChangeAdIdFieldNamerelayprovider: true,
    __relay_internal__pv__CometUFI_dedicated_comment_routable_dialog_gkrelayprovider: false,
  };
  const bodyParams = {
    ...SESSION.body,
    ...REQUEST_SPECIFIC.DESCRIPTION,
    variables: JSON.stringify(variables),
  };
  return bodyParams as Record<string, string>;
};

export const marketplaceProductListingDescriptionRequestConfig = (
  targetId: string,
) => ({
  method: "POST" as const,
  headers: {
    ...SESSION.headers,
    cookie: SESSION.cookie,
    "x-fb-friendly-name": REQUEST_SPECIFIC.DESCRIPTION.fb_api_req_friendly_name,
    "x-fb-lsd": SESSION.body.lsd,
  },
  body: new URLSearchParams(
    marketplaceProductListingDescriptionParams(targetId),
  ).toString(),
});
