import { connection, type NextRequest } from "next/server";
import { handlePlacesSuggestions } from "@/composition/server/places-handlers";
import { placesDeps } from "@/composition/server/places-runtime";

// Chỉ GET (đọc). `connection()` báo Next không prerender route này lúc build (Cache Components).
export async function GET(request: NextRequest) {
  await connection();
  return handlePlacesSuggestions(request, placesDeps());
}
