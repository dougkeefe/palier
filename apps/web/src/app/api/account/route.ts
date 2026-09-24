import { serve } from "../../../server/serve";

/** Delete everything the server holds for the caller's account (§8.11, [R11]). */
export const DELETE = serve((api, request) => api.deleteAccount(request));
