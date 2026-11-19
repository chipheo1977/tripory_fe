import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { NO_PUBLIC_SOCIAL, type PublicSocialInput } from "@/modules/itinerary/ui/public-social";
import { CommentSection } from "@/modules/social/ui/comment-section";
import { ConnectedLikeControl } from "@/modules/social/ui/connected-like-control";
import { SocialProvider } from "@/modules/social/ui/social-context";
import { FX_ENGAGEMENT, fxItineraryId, fxOtherId, fxOwnerId } from "@/test/domain-itinerary-fixtures";
import { makePublicSocial } from "./public-social";
import { PublicSocialOverview } from "./public-social-overview";

// cây element không render: tránh nạp composition phía browser.
vi.mock("@/composition/social.client", () => ({ social: {} }));

type AnyElement = ReactElement<Record<string, unknown>>;

const input = (overrides: Partial<PublicSocialInput> = {}): PublicSocialInput => ({
  itineraryId: fxItineraryId(),
  ownerId: fxOwnerId(),
  viewerId: null,
  isPublished: true,
  engagement: FX_ENGAGEMENT,
  likeSyncNeeded: false,
  ...overrides,
});

describe("makePublicSocial", () => {
  it.each([
    ["bản nháp", { isPublished: false }],
    ["thiếu engagement", { engagement: null }],
  ])("%s trả NO_PUBLIC_SOCIAL", (_name, overrides) => {
    expect(makePublicSocial(input(overrides))).toBe(NO_PUBLIC_SOCIAL);
  });

  it("đã xuất bản có ba slot đúng component", () => {
    const { slots } = makePublicSocial(input());
    const hero = slots.hero as AnyElement;
    const comments = slots.comments as AnyElement;
    const overview = slots.overview as AnyElement;
    expect(hero.type).toBe(ConnectedLikeControl);
    expect(hero.props.visible).toBe(true);
    expect(comments.type).toBe(CommentSection);
    expect(comments.props.visible).toBe(true);
    expect(overview.type).toBe(PublicSocialOverview);
  });

  it.each([true, false])("wrap bọc SocialProvider với seed từ engagement, syncLike=%s", (likeSyncNeeded) => {
    const child = <div />;
    const wrapped = makePublicSocial(input({ likeSyncNeeded, viewerId: fxOtherId() })).wrap(child) as AnyElement;
    expect(wrapped.type).toBe(SocialProvider);
    expect(wrapped.props.children).toBe(child);
    expect(wrapped.props).toEqual({
      children: child,
      initialCommentCount: 3,
      initialLike: { count: 12, liked: false },
      itineraryId: fxItineraryId(),
      ownerId: fxOwnerId(),
      syncLike: likeSyncNeeded,
      viewerId: fxOtherId(),
    });
    expect(JSON.stringify({ ...wrapped.props, children: null })).not.toMatch(/accessToken|refreshToken|cookie/i);
  });

  it("likedByMe true thành initialLike.liked true", () => {
    const wrapped = makePublicSocial(
      input({ viewerId: fxOtherId(), engagement: { ...FX_ENGAGEMENT, likedByMe: true } }),
    ).wrap(null) as AnyElement;
    expect(wrapped.props.initialLike).toEqual({ count: 12, liked: true });
  });
});
