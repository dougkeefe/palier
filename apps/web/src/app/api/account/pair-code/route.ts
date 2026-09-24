import { serve } from "../../../../server/serve";

/** Issue a single-use pairing code, valid ten minutes (§9.3). */
export const POST = serve((api, request) => api.requestPairCode(request));
