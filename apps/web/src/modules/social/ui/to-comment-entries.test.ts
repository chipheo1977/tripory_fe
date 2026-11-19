import { describe, expect, it } from "vitest";
import { fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { FX_COMMENT_AUTHOR, makeFxComment } from "@/test/domain-social-fixtures";
import { parseUserId } from "@tripory/shared-kernel";
import { toCommentEntries } from "./to-comment-entries";

const third = parseUserId("11111111-1111-4111-8111-111111111111");
if (third === null) throw new Error("id mẫu phải hợp lệ");

describe("toCommentEntries", () => {
  const withAuthor = makeFxComment(1);
  const anonymous = makeFxComment(2, { author: null });

  it("giữ thứ tự và chép trường hiển thị", () => {
    const entries = toCommentEntries([withAuthor, anonymous], null, fxOwnerId());
    expect(entries.map((entry) => entry.id)).toEqual([withAuthor.id, anonymous.id]);
    expect(entries[0]).toMatchObject({
      authorName: FX_COMMENT_AUTHOR.displayName,
      avatarUrl: null,
      createdAt: withAuthor.createdAt,
      content: withAuthor.content,
    });
  });

  it("tác giả null hiện Người dùng Tripory", () => {
    expect(toCommentEntries([anonymous], null, fxOwnerId())[0]?.authorName).toBe("Người dùng Tripory");
  });

  it("tác giả xóa được bình luận của mình", () => {
    expect(toCommentEntries([withAuthor], fxOtherId(), fxOwnerId())[0]?.canDelete).toBe(true);
  });

  it("chủ xóa được bình luận người khác, kể cả tác giả null", () => {
    const entries = toCommentEntries([withAuthor, anonymous], fxOwnerId(), fxOwnerId());
    expect(entries.map((entry) => entry.canDelete)).toEqual([true, true]);
  });

  it("người thứ ba và khách không xóa được", () => {
    expect(toCommentEntries([withAuthor, anonymous], third, fxOwnerId()).map((e) => e.canDelete)).toEqual([false, false]);
    expect(toCommentEntries([withAuthor, anonymous], null, fxOwnerId()).map((e) => e.canDelete)).toEqual([false, false]);
  });
});
