import type { HttpClient } from '@tripory/api-client';
import type { ItineraryRepository } from '../application';
import { itineraryDetailDto, summaryPageDto, waypointDto } from './dto';
import { toItinerary, toSummaryPage, toWaypoint } from './mappers';

// Adapter HTTP cho `ItineraryRepository`. Không giữ state toàn cục: mọi thứ đi qua `HttpClient` được tiêm.
//
// Client chính là `/api/bff` (composition đã bọc `withSessionRefresh`), nên lệnh nào cũng được refresh rồi phát
// lại khi gặp 401 `session.expired`. Ngoại lệ duy nhất là xóa điểm đến lúc trang đang đóng (D-32): đi qua
// `unloadHttp` với `keepalive: true` và `sessionRefresh: false`, vì refresh lúc unload không kịp hoàn tất. Nếu
// access token đã stale thì BFF trả 401 và lệnh mất, đó là rủi ro đã chấp nhận (T-04-19).
//
// Body gọi đi luôn dựng từ field đặt tên cứng thay vì chép nguyên input, để trường thừa của form không bao giờ
// ra khỏi trình duyệt (T-04-18). Mọi phản hồi có dữ liệu đều qua Zod rồi mới tới mapper (T-04-17).
// `id` đã chuẩn hóa GUID (`ItineraryId`), `waypointId` lấy từ dữ liệu BE; BFF encode lại từng segment (T-04-20).

const itineraryPath = (id: string): string => `/itineraries/${id}`;

export function createHttpItineraryRepository(
  http: HttpClient,
  deps: Readonly<{ unloadHttp?: HttpClient }> = {},
): ItineraryRepository {
  return {
    async listMine({ pageIndex, pageSize, status }, signal) {
      // `all` bỏ isPublic khỏi query (undefined bị client bỏ); BE hiểu thiếu là cả hai trạng thái.
      const isPublic = status === 'all' ? undefined : status === 'published';
      const data = await http.send({
        method: 'GET',
        path: '/itineraries/mine',
        query: { pageIndex, pageSize, isPublic },
        signal,
      });

      return toSummaryPage(summaryPageDto.parse(data));
    },

    async getById(id, signal) {
      const data = await http.send({ method: 'GET', path: itineraryPath(id), signal });

      return toItinerary(itineraryDetailDto.parse(data));
    },

    async create({ title, destinationCode, dayCount, startDate, interests }) {
      const data = await http.send({
        method: 'POST',
        path: '/itineraries',
        body: { title, destinationCode, dayCount, startDate, interests: [...interests] },
      });

      return toItinerary(itineraryDetailDto.parse(data));
    },

    async updateMetadata(id, { title, description, startDate, coverImages, selectedCoverIndex }) {
      await http.send({
        method: 'PUT',
        path: itineraryPath(id),
        body: { title, description, startDate, coverImages: [...coverImages], selectedCoverIndex },
      });
    },

    async publish(id) {
      await http.send({ method: 'PUT', path: `${itineraryPath(id)}/publish` });
    },

    async remove(id) {
      await http.send({ method: 'DELETE', path: itineraryPath(id) });
    },

    async addWaypoint(id, { dayNumber, name, address, notes, coordinate }) {
      const data = await http.send({
        method: 'POST',
        path: `${itineraryPath(id)}/waypoints`,
        body: {
          dayNumber,
          name,
          address,
          longitude: coordinate.longitude,
          latitude: coordinate.latitude,
          notes,
        },
      });

      return toWaypoint(waypointDto.parse(data));
    },

    async updateWaypoint(id, waypointId, { name, address, notes, coordinate }) {
      await http.send({
        method: 'PUT',
        path: `${itineraryPath(id)}/waypoints/${waypointId}`,
        body: { name, address, longitude: coordinate.longitude, latitude: coordinate.latitude, notes },
      });
    },

    async deleteWaypoint(id, waypointId, options) {
      const path = `${itineraryPath(id)}/waypoints/${waypointId}`;

      if (options?.keepalive === true) {
        await (deps.unloadHttp ?? http).send({ method: 'DELETE', path, keepalive: true, sessionRefresh: false });

        return;
      }

      await http.send({ method: 'DELETE', path });
    },

    async reorderWaypoints(id, { dayNumber, orderedIds }) {
      await http.send({
        method: 'PUT',
        path: `${itineraryPath(id)}/days/${dayNumber}/reorder-waypoints`,
        body: { orderedWaypointIds: [...orderedIds] },
      });
    },

    async setDaySubtitle(id, dayNumber, subtitle) {
      await http.send({ method: 'PUT', path: `${itineraryPath(id)}/days/${dayNumber}/subtitle`, body: { subtitle } });
    },
  };
}
