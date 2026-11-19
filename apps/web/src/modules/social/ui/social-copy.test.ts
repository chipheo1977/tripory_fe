import { describe, expect, it } from "vitest";
import { deleteLabel, SOCIAL_COPY } from "./social-copy";

const LOCKED: Readonly<Record<keyof typeof SOCIAL_COPY, string>> = {
  likeLabel: "Thích lịch trình",
  unlikeLabel: "Bỏ thích lịch trình",
  guestLikeLabel: "Đăng nhập để thích lịch trình",
  composerLabel: "Viết bình luận",
  composerPlaceholder: "Chia sẻ cảm nhận của bạn về lịch trình này…",
  composerTooLong: "Bình luận tối đa 500 ký tự.",
  composerRequired: "Vui lòng nhập nội dung bình luận.",
  submit: "Gửi bình luận",
  submitting: "Đang gửi…",
  guestPrompt: "Đăng nhập để viết bình luận về lịch trình này.",
  guestLogin: "Đăng nhập để bình luận",
  anonymousAuthor: "Người dùng Tripory",
  listLabel: "Danh sách bình luận",
  loadMore: "Xem thêm bình luận",
  loadingMore: "Đang tải…",
  emptyHeading: "Chưa có bình luận nào",
  emptyMember: "Hãy là người đầu tiên chia sẻ cảm nhận về lịch trình này.",
  emptyGuest: "Đăng nhập để là người đầu tiên bình luận.",
  loadErrorTitle: "Không tải được bình luận",
  loadErrorHint: "Kiểm tra kết nối mạng rồi thử lại.",
  retry: "Thử lại",
  retryLabel: "Tải lại bình luận",
  nextErrorText: "Không tải thêm được bình luận.",
  nextRetryLabel: "Thử tải thêm bình luận",
  loadingSr: "Đang tải bình luận…",
  sentSr: "Đã gửi bình luận",
  deletedSr: "Đã xóa bình luận",
  deleteTitle: "Xóa bình luận?",
  deleteBody: "Bình luận sẽ bị xóa vĩnh viễn. Thao tác này không hoàn tác được.",
  keep: "Giữ bình luận",
  confirmDelete: "Xóa bình luận",
  deleting: "Đang xóa…",
  viewComments: "Xem bình luận",
  shortcutCtrl: "Ctrl + Enter để gửi nhanh",
  shortcutMeta: "⌘ + Enter để gửi nhanh",
  likeErrorFallback: "Chưa cập nhật được lượt thích. Kiểm tra kết nối mạng rồi thử lại.",
  submitErrorFallback: "Chưa gửi được bình luận. Nội dung vẫn còn, hãy thử gửi lại.",
  deleteErrorFallback: "Chưa xóa được bình luận. Kiểm tra kết nối mạng rồi thử lại.",
};

describe("SOCIAL_COPY", () => {
  it("đúng nguyên văn chuỗi khóa của UI-SPEC", () => {
    expect(SOCIAL_COPY).toEqual(LOCKED);
  });

  it.each(Object.entries(SOCIAL_COPY))("%s không dùng 'comment', '!' hay '...'", (_key, value) => {
    expect(value.toLowerCase()).not.toContain("comment");
    expect(value).not.toContain("!");
    expect(value).not.toContain("...");
  });

  it("deleteLabel theo tên tác giả", () => {
    expect(deleteLabel("Lan")).toBe("Xóa bình luận của Lan");
  });
});
