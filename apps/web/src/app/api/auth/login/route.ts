import type { NextRequest } from "next/server";
import { handleLogin } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleLogin(request, serverDeps());
}
