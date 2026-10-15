import type { NextRequest } from "next/server";
import { forwardToBackend } from "@/composition/server/bff";
import { serverDeps } from "@/composition/server/env";

// Catch-all: `path` là các segment sau `/api/bff/`. Toàn bộ kiểm tra (allowlist, Origin, phiên) nằm trong
// `forwardToBackend`; file này chỉ nối Next với hàm thuần. Cố ý không có PATCH/OPTIONS/HEAD: Next tự trả 405.
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;

  return forwardToBackend(request, path, serverDeps());
}

export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
