import { serve } from "../../../../server/serve";

/** The caller's account's devices (product-requirements.md §8.11 "your devices"). */
export const GET = serve((api, request) => api.listDevices(request));
