import { describe, expect, it } from 'vitest';
import { itineraryDetailDto, itinerarySummaryDto, pagedDto, waypointDto } from './dto';
import {
  itineraryDetailJsonFixture,
  itineraryDetailWithDestinationFixture,
  itineraryIdFixture,
  itinerarySummaryJsonFixture,
  legacyDetailFixture,
  ownerIdFixture,
  summaryPageJsonFixture,
  waypointIdsFixture,
  waypointJsonFixture,
} from './fixtures';
import { toItinerary, toSummary, toSummaryPage, toWaypoint } from './mappers';

const detail = (overrides: Record<string, unknown> = {}) =>
  itineraryDetailDto.parse({ ...itineraryDetailJsonFixture, ...overrides });

describe('toItinerary', () => {
  it('sắp days theo dayNumber, giữ ngày thưa nguyên (không bù Ngày 2)', () => {
    const itinerary = toItinerary(detail());

    expect(itinerary.days.map((day) => day.dayNumber)).toEqual([1, 3]);
  });

  it('sắp waypoints theo (dayNumber, orderIndex)', () => {
    const itinerary = toItinerary(detail());

    expect(itinerary.waypoints.map((waypoint) => waypoint.id)).toEqual([
      waypointIdsFixture[1],
      waypointIdsFixture[0],
      waypointIdsFixture[2],
    ]);
  });

  it('sắp đúng khi cả ngày lẫn orderIndex đều lộn', () => {
    const waypoints = [
      { ...waypointJsonFixture, id: 'w-3-0', dayNumber: 3, orderIndex: 0 },
      { ...waypointJsonFixture, id: 'w-1-2', dayNumber: 1, orderIndex: 2 },
      { ...waypointJsonFixture, id: 'w-2-0', dayNumber: 2, orderIndex: 0 },
      { ...waypointJsonFixture, id: 'w-1-0', dayNumber: 1, orderIndex: 0 },
      { ...waypointJsonFixture, id: 'w-1-1', dayNumber: 1, orderIndex: 1 },
    ];

    expect(toItinerary(detail({ waypoints })).waypoints.map((waypoint) => waypoint.id)).toEqual([
      'w-1-0',
      'w-1-1',
      'w-1-2',
      'w-2-0',
      'w-3-0',
    ]);
  });

  it('không sửa mảng của DTO đầu vào', () => {
    const dto = detail();
    const before = dto.days.map((day) => day.dayNumber);

    toItinerary(dto);

    expect(dto.days.map((day) => day.dayNumber)).toEqual(before);
  });

  it("subtitle '' và khoảng trắng thành null, subtitle thật giữ nguyên", () => {
    const days = [
      { id: 'a', dayNumber: 1, subtitle: '', dayDistanceKm: null },
      { id: 'b', dayNumber: 2, subtitle: '   ', dayDistanceKm: null },
      { id: 'c', dayNumber: 3, subtitle: 'Ăn sáng ở chợ', dayDistanceKm: null },
      { id: 'd', dayNumber: 4, subtitle: null, dayDistanceKm: null },
    ];

    expect(toItinerary(detail({ days })).days.map((day) => day.subtitle)).toEqual([null, null, 'Ăn sáng ở chợ', null]);
  });

  it('dayDistanceKm null thành distanceKm null, số giữ nguyên', () => {
    const itinerary = toItinerary(detail());

    expect(itinerary.days).toEqual([
      { dayNumber: 1, subtitle: null, distanceKm: 12.4 },
      { dayNumber: 3, subtitle: null, distanceKm: null },
    ]);
  });

  it('dựng id có kiểu, chủ lịch trình, ngày bắt đầu và cờ xuất bản', () => {
    const itinerary = toItinerary(detail({ isPublic: true }));

    expect(itinerary.id).toBe(itineraryIdFixture);
    expect(itinerary.ownerId).toBe(ownerIdFixture);
    expect(itinerary.startDate).toBe('2026-10-12');
    expect(itinerary.isPublic).toBe(true);
    expect(itinerary.totalDistanceKm).toBe(12.4);
  });

  it('chuẩn hóa id chữ hoa về chữ thường', () => {
    const itinerary = toItinerary(detail({ id: itineraryIdFixture.toUpperCase(), userId: ownerIdFixture.toUpperCase() }));

    expect(itinerary.id).toBe(itineraryIdFixture);
    expect(itinerary.ownerId).toBe(ownerIdFixture);
  });

  it("description '' hoặc khoảng trắng, coverImageUrl '' thành null", () => {
    const itinerary = toItinerary(detail({ description: '  ', coverImageUrl: '' }));

    expect(itinerary.description).toBeNull();
    expect(itinerary.coverImageUrl).toBeNull();
  });

  it('giữ description và coverImageUrl thật, startDate null thành null', () => {
    const itinerary = toItinerary(
      detail({ description: 'Đi chơi', coverImageUrl: 'https://cdn.tripory.vn/c.jpg', startDate: null }),
    );

    expect(itinerary.description).toBe('Đi chơi');
    expect(itinerary.coverImageUrl).toBe('https://cdn.tripory.vn/c.jpg');
    expect(itinerary.startDate).toBeNull();
  });

  it('userId sai GUID thì ném thông báo rõ', () => {
    expect(() => toItinerary(detail({ userId: 'khong-phai-guid' }))).toThrow(
      'Id chủ lịch trình trong phản hồi của BE không hợp lệ.',
    );
  });

  it('id lịch trình sai GUID thì ném', () => {
    expect(() => toItinerary(detail({ id: 'khong-phai-guid' }))).toThrow(
      'Id lịch trình trong phản hồi của BE không hợp lệ.',
    );
  });

  it.each([
    ['latitude 95', { latitude: 95 }],
    ['latitude -91', { latitude: -91 }],
    ['longitude 181', { longitude: 181 }],
  ] as const)('tọa độ hỏng (%s) thì ném, không trả lịch trình hỏng', (_name, patch) => {
    const waypoints = [{ ...waypointJsonFixture, ...patch }];

    expect(() => toItinerary(detail({ waypoints }))).toThrow('Tọa độ điểm đến trong phản hồi của BE không hợp lệ.');
  });

  it('kết quả bất biến: lịch trình, mảng và phần tử đều đã freeze', () => {
    const itinerary = toItinerary(detail());

    expect(Object.isFrozen(itinerary)).toBe(true);
    expect(Object.isFrozen(itinerary.days)).toBe(true);
    expect(Object.isFrozen(itinerary.waypoints)).toBe(true);
    expect(Object.isFrozen(itinerary.days[0])).toBe(true);
    expect(Object.isFrozen(itinerary.waypoints[0])).toBe(true);
  });

  it('chỉ chép các field của domain, không rò createdAt hay updatedAt', () => {
    const itinerary = toItinerary(detail());

    expect(Object.keys(itinerary).toSorted()).toEqual([
      'coverImageUrl',
      'coverImages',
      'days',
      'description',
      'destinationCode',
      'id',
      'interests',
      'isPublic',
      'ownerId',
      'startDate',
      'title',
      'totalDistanceKm',
      'waypoints',
    ]);
  });
});

describe('toItinerary trường mới', () => {
  it('BE cũ chỉ có coverImageUrl thì coverImages = [coverImageUrl]', () => {
    const itinerary = toItinerary(itineraryDetailDto.parse(legacyDetailFixture));

    expect(itinerary.coverImages).toEqual(['https://cdn.tripory.vn/c.jpg']);
    expect(itinerary.coverImageUrl).toBe('https://cdn.tripory.vn/c.jpg');
    expect(itinerary.destinationCode).toBeNull();
    expect(itinerary.interests).toEqual([]);
  });

  it('BE mới giữ coverImageUrl của BE và đủ danh sách', () => {
    const itinerary = toItinerary(itineraryDetailDto.parse(itineraryDetailWithDestinationFixture));

    expect(itinerary.coverImageUrl).toBe('https://img.example/b.jpg');
    expect(itinerary.coverImages).toHaveLength(2);
    expect(itinerary.destinationCode).toBe('vn-da-nang');
    expect(itinerary.interests).toEqual(['nature', 'food-drink']);
  });

  it('coverImageUrl null thì lấy ảnh theo selectedCoverIndex', () => {
    const itinerary = toItinerary(
      detail({ coverImageUrl: null, coverImages: ['https://a.example/1.jpg', 'https://a.example/2.jpg'], selectedCoverIndex: 1 }),
    );

    expect(itinerary.coverImageUrl).toBe('https://a.example/2.jpg');
  });

  it.each([-1, 5])('selectedCoverIndex %i ngoài khoảng thì coverImageUrl null', (selectedCoverIndex) => {
    const itinerary = toItinerary(
      detail({ coverImageUrl: null, coverImages: ['https://a.example/1.jpg', 'https://a.example/2.jpg'], selectedCoverIndex }),
    );

    expect(itinerary.coverImageUrl).toBeNull();
  });

  it('lọc ảnh rỗng, khoảng trắng và trùng, giữ thứ tự', () => {
    const itinerary = toItinerary(
      detail({ coverImages: ['https://a.example/1.jpg', '', '  ', ' https://a.example/1.jpg ', 'https://a.example/2.jpg'] }),
    );

    expect(itinerary.coverImages).toEqual(['https://a.example/1.jpg', 'https://a.example/2.jpg']);
  });

  it('interests bỏ mã lạ, trùng và sắp theo danh mục', () => {
    const itinerary = toItinerary(detail({ interests: ['shopping', 'nature', 'zzz', 'nature'] }));

    expect(itinerary.interests).toEqual(['nature', 'shopping']);
  });

  it('destinationCode khoảng trắng thành null, mã lạ giữ nguyên', () => {
    expect(toItinerary(detail({ destinationCode: '  ' })).destinationCode).toBeNull();
    expect(toItinerary(detail({ destinationCode: 'vn-khong-co' })).destinationCode).toBe('vn-khong-co');
  });
});

describe('toWaypoint', () => {
  it('đổi longitude/latitude của BE thành coordinate đúng trục', () => {
    const waypoint = toWaypoint(waypointDto.parse(waypointJsonFixture));

    expect(waypoint.coordinate).toEqual({ latitude: 10.7798, longitude: 106.699 });
    expect(waypoint).toMatchObject({ id: waypointIdsFixture[2], dayNumber: 3, orderIndex: 1, name: 'Nhà thờ Đức Bà' });
  });

  it("address và notes '' hoặc null thành null", () => {
    const waypoint = toWaypoint(waypointDto.parse({ ...waypointJsonFixture, address: '', notes: '  ' }));

    expect(waypoint.address).toBeNull();
    expect(waypoint.notes).toBeNull();
  });

  it('giữ address và notes thật', () => {
    const waypoint = toWaypoint(waypointDto.parse({ ...waypointJsonFixture, address: '1 Phố', notes: 'Đi sớm' }));

    expect(waypoint.address).toBe('1 Phố');
    expect(waypoint.notes).toBe('Đi sớm');
  });

  it('chấp nhận tọa độ biên (đóng) và ném khi ngoài biên', () => {
    expect(toWaypoint(waypointDto.parse({ ...waypointJsonFixture, latitude: 90, longitude: -180 })).coordinate).toEqual({
      latitude: 90,
      longitude: -180,
    });
    expect(() => toWaypoint(waypointDto.parse({ ...waypointJsonFixture, latitude: 90.0001 }))).toThrow();
  });
});

describe('toSummary và toSummaryPage', () => {
  const summaryPage = pagedDto(itinerarySummaryDto);

  it('toSummary chỉ giữ field domain cần', () => {
    const summary = toSummary(itinerarySummaryDto.parse(itinerarySummaryJsonFixture));

    expect(summary).toEqual({
      id: itineraryIdFixture,
      title: 'Sài Gòn 3 ngày',
      coverImageUrl: null,
      destinationCode: null,
      startDate: '2026-10-12',
      isPublic: false,
      totalDistanceKm: 12.4,
    });
    expect(Object.isFrozen(summary)).toBe(true);
  });

  it('toSummary lấy điểm đến và ảnh đang chọn theo chỉ số khi coverImageUrl thiếu', () => {
    const summary = toSummary(
      itinerarySummaryDto.parse({
        ...itinerarySummaryJsonFixture,
        destinationCode: 'vn-da-nang',
        coverImages: ['https://img.example/a.jpg', 'https://img.example/b.jpg'],
        selectedCoverIndex: 1,
      }),
    );

    expect(summary.destinationCode).toBe('vn-da-nang');
    expect(summary.coverImageUrl).toBe('https://img.example/b.jpg');
  });

  it('toSummary ném khi id sai GUID', () => {
    expect(() => toSummary(itinerarySummaryDto.parse({ ...itinerarySummaryJsonFixture, id: 'x' }))).toThrow(
      'Id lịch trình trong phản hồi của BE không hợp lệ.',
    );
  });

  it('toSummaryPage trả { items, pageIndex, hasNextPage } và bỏ phần còn lại', () => {
    const page = toSummaryPage(summaryPage.parse(summaryPageJsonFixture));

    expect(Object.keys(page).toSorted()).toEqual(['hasNextPage', 'items', 'pageIndex']);
    expect(page.pageIndex).toBe(1);
    expect(page.hasNextPage).toBe(true);
    expect(page.items).toHaveLength(1);
    expect(Object.isFrozen(page)).toBe(true);
    expect(Object.isFrozen(page.items)).toBe(true);
  });

  it('một phần tử có id hỏng làm cả trang ném', () => {
    const broken = summaryPage.parse({
      ...summaryPageJsonFixture,
      items: [itinerarySummaryJsonFixture, { ...itinerarySummaryJsonFixture, id: 'hong' }],
    });

    expect(() => toSummaryPage(broken)).toThrow();
  });
});
