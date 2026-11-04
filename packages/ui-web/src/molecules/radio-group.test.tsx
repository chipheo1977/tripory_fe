import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Radio, RadioGroup } from './radio-group';

type ExampleProps = {
  initial?: string | null;
  onValueChange?: (value: string) => void;
  onClick?: () => void;
  onKeyDown?: (key: string) => void;
};

function Example({ initial = null, onValueChange, onClick, onKeyDown }: ExampleProps) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <RadioGroup
      aria-label="Điểm đến"
      onValueChange={(next) => {
        setValue(next as string);
        onValueChange?.(next as string);
      }}
      value={value}
    >
      {['a', 'b', 'c'].map((id) => (
        <Radio
          aria-label={`Mục ${id}`}
          className={`mau-${id}`}
          key={id}
          onClick={onClick}
          onKeyDown={(event) => onKeyDown?.(event.key)}
          value={id}
        >
          {id}
        </Radio>
      ))}
    </RadioGroup>
  );
}

describe('RadioGroup', () => {
  it('Tab vào nhóm dừng một lần, ở mục đầu khi chưa chọn', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Example />
        <button type="button">Sau</button>
      </>,
    );
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Mục a' }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sau' }));
  });

  it('Tab vào nhóm dừng ở mục đang chọn', async () => {
    const user = userEvent.setup();
    render(<Example initial="b" />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Mục b' }));
  });

  it('mũi tên đổi lựa chọn và aria-checked', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example initial="a" onValueChange={onValueChange} />);
    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    expect(screen.getByRole('radio', { name: 'Mục b' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radio', { name: 'Mục a' }).getAttribute('aria-checked')).toBe('false');
  });

  it('Space chọn, Enter không chọn', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Example onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'Mục b' }).focus();
    await user.keyboard('{Enter}');
    expect(onValueChange).not.toHaveBeenCalled();
    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenCalledWith('b');
  });

  it('onClick chạy khi bấm chuột và Space nhưng không chạy khi đổi bằng mũi tên', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Example initial="a" onClick={onClick} />);
    await user.click(screen.getByRole('radio', { name: 'Mục c' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    const afterSpace = onClick.mock.calls.length;
    await user.keyboard('{ArrowUp}');
    expect(onClick).toHaveBeenCalledTimes(afterSpace);
  });

  it('onKeyDown của Radio nhận Enter', async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Example onKeyDown={onKeyDown} />);
    screen.getByRole('radio', { name: 'Mục a' }).focus();
    await user.keyboard('{Enter}');
    expect(onKeyDown).toHaveBeenCalledWith('Enter');
  });

  it('value null là controlled chưa chọn', () => {
    render(<Example initial={null} />);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }
  });

  it('className và aria-label đi qua, ref trỏ tới phần tử', () => {
    render(<Example />);
    const radio = screen.getByRole('radio', { name: 'Mục a' });
    expect(radio.className).toContain('mau-a');
    const ref = createRef<HTMLSpanElement>();
    render(
      <RadioGroup aria-label="Nhóm khác" value={null}>
        <Radio aria-label="X" ref={ref} value="x" />
      </RadioGroup>,
    );
    expect(ref.current).toBe(screen.getByRole('radio', { name: 'X' }));
  });
});
