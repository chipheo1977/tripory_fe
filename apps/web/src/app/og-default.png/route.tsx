import { ImageResponse } from "next/og";

// Ảnh OG mặc định 1200x630 (D-18, UI-SPEC §Preview link): nền #FAFAF9 (neutral-50), wordmark "Tripory" #1C1917 (neutral-900),
// vạch ngang #C44728 (coral-600, primary) dưới wordmark. Chỉ ASCII: font mặc định của satori không đảm bảo dấu tiếng Việt.
// Route không đọc cookie, header hay thời gian nên có thể tiền kết xuất tĩnh. Dùng làm `og:image` khi lịch trình không có ảnh
// bìa do người dùng tự thêm (ảnh mặc định theo điểm đến còn là ảnh giữ chỗ); URL tuyệt đối `{origin}/og-default.png`.
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAFAF9",
        }}
      >
        <div style={{ display: "flex", fontSize: 120, fontWeight: 600, color: "#1C1917" }}>Tripory</div>
        <div style={{ display: "flex", width: 400, height: 8, marginTop: 24, backgroundColor: "#C44728" }} />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
