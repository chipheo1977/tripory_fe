import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ToggleChip, ToggleChipGroup } from './toggle-chip';

type ExampleProps = { onChange?: (value: string[]) => void; disabled?: boolean };

function Example({ onChange, disabled }: ExampleProps) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <ToggleChipGroup
      aria-label="Sở thích"
      disabled={disabled}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      value={value}
    >
      <ToggleChip value="nature">Thiên nhiên</ToggleChip>
      <ToggleChip value="shopping">Mua sắm</ToggleChip>
      <ToggleChip value="other">Khác</ToggleChip>
    </ToggleChipGroup>
  );
}

describe('ToggleChipGroup', () => {
  it('aria-pressed đổi từ false sang true khi bấm', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const chip = screen.getByRole('button', { name: 'Thiên nhiên' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    await user.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });

  it('chọn nhiều chip, giá trị theo thứ tự bấm', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Mua sắm' }));
    await user.click(screen.getByRole('button', { name: 'Thiên nhiên' }));
    expect(onChange).toHaveBeenLastCalledWith(['shopping', 'nature']);
  });

  it('mũi tên di chuyển focus mà không đổi trạng thái bật', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const first = screen.getByRole('button', { name: 'Thiên nhiên' });
    const second = screen.getByRole('button', { name: 'Mua sắm' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-pressed')).toBe('false');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(first);
  });

  it('Space và Enter bật tắt chip', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const chip = screen.getByRole('button', { name: 'Khác' });
    chip.focus();
    await user.keyboard(' ');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard('{Enter}');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });

  it('chip bật có data-pressed và icon tích hiện bằng CSS', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const chip = screen.getByRole('button', { name: 'Thiên nhiên' });
    await user.click(chip);
    expect(chip.hasAttribute('data-pressed')).toBe(true);
    const icon = chip.querySelector('svg');
    expect(icon?.getAttribute('class')).toContain('group-data-pressed:inline-flex');
  });

  it('disabled trên nhóm chặn đổi giá trị', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example disabled onChange={onChange} />);
    const chip = screen.getByRole('button', { name: 'Thiên nhiên' });
    expect(chip.hasAttribute('data-disabled')).toBe(true);
    await user.click(chip);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Tab vào nhóm chỉ dừng một lần', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Sau nhóm</button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Thiên nhiên' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sau nhóm' }));
  });
});
