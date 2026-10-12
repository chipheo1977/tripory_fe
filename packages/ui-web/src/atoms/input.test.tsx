import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Input } from './input';
import { Label } from './label';

it('liên kết label, error và nhận nhập liệu từ bàn phím', async () => {
  render(<><Label htmlFor="email">Email</Label><Input id="email" aria-invalid aria-describedby="email-error" /><p id="email-error">Email không hợp lệ</p></>);
  const input = screen.getByRole('textbox', { name: 'Email' });
  await userEvent.setup().type(input, 'a@b.com');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe('email-error');
  expect((input as HTMLInputElement).value).toBe('a@b.com');
});

it('hỗ trợ disabled và read-only', () => {
  render(<><Label htmlFor="name">Tên</Label><Input id="name" disabled /><Label htmlFor="code">Mã</Label><Input id="code" readOnly /></>);
  expect((screen.getByRole('textbox', { name: 'Tên' }) as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('textbox', { name: 'Mã' }) as HTMLInputElement).readOnly).toBe(true);
});
