import { isApiError } from '@tripory/api-client';
import type { HttpClient } from '@tripory/api-client';
import type { SocialRepository } from '../application';
import { commentDto, commentPageDto, likeStateDto } from './dto';
import { toComment, toCommentPage, toLikeState } from './mappers';
// adapter HTTP cho `SocialRepository` (05.1-BE-CONTRACT.md mục 4). client là `/api/bff` đã bọc refresh phiên.
// không log. mọi phản hồi qua Zod rồi mới tới mapper; body dựng từ field đặt tên cứng.
// xóa lại bình luận: BE trả 404 `Comment.NotFound`, phân biệt với `Itinerary.NotFound` bằng `code` (D-12).
// id đã chuẩn hóa GUID (`ItineraryId`, `CommentId`); BFF encode lại từng segment.
const itineraryPath = (id: string): string => `/itineraries/${id}`;

export function createHttpSocialRepository(http: HttpClient): SocialRepository {
  return {
    async getLike(id, signal) {
      const data = await http.send({ method: 'GET', path: `${itineraryPath(id)}/like`, signal });
      return toLikeState(likeStateDto.parse(data));
    },
    async like(id) {
      const data = await http.send({ method: 'PUT', path: `${itineraryPath(id)}/like` });
      return toLikeState(likeStateDto.parse(data));
    },
    async unlike(id) {
      const data = await http.send({ method: 'DELETE', path: `${itineraryPath(id)}/like` });
      return toLikeState(likeStateDto.parse(data));
    },
    async listComments(id, { pageIndex, pageSize }, signal) {
      const data = await http.send({
        method: 'GET',
        path: `${itineraryPath(id)}/comments`,
        query: { pageIndex, pageSize },
        signal,
      });
      return toCommentPage(commentPageDto.parse(data));
    },
    async addComment(id, content) {
      const data = await http.send({ method: 'POST', path: `${itineraryPath(id)}/comments`, body: { content } });
      return toComment(commentDto.parse(data));
    },
    async removeComment(id, commentId) {
      try {
        await http.send({ method: 'DELETE', path: `${itineraryPath(id)}/comments/${commentId}` });
        return 'removed';
      } catch (error) {
        if (isApiError(error) && error.code === 'Comment.NotFound') return 'already-removed';
        throw error;
      }
    },
  };
}
