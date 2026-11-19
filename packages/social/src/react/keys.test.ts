import { parseItineraryId } from '@tripory/shared-kernel';
import { describe, expect, it } from 'vitest';
import { socialKeys } from './keys';

const id = parseItineraryId('a1b2c3d4-0000-4000-8000-000000000001');
if (id === null) throw new Error('id mẫu phải hợp lệ');

describe('socialKeys', () => {
  it('gốc', () => {
    expect(socialKeys.all).toEqual(['social']);
  });
  it('like và khóa ghi like', () => {
    expect(socialKeys.like(id)).toEqual(['social', 'like', id]);
    expect(socialKeys.likeWrite(id)).toEqual(['social', 'like-write', id]);
  });
  it('comments và khóa ghi comment', () => {
    expect(socialKeys.comments(id)).toEqual(['social', 'comments', id]);
    expect(socialKeys.commentWrite(id)).toEqual(['social', 'comment-write', id]);
  });
});
