import { serve } from "../../../../server/serve";

/** Join the account a pairing code names (§9.3 "adding a second device"). */
export const POST = serve((api, request) => api.redeemPairCode(request));
