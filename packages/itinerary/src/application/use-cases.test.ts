import { describe, expect, it, vi } from 'vitest';
import { makeItinerary, makeWaypoint } from '../domain/test-fixtures';
import type { ItineraryRepository } from './ports';
import { reorderWaypoints } from './use-cases';

const fakeRepo = () => {
  const reorder = vi.fn<ItineraryRepository['reorderWaypoints']>(async () => undefined);

  return { repo: { reorderWaypoints: reorder }, reorder };
};

const itinerary = makeItinerary({
  waypoints: [
    makeWaypoint('a', 1, 0),
    makeWaypoint('b', 1, 1),
    makeWaypoint('c', 1, 2),
    makeWaypoint('x', 2, 0),
  ],
});

describe('reorderWaypoints', () => {
  it('gọi repo đúng một lần với id lịch trình và input khi tập id khớp ngày', async () => {
    const { repo, reorder } = fakeRepo();
    const input = { dayNumber: 1, orderedIds: ['c', 'a', 'b'] };

    await reorderWaypoints(repo, itinerary, input);

    expect(reorder).toHaveBeenCalledTimes(1);
    expect(reorder).toHaveBeenCalledWith(itinerary.id, input);
  });

  it.each([
    ['thiếu một id', ['a', 'b']],
    ['thừa một id của ngày khác', ['a', 'b', 'c', 'x']],
    ['trùng id', ['a', 'a', 'b']],
    ['id lạ thay cho id thật', ['a', 'b', 'z']],
    ['mảng rỗng', []],
  ] as const)('%s thì từ chối và không gọi repo', async (_name, orderedIds) => {
    const { repo, reorder } = fakeRepo();

    await expect(reorderWaypoints(repo, itinerary, { dayNumber: 1, orderedIds })).rejects.toThrow(
      'Thứ tự không khớp danh sách điểm đến của ngày.',
    );
    expect(reorder).not.toHaveBeenCalled();
  });

  it('từ chối khi id thuộc ngày khác', async () => {
    const { repo, reorder } = fakeRepo();

    await expect(reorderWaypoints(repo, itinerary, { dayNumber: 2, orderedIds: ['a'] })).rejects.toThrow(Error);
    expect(reorder).not.toHaveBeenCalled();
  });

  it('lỗi của repo lan nguyên cùng tham chiếu', async () => {
    const error = new Error('mạng');
    const reorder = vi.fn<ItineraryRepository['reorderWaypoints']>(async () => {
      throw error;
    });

    await expect(
      reorderWaypoints({ reorderWaypoints: reorder }, itinerary, { dayNumber: 1, orderedIds: ['a', 'b', 'c'] }),
    ).rejects.toBe(error);
  });
});
