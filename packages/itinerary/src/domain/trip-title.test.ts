import { describe, expect, it } from 'vitest';
import {
  defaultTripTitle,
  initialTripTitle,
  onDestinationChanged,
  onTitleBlur,
  onTitleInput,
} from './trip-title';

describe('defaultTripTitle', () => {
  it('chưa có điểm đến thì là "Chuyến đi mới"', () => {
    expect(defaultTripTitle(null)).toBe('Chuyến đi mới');
    expect(defaultTripTitle('   ')).toBe('Chuyến đi mới');
  });

  it('có điểm đến thì ghép tên', () => {
    expect(defaultTripTitle('Đà Nẵng')).toBe('Chuyến đi Đà Nẵng');
  });
});

describe('TripTitleState', () => {
  it('khởi tạo là tên mặc định, chưa sửa', () => {
    expect(initialTripTitle()).toEqual({ title: 'Chuyến đi mới', edited: false });
  });

  it('đổi điểm đến khi chưa sửa thì tên đổi theo', () => {
    const next = onDestinationChanged(initialTripTitle(), 'Đà Nẵng');
    expect(next).toEqual({ title: 'Chuyến đi Đà Nẵng', edited: false });
  });

  it('đã sửa thì đổi điểm đến giữ nguyên tên', () => {
    const edited = onTitleInput(initialTripTitle(), 'Tên riêng', 'Đà Nẵng');
    expect(edited.edited).toBe(true);
    expect(onDestinationChanged(edited, 'Lâm Đồng')).toBe(edited);
  });

  it('gõ lại đúng tên mặc định thì cờ đã sửa tắt', () => {
    const state = onTitleInput(initialTripTitle(), 'Chuyến đi Đà Nẵng', 'Đà Nẵng');
    expect(state.edited).toBe(false);
  });

  it('rời ô khi xóa trắng thì điền lại mặc định', () => {
    const blank = onTitleInput(initialTripTitle(), '   ', 'Lâm Đồng');
    expect(onTitleBlur(blank, 'Lâm Đồng')).toEqual({ title: 'Chuyến đi Lâm Đồng', edited: false });
  });

  it('rời ô khi có chữ thì trả đúng tham chiếu cũ', () => {
    const state = onTitleInput(initialTripTitle(), 'Có chữ', null);
    expect(onTitleBlur(state, null)).toBe(state);
  });
});
