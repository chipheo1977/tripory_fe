import type { HttpClient } from '@tripory/api-client';
import type { ShortLinkResolver } from '../application';
import { resolvedLinkDto } from './dto';

// Adapter HTTP cho `ShortLinkResolver`. Gọi route của chính app (`POST /api/maps/resolve`, plan 04-10) chứ không
// phải BE: việc theo redirect chạy phía server để tránh CORS và SSRF. Lỗi 422 `Maps.UnresolvableLink` lan ra
// dưới dạng `ApiError` nguyên vẹn để UI hiện thông báo; body sai hình dạng thì ném.

export function createHttpShortLinkResolver(http: HttpClient): ShortLinkResolver {
  return {
    async resolve(url, signal) {
      const data = await http.send({ method: 'POST', path: '/maps/resolve', body: { url }, signal });

      return resolvedLinkDto.parse(data).url;
    },
  };
}
