import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { isSameMetadata, metadataOf, withMetadata } from './metadata';
import type { ItineraryMetadata } from './metadata';
import { makeDay, makeItinerary, makeWaypoint } from './test-fixtures';

const A = 'https://img.example/a.jpg';
const B = 'https://img.example/b.jpg';

const base = (): ItineraryMetadata => ({
  title: 'Tên',
  description: 'Mô tả',
  startDate: parseCalendarDate('2026-10-12'),
  coverImages: [A, B],
  selectedCoverIndex: 1,
});

describe('metadataOf', () => {
  it('danh sách ảnh rỗng thì selectedCoverIndex là null', () => {
    expect(metadataOf(makeItinerary()).selectedCoverIndex).toBeNull();
  });

  it('chỉ số là vị trí ảnh đang hiển thị trong danh sách', () => {
    const itinerary = makeItinerary({ coverImages: [A, B], coverImageUrl: B });
    expect(metadataOf(itinerary).selectedCoverIndex).toBe(1);
  });

  it.each([null, 'https://img.example/khac.jpg'])('ảnh hiển thị %j không thuộc danh sách thì chọn ảnh đầu', (url) => {
    const itinerary = makeItinerary({ coverImages: [A, B], coverImageUrl: url });
    expect(metadataOf(itinerary).selectedCoverIndex).toBe(0);
  });

  it('chép title, description, startDate, coverImages', () => {
    const itinerary = makeItinerary({ title: 'X', description: 'Y', coverImages: [A], coverImageUrl: A });
    expect(metadataOf(itinerary)).toMatchObject({ title: 'X', description: 'Y', startDate: null, coverImages: [A] });
  });
});

describe('withMetadata', () => {
  it('đổi các trường và coverImageUrl theo chỉ số', () => {
    const next = withMetadata(makeItinerary(), base());
    expect(next).toMatchObject({
      title: 'Tên',
      description: 'Mô tả',
      startDate: '2026-10-12',
      coverImages: [A, B],
      coverImageUrl: B,
    });
  });

  it('chỉ số null hoặc ngoài khoảng thì coverImageUrl là null', () => {
    expect(withMetadata(makeItinerary(), { ...base(), selectedCoverIndex: null }).coverImageUrl).toBeNull();
    expect(withMetadata(makeItinerary(), { ...base(), selectedCoverIndex: 5 }).coverImageUrl).toBeNull();
    expect(withMetadata(makeItinerary(), { ...base(), selectedCoverIndex: -1 }).coverImageUrl).toBeNull();
  });

  it('giữ nguyên điểm đến, sở thích, ngày, điểm và trạng thái', () => {
    const itinerary = makeItinerary({
      destinationCode: 'vn-da-nang',
      interests: ['nature'],
      isPublic: true,
      totalDistanceKm: 3,
      days: [makeDay(1)],
      waypoints: [makeWaypoint('w1', 1, 0)],
    });
    const next = withMetadata(itinerary, base());
    expect(next.destinationCode).toBe('vn-da-nang');
    expect(next.interests).toBe(itinerary.interests);
    expect(next.days).toBe(itinerary.days);
    expect(next.waypoints).toBe(itinerary.waypoints);
    expect(next.isPublic).toBe(true);
    expect(next.totalDistanceKm).toBe(3);
  });

  it('không sửa đầu vào và trả bản đóng băng', () => {
    const itinerary = makeItinerary();
    const input = base();
    const next = withMetadata(itinerary, input);
    expect(itinerary.title).toBe('Đà Nẵng 3 ngày');
    expect(Object.isFrozen(next)).toBe(true);
    expect(next.coverImages).not.toBe(input.coverImages);
    expect(Object.isFrozen(next.coverImages)).toBe(true);
  });
});

describe('isSameMetadata', () => {
  it('giống nhau thì true', () => {
    expect(isSameMetadata(base(), base())).toBe(true);
  });

  it.each([
    ['title', { title: 'Khác' }],
    ['description', { description: null }],
    ['startDate', { startDate: null }],
    ['selectedCoverIndex', { selectedCoverIndex: 0 }],
    ['coverImages khác thứ tự', { coverImages: [B, A] }],
    ['coverImages khác độ dài', { coverImages: [A] }],
  ] as const)('khác %s thì false', (_name, patch) => {
    expect(isSameMetadata(base(), { ...base(), ...patch })).toBe(false);
  });
});
