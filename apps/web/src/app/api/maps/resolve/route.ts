import type { NextRequest } from "next/server";
import { serverDeps } from "@/composition/server/env";
import { handleMapsResolve } from "@/composition/server/maps-handlers";

// Chỉ POST: request ghi luôn có Origin nên trang lạ không kích hoạt được bằng phiên của nạn nhân.
export function POST(request: NextRequest) {
  return handleMapsResolve(request, serverDeps());
}
