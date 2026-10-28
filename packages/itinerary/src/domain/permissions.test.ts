import { describe, expect, it } from 'vitest';
import { canEdit, canPublish } from './permissions';
import { makeItinerary, makeWaypoint, otherUserIdFixture, ownerIdFixture } from './test-fixtures';

describe('canEdit', () => {
  const itinerary = makeItinerary();

  it('false khi chưa đăng nhập (T-04-12)', () => {
    expect(canEdit(itinerary, null)).toBe(false);
  });

  it('false khi người xem không phải chủ', () => {
    expect(canEdit(itinerary, otherUserIdFixture)).toBe(false);
  });

  it('true khi người xem là chủ', () => {
    expect(canEdit(itinerary, ownerIdFixture)).toBe(true);
  });
});

describe('canPublish', () => {
  const a = makeWaypoint('a', 1, 0);
  const b = makeWaypoint('b', 1, 1);

  it('false khi đã xuất bản', () => {
    expect(canPublish(makeItinerary({ isPublic: true, waypoints: [a] }), new Set())).toBe(false);
  });

  it('false khi chưa có waypoint nào', () => {
    expect(canPublish(makeItinerary(), new Set())).toBe(false);
  });

  it('false khi waypoint duy nhất đang chờ xóa (D-45)', () => {
    expect(canPublish(makeItinerary({ waypoints: [a] }), new Set(['a']))).toBe(false);
  });

  it('true khi còn ít nhất một waypoint không chờ xóa', () => {
    expect(canPublish(makeItinerary({ waypoints: [a, b] }), new Set(['a']))).toBe(true);
  });

  it('true khi nháp có waypoint và không có gì chờ xóa', () => {
    expect(canPublish(makeItinerary({ waypoints: [a] }), new Set())).toBe(true);
  });
});
