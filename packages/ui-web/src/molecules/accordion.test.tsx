import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from './accordion';

type ExampleProps = {
  initial?: string[];
  onChange?: (value: string[]) => void;
  invalidItem?: string;
  triggerRef?: ComponentProps<typeof AccordionTrigger>['ref'];
  keepMounted?: boolean;
  disabled?: boolean;
};

function Example({ initial = [], onChange, invalidItem, triggerRef, keepMounted, disabled }: ExampleProps) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <Accordion
      disabled={disabled}
      keepMounted={keepMounted}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      value={value}
    >
      {['a', 'b', 'c'].map((id) => (
        <AccordionItem key={id} value={id}>
          <AccordionTrigger
            invalid={invalidItem === id}
            ref={id === 'a' ? triggerRef : undefined}
            summary={`Tóm tắt ${id}`}
            title={`Khối ${id}`}
          />
          <AccordionPanel>
            <input aria-label={`Ô ${id}`} />
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

describe('Accordion', () => {
  it('chỉ mở một khối khi multiple mặc định', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={['a']} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Khối b/ }));
    expect(onChange).toHaveBeenLastCalledWith(['b']);
  });

  it('bấm khối đang mở thì đóng lại', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example initial={['a']} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /Khối a/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('trigger có aria-expanded và panel là region gắn nhãn bằng trigger', () => {
    render(<Example initial={['a']} />);
    const trigger = screen.getByRole('button', { name: /Khối a/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const region = screen.getByRole('region', { name: /Khối a/ });
    expect(region.id).toBe(panelId);
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(screen.getByRole('button', { name: /Khối b/ }).getAttribute('aria-expanded')).toBe('false');
  });

  it('keepMounted giữ panel đóng trong DOM với thuộc tính hidden', () => {
    render(<Example initial={['a']} keepMounted />);
    const closed = document.querySelector('[role="region"][hidden]');
    expect(closed).toBeTruthy();
  });

  it('panel đóng không nằm trong thứ tự Tab', async () => {
    const user = userEvent.setup();
    render(<Example initial={['a']} keepMounted />);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Khối a/ }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Ô a'));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Khối b/ }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Khối c/ }));
  });

  it('Enter và Space bật tắt khối', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Example onChange={onChange} />);
    screen.getByRole('button', { name: /Khối a/ }).focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['a']);
    await user.keyboard(' ');
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('dòng tóm tắt ẩn bằng CSS khi khối mở', () => {
    render(<Example initial={['a']} />);
    const open = screen.getByRole('button', { name: /Khối a/ });
    expect(open.hasAttribute('data-panel-open')).toBe(true);
    const summary = screen.getByText('Tóm tắt a');
    expect(summary.className).toContain('group-data-panel-open:hidden');
    expect(screen.getByRole('button', { name: /Khối b/ }).hasAttribute('data-panel-open')).toBe(false);
  });

  it('invalid đặt data-invalid trên trigger và đổi màu dòng tóm tắt', () => {
    render(<Example invalidItem="b" />);
    const trigger = screen.getByRole('button', { name: /Khối b/ });
    expect(trigger.hasAttribute('data-invalid')).toBe(true);
    expect(screen.getByText('Tóm tắt b').className).toContain('group-data-invalid:text-danger');
    expect(screen.getByRole('button', { name: /Khối a/ }).hasAttribute('data-invalid')).toBe(false);
  });

  it('ref của AccordionTrigger trỏ tới phần tử button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Example triggerRef={ref} />);
    expect(ref.current).toBe(screen.getByRole('button', { name: /Khối a/ }));
    expect(ref.current?.tagName).toBe('BUTTON');
  });

  it('disabled làm trigger có data-disabled', () => {
    render(<Example disabled />);
    expect(screen.getByRole('button', { name: /Khối a/ }).hasAttribute('data-disabled')).toBe(true);
  });
});
