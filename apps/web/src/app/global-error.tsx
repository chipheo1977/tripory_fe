"use client";

import { ErrorState } from "@tripory/ui-web";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
};

export default function GlobalError(props: GlobalErrorProps) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-screen min-h-dvh bg-background font-sans text-text">
        <title>Không thể tải nội dung · Tripory</title>
        <main className="mx-auto flex min-h-screen min-h-dvh w-full max-w-content-lg px-page-inline py-page-block sm:px-page-inline-md lg:px-page-inline-lg lg:py-page-block-wide">
          <ErrorState className="flex-1" onRetry={props.retry} variant="page" />
        </main>
      </body>
    </html>
  );
}
