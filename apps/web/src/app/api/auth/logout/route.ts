import type { NextRequest } from "next/server";
import { handleLogout } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleLogout(request, serverDeps());
}
