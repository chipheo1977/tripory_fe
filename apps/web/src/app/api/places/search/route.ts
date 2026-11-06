import { connection, type NextRequest } from "next/server";
import { handlePlacesSearch } from "@/composition/server/places-handlers";
import { placesDeps } from "@/composition/server/places-runtime";

// Chỉ GET (đọc). `connection()` báo Next không prerender route này lúc build (Cache Components).
export async function GET(request: NextRequest) {
  await connection();
  return handlePlacesSearch(request, placesDeps());
}
