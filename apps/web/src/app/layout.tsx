import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: { default: "Tripory", template: "%s · Tripory" },
  description: "Lập và chia sẻ lịch trình du lịch",
};

// cover để env(safe-area-inset-*) có giá trị trên thiết bị tai thỏ (chân Sheet sát đáy màn hình).
export const viewport: Viewport = { viewportFit: "cover" };

// Root layout không đọc cookie: phiên được đọc trong component bọc Suspense, root layout giữ tĩnh.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
