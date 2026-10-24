import type { NextRequest } from "next/server";
import { handleRefresh } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleRefresh(request, serverDeps());
}
