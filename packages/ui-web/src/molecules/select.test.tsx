import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectItemText,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './select';

function ExampleSelect({ disabled = false, loading = false }: { disabled?: boolean; loading?: boolean }) {
  return (
    <Select defaultValue="hue" disabled={disabled}>
      <SelectLabel>Điểm đến</SelectLabel>
      <SelectTrigger loading={loading}>
        <SelectValue placeholder="Chọn điểm đến" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectGroupLabel>Miền Trung</SelectGroupLabel>
          <SelectItem value="hue"><SelectItemText>Huế</SelectItemText></SelectItem>
          <SelectItem value="danang"><SelectItemText>Đà Nẵng</SelectItemText></SelectItem>
        </SelectGroup>
        <SelectGroup>
          <SelectGroupLabel>Miền Nam</SelectGroupLabel>
          <SelectItem value="hcm"><SelectItemText>TP Hồ Chí Minh</SelectItemText></SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

it('có label, value và trạng thái loading/disabled', () => {
  const { rerender } = render(<ExampleSelect loading />);
  const trigger = screen.getByRole('combobox', { name: 'Điểm đến' });
  expect(trigger.textContent).toContain('Huế');
  expect(trigger.getAttribute('aria-busy')).toBe('true');

  rerender(<ExampleSelect disabled />);
  expect((screen.getByRole('combobox', { name: 'Điểm đến' }) as HTMLButtonElement).disabled).toBe(true);
});

it('mở, điều hướng Home/End, chọn bằng Enter và trả focus khi đóng', async () => {
  const user = userEvent.setup();
  render(<ExampleSelect />);
  const trigger = screen.getByRole('combobox', { name: 'Điểm đến' });

  trigger.focus();
  await user.keyboard('{ArrowDown}');
  expect(await screen.findByRole('listbox')).toBeTruthy();
  await user.keyboard('{End}{Enter}');
  expect(trigger.textContent).toContain('TP Hồ Chí Minh');
  expect(document.activeElement).toBe(trigger);

  await user.keyboard('{Enter}');
  expect(await screen.findByRole('listbox')).toBeTruthy();
  await user.keyboard('{Home}{Escape}');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
