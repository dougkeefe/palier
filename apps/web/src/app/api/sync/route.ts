import { serve } from "../../../server/serve";

/** Pull documents newer than `?watermark=` (architecture.md §9.4). */
export const GET = serve((api, request) => api.pull(request));

/** Push documents, each with the revision it was derived from (progress.md D69). */
export const POST = serve((api, request) => api.push(request));
