import { describe, expect, it } from 'vitest';
import { itineraryDayDto, itineraryDetailDto, itinerarySummaryDto, pagedDto, resolvedLinkDto, waypointDto } from './dto';
import {
  forbiddenEnvelope,
  itineraryDetailJsonFixture,
  itinerarySummaryJsonFixture,
  summaryPageJsonFixture,
  waypointJsonFixture,
} from './fixtures';

const without = <T extends object>(source: T, key: string): Record<string, unknown> =>
  Object.fromEntries(Object.entries(source).filter(([name]) => name !== key));

describe('itineraryDetailDto', () => {
  it('nhận ItineraryDetailDto thật của BE, updatedAt có 7 chữ số lẻ và offset', () => {
    const parsed = itineraryDetailDto.parse(itineraryDetailJsonFixture);

    expect(parsed.updatedAt).toBe('2026-10-24T08:08:08.8812345+00:00');
    expect(parsed.days).toHaveLength(2);
    expect(parsed.waypoints).toHaveLength(3);
  });

  it.each(['2026-10-24T08:08:08', '2026-10-24', 'hôm qua', ''] as const)(
    'từ chối updatedAt không có offset hoặc sai dạng (%s)',
    (updatedAt) => {
      expect(itineraryDetailDto.safeParse({ ...itineraryDetailJsonFixture, updatedAt }).success).toBe(false);
    },
  );

  it('chấp nhận offset khác UTC và hậu tố Z', () => {
    for (const updatedAt of ['2026-10-24T15:08:08.1234567+07:00', '2026-10-24T08:08:08Z']) {
      expect(itineraryDetailDto.safeParse({ ...itineraryDetailJsonFixture, updatedAt }).success).toBe(true);
    }
  });

  it.each(['2026-02-29', '2026-13-01', '2026-10-32', '12/10/2026', '2026-10-12T00:00:00+00:00'] as const)(
    'từ chối startDate không phải ngày lịch hợp lệ (%s)',
    (startDate) => {
      expect(itineraryDetailDto.safeParse({ ...itineraryDetailJsonFixture, startDate }).success).toBe(false);
    },
  );

  it('chấp nhận startDate null, thiếu, và ngày nhuận hợp lệ', () => {
    expect(itineraryDetailDto.safeParse({ ...itineraryDetailJsonFixture, startDate: null }).success).toBe(true);
    expect(itineraryDetailDto.safeParse(without(itineraryDetailJsonFixture, 'startDate')).success).toBe(true);
    expect(itineraryDetailDto.safeParse({ ...itineraryDetailJsonFixture, startDate: '2028-02-29' }).success).toBe(true);
  });

  it.each(['id', 'userId', 'title', 'isPublic', 'totalDistanceKm', 'createdAt', 'updatedAt', 'days', 'waypoints'] as const)(
    'thiếu %s thì parse thất bại',
    (key) => {
      expect(itineraryDetailDto.safeParse(without(itineraryDetailJsonFixture, key)).success).toBe(false);
    },
  );

  it('bỏ khóa lạ thay vì giữ lại', () => {
    const parsed = itineraryDetailDto.parse({ ...itineraryDetailJsonFixture, accessToken: 'x', secret: 1 });

    expect(JSON.stringify(parsed)).not.toMatch(/accessToken|secret/);
  });

  it('envelope lỗi của BE không parse thành chi tiết lịch trình', () => {
    expect(itineraryDetailDto.safeParse(forbiddenEnvelope).success).toBe(false);
  });
});

describe('waypointDto và itineraryDayDto', () => {
  it('waypointDto nhận WaypointDto thật, address và notes có thể null', () => {
    const parsed = waypointDto.parse(waypointJsonFixture);

    expect(parsed).toMatchObject({ name: 'Nhà thờ Đức Bà', longitude: 106.699, latitude: 10.7798, address: null });
  });

  it.each(['id', 'dayNumber', 'orderIndex', 'name', 'longitude', 'latitude'] as const)(
    'waypointDto thiếu %s thì parse thất bại',
    (key) => {
      expect(waypointDto.safeParse(without(waypointJsonFixture, key)).success).toBe(false);
    },
  );

  it('waypointDto từ chối dayNumber thập phân', () => {
    expect(waypointDto.safeParse({ ...waypointJsonFixture, dayNumber: 1.5 }).success).toBe(false);
  });

  it('itineraryDayDto cho phép subtitle và dayDistanceKm null', () => {
    const day = { id: 'd', dayNumber: 2, subtitle: null, dayDistanceKm: null };

    expect(itineraryDayDto.parse(day)).toEqual(day);
  });
});

describe('itinerarySummaryDto', () => {
  it('nhận một dòng của /mine mà không đòi updatedAt', () => {
    expect(itinerarySummaryDto.safeParse(itinerarySummaryJsonFixture).success).toBe(true);
  });

  it('bỏ hai bộ đếm của BE khỏi kết quả', () => {
    const parsed = itinerarySummaryDto.parse(itinerarySummaryJsonFixture);

    expect(Object.keys(parsed)).not.toContain('daysCount');
    expect(Object.keys(parsed)).not.toContain('waypointsCount');
  });

  it('không giữ days, waypoints hay updatedAt dù BE gọi kèm', () => {
    const parsed = itinerarySummaryDto.parse({ ...itinerarySummaryJsonFixture, updatedAt: 'x', days: [], waypoints: [] });

    expect(Object.keys(parsed).toSorted()).toEqual([
      'coverImageUrl',
      'createdAt',
      'description',
      'id',
      'isPublic',
      'startDate',
      'title',
      'totalDistanceKm',
      'userId',
    ]);
  });

  it('từ chối createdAt không có offset', () => {
    expect(itinerarySummaryDto.safeParse({ ...itinerarySummaryJsonFixture, createdAt: '2026-10-12T01:02:03' }).success).toBe(
      false,
    );
  });
});

describe('pagedDto', () => {
  const page = pagedDto(itinerarySummaryDto);

  it('nhận PagedResult thật của BE', () => {
    const parsed = page.parse(summaryPageJsonFixture);

    expect(parsed).toMatchObject({ pageIndex: 1, pageSize: 12, totalCount: 13, hasNextPage: true });
    expect(parsed.items).toHaveLength(1);
  });

  it.each(['items', 'pageIndex', 'hasNextPage'] as const)('thiếu %s thì parse thất bại', (key) => {
    expect(page.safeParse(without(summaryPageJsonFixture, key)).success).toBe(false);
  });

  it('một phần tử hỏng làm hỏng cả trang', () => {
    const broken = { ...summaryPageJsonFixture, items: [{ ...itinerarySummaryJsonFixture, id: undefined }] };

    expect(page.safeParse(broken).success).toBe(false);
  });
});

describe('resolvedLinkDto', () => {
  it('nhận { url } và bỏ khóa lạ', () => {
    expect(resolvedLinkDto.parse({ url: 'https://www.google.com/maps/@10,106,15z', extra: 1 })).toEqual({
      url: 'https://www.google.com/maps/@10,106,15z',
    });
  });

  it.each([{}, { url: 1 }, null, 'https://x.vn'] as const)('từ chối body sai hình dạng (%j)', (body) => {
    expect(resolvedLinkDto.safeParse(body).success).toBe(false);
  });
});
