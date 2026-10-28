import { makeApiError } from '@tripory/api-client';
import type { HttpClient, HttpRequest } from '@tripory/api-client';
import { createWgs84Coordinate, parseItineraryId } from '@tripory/shared-kernel';
import type { ItineraryId, Wgs84Coordinate } from '@tripory/shared-kernel';
import { describe, expect, it, vi } from 'vitest';
import { parseCalendarDate } from '../domain';
import {
  itineraryDetailJsonFixture,
  itineraryIdFixture,
  summaryPageJsonFixture,
  waypointIdsFixture,
  waypointJsonFixture,
} from './fixtures';
import { createHttpItineraryRepository } from './http-itinerary-repository';

const fakeHttp = (reply: unknown = null) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };

  return { http, send };
};

const failingHttp = (error: unknown) => {
  const send = vi.fn<HttpClient['send']>(async () => {
    throw error;
  });
  const http: HttpClient = { send };

  return { http, send };
};

/** Request đã gửi ở lần gọi đầu tiên. */
const firstRequest = (send: ReturnType<typeof fakeHttp>['send']): HttpRequest => {
  const request = send.mock.calls[0]?.[0];

  if (request === undefined) throw new Error('send chưa được gọi');

  return request;
};

const itineraryId = parseItineraryId(itineraryIdFixture) as ItineraryId;
const coordinate = createWgs84Coordinate({ latitude: 10.7725, longitude: 106.7009 }) as Wgs84Coordinate;
const waypointId = waypointIdsFixture[0];
const startDate = parseCalendarDate('2026-10-12');

describe('createHttpItineraryRepository.listMine', () => {
  it("status 'all' bỏ isPublic khỏi query và truyền signal", async () => {
    const { http, send } = fakeHttp(summaryPageJsonFixture);
    const controller = new AbortController();

    const page = await createHttpItineraryRepository(http).listMine(
      { pageIndex: 1, pageSize: 12, status: 'all' },
      controller.signal,
    );

    expect(send).toHaveBeenCalledWith({
      method: 'GET',
      path: '/itineraries/mine',
      query: { pageIndex: 1, pageSize: 12, isPublic: undefined },
      signal: controller.signal,
    });
    expect(page).toMatchObject({ pageIndex: 1, hasNextPage: true });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.id).toBe(itineraryIdFixture);
  });

  it.each([
    ['draft', false],
    ['published', true],
  ] as const)("status '%s' map thành isPublic %s", async (status, isPublic) => {
    const { http, send } = fakeHttp(summaryPageJsonFixture);

    await createHttpItineraryRepository(http).listMine({ pageIndex: 2, pageSize: 12, status });

    expect(firstRequest(send).query).toEqual({ pageIndex: 2, pageSize: 12, isPublic });
  });

  it.each([
    ['data là null', null],
    ['thiếu items', { pageIndex: 1, pageSize: 12, totalCount: 0, hasNextPage: false }],
    ['hasNextPage không phải boolean', { ...summaryPageJsonFixture, hasNextPage: 'yes' }],
    [
      'updatedAt không offset trong dòng',
      { ...summaryPageJsonFixture, items: [{ ...summaryPageJsonFixture.items[0], createdAt: '2026-10-24T08:08:08' }] },
    ],
  ] as const)('body sai hình dạng (%s) thì ném lỗi', async (_name, reply) => {
    const { http } = fakeHttp(reply);

    await expect(
      createHttpItineraryRepository(http).listMine({ pageIndex: 1, pageSize: 12, status: 'all' }),
    ).rejects.toThrow();
  });
});

describe('createHttpItineraryRepository.getById', () => {
  it('GET /itineraries/{id}, truyền signal và trả Itinerary đã map, đã sắp', async () => {
    const { http, send } = fakeHttp(itineraryDetailJsonFixture);
    const controller = new AbortController();

    const itinerary = await createHttpItineraryRepository(http).getById(itineraryId, controller.signal);

    expect(send).toHaveBeenCalledWith({
      method: 'GET',
      path: `/itineraries/${itineraryIdFixture}`,
      signal: controller.signal,
    });
    expect(itinerary.id).toBe(itineraryIdFixture);
    expect(itinerary.days.map((day) => day.dayNumber)).toEqual([1, 3]);
    expect(itinerary.waypoints.map((waypoint) => waypoint.name)).toEqual([
      'Chợ Bến Thành',
      'Bưu điện Thành phố',
      'Dinh Độc Lập',
    ]);
  });

  it.each([
    ['data là null', null],
    ['updatedAt không có offset', { ...itineraryDetailJsonFixture, updatedAt: '2026-10-24T08:08:08' }],
    ['startDate không có thật', { ...itineraryDetailJsonFixture, startDate: '2026-02-29' }],
    ['thiếu waypoints', { ...itineraryDetailJsonFixture, waypoints: undefined }],
    ['id không phải GUID', { ...itineraryDetailJsonFixture, id: 'khong-phai-guid' }],
  ] as const)('body sai hình dạng (%s) thì ném lỗi', async (_name, reply) => {
    const { http } = fakeHttp(reply);

    await expect(createHttpItineraryRepository(http).getById(itineraryId)).rejects.toThrow();
  });
});

describe('createHttpItineraryRepository.create', () => {
  it('POST /itineraries chỉ với { title }, bỏ trường thừa của input, trả Itinerary', async () => {
    const { http, send } = fakeHttp(itineraryDetailJsonFixture);
    const withExtra = { title: 'Đà Lạt', isPublic: true, ownerId: 'x' };

    const itinerary = await createHttpItineraryRepository(http).create(withExtra);

    expect(send).toHaveBeenCalledWith({ method: 'POST', path: '/itineraries', body: { title: 'Đà Lạt' } });
    expect(Object.keys(firstRequest(send).body as object)).toEqual(['title']);
    expect(itinerary.id).toBe(itineraryIdFixture);
  });

  it('body sai hình dạng thì ném lỗi', async () => {
    const { http } = fakeHttp({ id: 'x' });

    await expect(createHttpItineraryRepository(http).create({ title: 'A' })).rejects.toThrow();
  });
});

describe('createHttpItineraryRepository: lệnh metadata', () => {
  it('updateMetadata PUT đúng 4 khóa, bỏ trường thừa, resolve undefined', async () => {
    const { http, send } = fakeHttp(null);
    const input = {
      title: 'Đà Lạt',
      description: null,
      startDate,
      coverImageUrl: 'https://cdn.tripory.vn/a.jpg',
      isPublic: true,
    };

    await expect(createHttpItineraryRepository(http).updateMetadata(itineraryId, input)).resolves.toBeUndefined();

    const request = firstRequest(send);
    expect(request.method).toBe('PUT');
    expect(request.path).toBe(`/itineraries/${itineraryIdFixture}`);
    expect(request.body).toEqual({
      title: 'Đà Lạt',
      description: null,
      startDate: '2026-10-12',
      coverImageUrl: 'https://cdn.tripory.vn/a.jpg',
    });
    expect(Object.keys(request.body as object).toSorted()).toEqual([
      'coverImageUrl',
      'description',
      'startDate',
      'title',
    ]);
  });

  it('publish PUT /publish và remove DELETE, không body', async () => {
    const publish = fakeHttp(null);
    const remove = fakeHttp(null);

    await expect(createHttpItineraryRepository(publish.http).publish(itineraryId)).resolves.toBeUndefined();
    await expect(createHttpItineraryRepository(remove.http).remove(itineraryId)).resolves.toBeUndefined();

    expect(publish.send).toHaveBeenCalledWith({ method: 'PUT', path: `/itineraries/${itineraryIdFixture}/publish` });
    expect(remove.send).toHaveBeenCalledWith({ method: 'DELETE', path: `/itineraries/${itineraryIdFixture}` });
  });
});

describe('createHttpItineraryRepository: điểm đến', () => {
  const fields = { name: 'Chợ Bến Thành', address: 'Lê Lợi', notes: null, coordinate };

  it('addWaypoint POST đúng 6 khóa (kèm dayNumber), bỏ trường thừa, trả Waypoint đã map', async () => {
    const { http, send } = fakeHttp(waypointJsonFixture);

    const waypoint = await createHttpItineraryRepository(http).addWaypoint(itineraryId, {
      ...fields,
      dayNumber: 3,
      draftKey: 'khong-gui',
    } as typeof fields & { dayNumber: number });

    const request = firstRequest(send);
    expect(request.method).toBe('POST');
    expect(request.path).toBe(`/itineraries/${itineraryIdFixture}/waypoints`);
    expect(request.body).toEqual({
      dayNumber: 3,
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi',
      latitude: 10.7725,
      longitude: 106.7009,
      notes: null,
    });
    expect(Object.keys(request.body as object).toSorted()).toEqual([
      'address',
      'dayNumber',
      'latitude',
      'longitude',
      'name',
      'notes',
    ]);
    expect(waypoint).toMatchObject({
      id: waypointIdsFixture[2],
      dayNumber: 3,
      orderIndex: 1,
      name: 'Nhà thờ Đức Bà',
      coordinate: { latitude: 10.7798, longitude: 106.699 },
    });
  });

  it('addWaypoint: body sai hình dạng hoặc tọa độ hỏng thì ném lỗi', async () => {
    const wrong = fakeHttp({ ...waypointJsonFixture, latitude: 95 });
    const missing = fakeHttp(null);
    const input = { ...fields, dayNumber: 1 };

    await expect(createHttpItineraryRepository(wrong.http).addWaypoint(itineraryId, input)).rejects.toThrow();
    await expect(createHttpItineraryRepository(missing.http).addWaypoint(itineraryId, input)).rejects.toThrow();
  });

  it('updateWaypoint PUT đúng 5 khóa, bỏ trường thừa, resolve undefined', async () => {
    const { http, send } = fakeHttp(null);

    await expect(
      createHttpItineraryRepository(http).updateWaypoint(itineraryId, waypointId, {
        ...fields,
        dayNumber: 2,
      } as typeof fields),
    ).resolves.toBeUndefined();

    const request = firstRequest(send);
    expect(request.method).toBe('PUT');
    expect(request.path).toBe(`/itineraries/${itineraryIdFixture}/waypoints/${waypointId}`);
    expect(request.body).toEqual({
      name: 'Chợ Bến Thành',
      address: 'Lê Lợi',
      latitude: 10.7725,
      longitude: 106.7009,
      notes: null,
    });
    expect(Object.keys(request.body as object).toSorted()).toEqual(['address', 'latitude', 'longitude', 'name', 'notes']);
  });

  it('deleteWaypoint mặc định dùng client chính, không keepalive', async () => {
    const main = fakeHttp(null);
    const unload = fakeHttp(null);

    await createHttpItineraryRepository(main.http, { unloadHttp: unload.http }).deleteWaypoint(itineraryId, waypointId);

    expect(main.send).toHaveBeenCalledWith({
      method: 'DELETE',
      path: `/itineraries/${itineraryIdFixture}/waypoints/${waypointId}`,
    });
    expect('keepalive' in firstRequest(main.send)).toBe(false);
    expect(unload.send).not.toHaveBeenCalled();
  });

  it('deleteWaypoint với { keepalive: true } dùng unloadHttp, keepalive và sessionRefresh: false (D-32)', async () => {
    const main = fakeHttp(null);
    const unload = fakeHttp(null);

    await createHttpItineraryRepository(main.http, { unloadHttp: unload.http }).deleteWaypoint(itineraryId, waypointId, {
      keepalive: true,
    });

    expect(unload.send).toHaveBeenCalledWith({
      method: 'DELETE',
      path: `/itineraries/${itineraryIdFixture}/waypoints/${waypointId}`,
      keepalive: true,
      sessionRefresh: false,
    });
    expect(main.send).not.toHaveBeenCalled();
  });

  it('deleteWaypoint keepalive không có unloadHttp thì rơi về client chính', async () => {
    const main = fakeHttp(null);

    await createHttpItineraryRepository(main.http).deleteWaypoint(itineraryId, waypointId, { keepalive: true });

    expect(main.send).toHaveBeenCalledWith(expect.objectContaining({ method: 'DELETE', keepalive: true, sessionRefresh: false }));
  });

  it('reorderWaypoints PUT /days/{n}/reorder-waypoints với { orderedWaypointIds }', async () => {
    const { http, send } = fakeHttp(null);

    await expect(
      createHttpItineraryRepository(http).reorderWaypoints(itineraryId, {
        dayNumber: 2,
        orderedIds: [waypointIdsFixture[1], waypointIdsFixture[0]],
      }),
    ).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledWith({
      method: 'PUT',
      path: `/itineraries/${itineraryIdFixture}/days/2/reorder-waypoints`,
      body: { orderedWaypointIds: [waypointIdsFixture[1], waypointIdsFixture[0]] },
    });
  });

  it('setDaySubtitle PUT /days/{n}/subtitle với { subtitle }, null khi xóa', async () => {
    const withText = fakeHttp(null);
    const cleared = fakeHttp(null);

    await createHttpItineraryRepository(withText.http).setDaySubtitle(itineraryId, 1, 'Phố cổ');
    await createHttpItineraryRepository(cleared.http).setDaySubtitle(itineraryId, 3, null);

    expect(withText.send).toHaveBeenCalledWith({
      method: 'PUT',
      path: `/itineraries/${itineraryIdFixture}/days/1/subtitle`,
      body: { subtitle: 'Phố cổ' },
    });
    expect(cleared.send).toHaveBeenCalledWith({
      method: 'PUT',
      path: `/itineraries/${itineraryIdFixture}/days/3/subtitle`,
      body: { subtitle: null },
    });
  });
});

describe('createHttpItineraryRepository: lỗi và cô lập', () => {
  it('ApiError của http.send lan nguyên (cùng tham chiếu) ở mọi lệnh', async () => {
    const error = makeApiError({ kind: 'http', status: 403, code: 'Itinerary.Forbidden', message: 'Không có quyền.' });
    const { http } = failingHttp(error);
    const repo = createHttpItineraryRepository(http);

    await expect(repo.listMine({ pageIndex: 1, pageSize: 12, status: 'all' })).rejects.toBe(error);
    await expect(repo.getById(itineraryId)).rejects.toBe(error);
    await expect(repo.create({ title: 'A' })).rejects.toBe(error);
    await expect(
      repo.updateMetadata(itineraryId, { title: 'A', description: null, startDate: null, coverImageUrl: null }),
    ).rejects.toBe(error);
    await expect(repo.publish(itineraryId)).rejects.toBe(error);
    await expect(repo.remove(itineraryId)).rejects.toBe(error);
    await expect(repo.addWaypoint(itineraryId, { name: 'A', address: null, notes: null, coordinate, dayNumber: 1 })).rejects.toBe(
      error,
    );
    await expect(repo.updateWaypoint(itineraryId, waypointId, { name: 'A', address: null, notes: null, coordinate })).rejects.toBe(
      error,
    );
    await expect(repo.deleteWaypoint(itineraryId, waypointId)).rejects.toBe(error);
    await expect(repo.reorderWaypoints(itineraryId, { dayNumber: 1, orderedIds: [] })).rejects.toBe(error);
    await expect(repo.setDaySubtitle(itineraryId, 1, null)).rejects.toBe(error);
  });

  it('mỗi repository chỉ gọi client của chính nó', async () => {
    const first = fakeHttp(itineraryDetailJsonFixture);
    const second = fakeHttp(itineraryDetailJsonFixture);

    await createHttpItineraryRepository(first.http).getById(itineraryId);

    expect(first.send).toHaveBeenCalledTimes(1);
    expect(second.send).not.toHaveBeenCalled();
  });
});
