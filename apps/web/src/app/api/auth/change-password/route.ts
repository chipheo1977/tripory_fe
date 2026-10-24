import type { NextRequest } from "next/server";
import { handleChangePassword } from "@/composition/server/auth-handlers";
import { serverDeps } from "@/composition/server/env";

export function PUT(request: NextRequest) {
  return handleChangePassword(request, serverDeps());
}
