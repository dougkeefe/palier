/**
 * A `fetch` that answers from the route files themselves, so the HTTP sync adapter can
 * be driven through the real Next route handlers without a server: request in, route
 * module's exported method called, its `Response` out. The paths are the route files'
 * own locations, so a moved or renamed route fails the contract run.
 */
type Handler = (request: Request, context?: { params: Promise<{ id: string }> }) => Promise<Response>;

const routes = async () => {
  const device = await import("../account/device/route");
  const deviceById = await import("../account/device/[id]/route");
  const pairCode = await import("../account/pair-code/route");
  const pair = await import("../account/pair/route");
  const devices = await import("../account/devices/route");
  const account = await import("../account/route");
  const sync = await import("../sync/route");
  const realtimeSecret = await import("../realtime/secret/route");
  return (method: string, path: string): { handler: Handler; id?: string } | null => {
    const byId = /^\/api\/account\/device\/([^/]+)$/.exec(path);
    if (byId !== null && method === "DELETE") return { handler: deviceById.DELETE as Handler, id: decodeURIComponent(byId[1] ?? "") };
    const table: Record<string, Handler | undefined> = {
      "POST /api/account/device": device.POST,
      "POST /api/account/pair-code": pairCode.POST,
      "POST /api/account/pair": pair.POST,
      "GET /api/account/devices": devices.GET,
      "DELETE /api/account": account.DELETE,
      "GET /api/sync": sync.GET,
      "POST /api/sync": sync.POST,
      "POST /api/realtime/secret": realtimeSecret.POST,
    };
    const handler = table[`${method} ${path}`];
    return handler === undefined ? null : { handler };
  };
};

export const routeFetch = async () => {
  const find = await routes();
  return async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    const request = new Request(url, init);
    const found = find(init.method, new URL(url).pathname);
    if (found === null) return new Response(null, { status: 404 });
    return found.id === undefined
      ? found.handler(request)
      : found.handler(request, { params: Promise.resolve({ id: found.id }) });
  };
};
