import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Label } from './label';
import { Textarea } from './textarea';

it('liên kết label, error và nhận nhập liệu', async () => {
  render(<><Label htmlFor="note">Ghi chú</Label><Textarea id="note" aria-invalid aria-describedby="note-error" /><p id="note-error">Cần thêm nội dung</p></>);
  const textarea = screen.getByRole('textbox', { name: 'Ghi chú' });
  await userEvent.setup().type(textarea, 'Nội dung');
  expect(textarea.getAttribute('aria-invalid')).toBe('true');
  expect(textarea.getAttribute('aria-describedby')).toBe('note-error');
  expect((textarea as HTMLTextAreaElement).value).toBe('Nội dung');
  expect(textarea.className).toContain('min-h-(--textarea-min-height)');
});
