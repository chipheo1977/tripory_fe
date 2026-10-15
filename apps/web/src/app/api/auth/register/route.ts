import type { NextRequest } from "next/server";
import { handleRegister } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function POST(request: NextRequest) {
  return handleRegister(request, serverDeps());
}
