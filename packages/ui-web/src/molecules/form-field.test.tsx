import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Input } from '../atoms/input';
import { FormField, FormFieldDescription, FormFieldError, FormFieldLabel } from './form-field';

it('liên kết label, description và live error với control', () => {
  render(
    <FormField invalid>
      <FormFieldLabel required>Email</FormFieldLabel>
      <Input required />
      <FormFieldDescription>Dùng để nhận xác nhận.</FormFieldDescription>
      <FormFieldError match>Email không hợp lệ.</FormFieldError>
    </FormField>,
  );

  const input = screen.getByRole('textbox', { name: /Email/ });
  const description = screen.getByText('Dùng để nhận xác nhận.');
  const error = screen.getByRole('status');
  const describedBy = input.getAttribute('aria-describedby')?.split(' ') ?? [];

  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect((input as HTMLInputElement).required).toBe(true);
  expect(screen.getByText('(bắt buộc)')).toBeTruthy();
  expect(error.textContent).toBe('Email không hợp lệ.');
  expect(error.getAttribute('aria-live')).toBe('polite');
  expect(describedBy).toContain(description.id);
  expect(describedBy).toContain(error.id);
});

it('không render error khi điều kiện match không thỏa', () => {
  render(
    <FormField>
      <FormFieldLabel>Tên</FormFieldLabel>
      <Input />
      <FormFieldError match={false}>Không hợp lệ.</FormFieldError>
    </FormField>,
  );

  expect(screen.getByRole('textbox', { name: 'Tên' }).getAttribute('aria-invalid')).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
});
