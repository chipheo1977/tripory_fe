"use client";

// Lỗi của cả một khối (không phải một ô): hiện bằng text node, `role="alert"`; không render gì khi không có lỗi.
export function BlockError({ id, message }: Readonly<{ id: string; message: string | undefined }>) {
  if (message === undefined) return null;
  return (
    <p className="text-label text-danger" id={id} role="alert">
      {message}
    </p>
  );
}
