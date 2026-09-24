import { serve } from "../../../../server/serve";

/** Register this device, creating its anonymous account (architecture.md §9.3, §10). */
export const POST = serve((api, request) => api.registerDevice(request));
