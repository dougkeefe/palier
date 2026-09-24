import { serve } from "../../../../../server/serve";

/** Remove a device from the caller's account (§9.3 revocation). */
export async function DELETE(request: Request, context: RouteContext<"/api/account/device/[id]">): Promise<Response> {
  const { id } = await context.params;
  return serve((api, r: Request) => api.revokeDevice(r, id))(request);
}
