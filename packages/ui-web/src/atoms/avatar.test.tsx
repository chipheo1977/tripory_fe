import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Avatar } from './avatar';

it('render initials fallback với tên truy cập', () => {
  render(<Avatar name="Nguyễn An" />);
  const avatar = screen.getByRole('img', { name: 'Nguyễn An' });
  expect(avatar.textContent).toContain('NA');
  expect(avatar.className).toContain('rounded-pill');
});

it('render ảnh với alt theo ngữ cảnh', () => {
  render(<Avatar name="Nguyễn An" src="/avatar.jpg" alt="Ảnh Nguyễn An" />);
  expect(screen.getByRole('img', { name: 'Ảnh Nguyễn An' })).toBeTruthy();
});
