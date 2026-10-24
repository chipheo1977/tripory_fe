import { compile } from '@tailwindcss/node';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { overlayOffsetPx, sheetPeekMinPx, sheetSnapPoints } from './index';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const readSource = (file: string) => readFileSync(path.join(srcDir, file), 'utf8');

const declarations = (css: string) =>
  Object.fromEntries(
    [...css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );

const primitiveTokens = {
  '--primitive-neutral-0': '#FFFFFF',
  '--primitive-neutral-50': '#FAFAF9',
  '--primitive-neutral-100': '#F5F5F4',
  '--primitive-neutral-200': '#E7E5E4',
  '--primitive-neutral-300': '#D6D3D1',
  '--primitive-neutral-400': '#A8A29E',
  '--primitive-neutral-500': '#78716C',
  '--primitive-neutral-600': '#57534E',
  '--primitive-neutral-700': '#44403C',
  '--primitive-neutral-800': '#292524',
  '--primitive-neutral-900': '#1C1917',
  '--primitive-neutral-950': '#0C0A09',
  '--primitive-coral-50': '#FFF3EE',
  '--primitive-coral-100': '#FFE2D5',
  '--primitive-coral-200': '#FFC1AA',
  '--primitive-coral-300': '#FF9877',
  '--primitive-coral-400': '#F56F4B',
  '--primitive-coral-500': '#E15A37',
  '--primitive-coral-600': '#C44728',
  '--primitive-coral-700': '#A83C22',
  '--primitive-coral-800': '#84301D',
  '--primitive-coral-900': '#612418',
  '--primitive-red-50': '#FEF2F2',
  '--primitive-red-600': '#B42318',
  '--primitive-red-700': '#912018',
  '--primitive-green-50': '#ECFDF3',
  '--primitive-green-700': '#16794A',
  '--primitive-amber-50': '#FFFAEB',
  '--primitive-amber-700': '#B54708',
  '--primitive-space-1': '4px',
  '--primitive-space-2': '8px',
  '--primitive-space-4': '16px',
  '--primitive-space-6': '24px',
  '--primitive-space-8': '32px',
  '--primitive-space-12': '48px',
  '--primitive-space-16': '64px',
  '--primitive-font-size-1': '14px',
  '--primitive-font-size-2': '16px',
  '--primitive-font-size-3': '20px',
  '--primitive-font-size-4': '28px',
  '--primitive-font-weight-regular': '400',
  '--primitive-font-weight-semibold': '600',
  '--primitive-line-height-body': '1.5',
  '--primitive-line-height-heading': '1.2',
  '--primitive-letter-spacing-tight': '-0.02em',
  '--primitive-letter-spacing-normal': '0',
} as const;

const semanticTokens = {
  '--semantic-color-background': 'var(--primitive-neutral-50)',
  '--semantic-color-surface': 'var(--primitive-neutral-0)',
  '--semantic-color-surface-muted': 'var(--primitive-neutral-100)',
  '--semantic-color-surface-elevated': 'var(--primitive-neutral-0)',
  '--semantic-color-surface-inverse': 'var(--primitive-neutral-900)',
  '--semantic-color-text': 'var(--primitive-neutral-900)',
  '--semantic-color-text-muted': 'var(--primitive-neutral-600)',
  '--semantic-color-text-subtle': 'var(--primitive-neutral-500)',
  '--semantic-color-text-disabled': 'var(--primitive-neutral-400)',
  '--semantic-color-text-inverse': 'var(--primitive-neutral-0)',
  '--semantic-color-border': 'var(--primitive-neutral-200)',
  '--semantic-color-border-strong': 'var(--primitive-neutral-300)',
  '--semantic-color-input': 'var(--primitive-neutral-0)',
  '--semantic-color-placeholder': 'var(--primitive-neutral-500)',
  '--semantic-color-primary': 'var(--primitive-coral-600)',
  '--semantic-color-primary-hover': 'var(--primitive-coral-700)',
  '--semantic-color-primary-subtle': 'var(--primitive-coral-50)',
  '--semantic-color-primary-border': 'var(--primitive-coral-200)',
  '--semantic-color-primary-foreground': 'var(--primitive-neutral-0)',
  '--semantic-color-accent': 'var(--primitive-coral-600)',
  '--semantic-color-focus-ring': 'var(--primitive-coral-600)',
  '--semantic-color-danger': 'var(--primitive-red-600)',
  '--semantic-color-danger-hover': 'var(--primitive-red-700)',
  '--semantic-color-danger-subtle': 'var(--primitive-red-50)',
  '--semantic-color-success': 'var(--primitive-green-700)',
  '--semantic-color-success-subtle': 'var(--primitive-green-50)',
  '--semantic-color-warning': 'var(--primitive-amber-700)',
  '--semantic-color-warning-subtle': 'var(--primitive-amber-50)',
  '--semantic-color-overlay': 'rgb(12 10 9 / 48%)',
  '--semantic-space-inline-xs': 'var(--primitive-space-1)',
  '--semantic-space-inline-sm': 'var(--primitive-space-2)',
  '--semantic-space-control-gap': 'var(--primitive-space-2)',
  '--semantic-space-stack-sm': 'var(--primitive-space-2)',
  '--semantic-space-stack-md': 'var(--primitive-space-4)',
  '--semantic-space-stack-lg': 'var(--primitive-space-6)',
  '--semantic-space-section': 'var(--primitive-space-8)',
  '--semantic-space-page-block': 'var(--primitive-space-12)',
  '--semantic-space-page-block-wide': 'var(--primitive-space-16)',
  '--semantic-space-page-inline': 'var(--primitive-space-4)',
  '--semantic-space-page-inline-md': 'var(--primitive-space-6)',
  '--semantic-space-page-inline-lg': 'var(--primitive-space-8)',
  '--semantic-size-control-sm': '32px',
  '--semantic-size-control-md': '40px',
  '--semantic-size-control-lg': '48px',
  '--semantic-size-touch-min': '44px',
  '--semantic-size-content-sm': '640px',
  '--semantic-size-content-md': '768px',
  '--semantic-size-content-lg': '1200px',
  '--semantic-size-form': '400px',
  '--semantic-size-header': '64px',
  '--semantic-radius-none': '0px',
  '--semantic-radius-subtle': '4px',
  '--semantic-radius-control': '8px',
  '--semantic-radius-container': '8px',
  '--semantic-radius-overlay': '12px',
  '--semantic-radius-pill': '9999px',
  '--semantic-shadow-none': 'none',
  '--semantic-shadow-sm': '0 1px 2px rgb(12 10 9 / 6%)',
  '--semantic-shadow-md': '0 8px 24px rgb(12 10 9 / 10%)',
  '--semantic-shadow-overlay': '0 20px 48px rgb(12 10 9 / 16%)',
  '--semantic-z-base': '0',
  '--semantic-z-sticky': '20',
  '--semantic-z-dropdown': '40',
  '--semantic-z-overlay': '60',
  '--semantic-z-modal': '70',
  '--semantic-z-toast': '90',
  '--semantic-motion-duration-fast': '120ms',
  '--semantic-motion-duration-normal': '180ms',
  '--semantic-motion-duration-slow': '280ms',
  '--semantic-motion-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
  '--semantic-motion-ease-exit': 'cubic-bezier(0.4, 0, 1, 1)',
  '--semantic-breakpoint-sm': '640px',
  '--semantic-breakpoint-md': '768px',
  '--semantic-breakpoint-lg': '1024px',
  '--semantic-breakpoint-xl': '1280px',
  '--semantic-font-family-sans': 'var(--font-inter), system-ui, sans-serif',
  '--semantic-font-size-body': 'var(--primitive-font-size-2)',
  '--semantic-font-size-label': 'var(--primitive-font-size-1)',
  '--semantic-font-size-heading': 'var(--primitive-font-size-3)',
  '--semantic-font-size-display': 'var(--primitive-font-size-4)',
  '--semantic-font-weight-regular': 'var(--primitive-font-weight-regular)',
  '--semantic-font-weight-semibold': 'var(--primitive-font-weight-semibold)',
  '--semantic-line-height-body': 'var(--primitive-line-height-body)',
  '--semantic-line-height-heading': 'var(--primitive-line-height-heading)',
  '--semantic-letter-spacing-normal': 'var(--primitive-letter-spacing-normal)',
  '--semantic-letter-spacing-tight': 'var(--primitive-letter-spacing-tight)',
} as const;

describe('design token inventory', () => {
  it('khai báo đúng toàn bộ primitive token đã duyệt', () => {
    expect(declarations(readSource('primitives.css'))).toEqual(primitiveTokens);
  });

  it('khai báo đúng toàn bộ semantic token light đã duyệt', () => {
    expect(declarations(readSource('semantic.css'))).toEqual(semanticTokens);
  });

  it('không để semantic token tự tham chiếu', () => {
    for (const [name, value] of Object.entries(declarations(readSource('semantic.css')))) {
      expect(value, `${name} không được tự tham chiếu`).not.toContain(`var(${name})`);
    }
  });

  it('giữ dark slot đầy đủ nhưng chưa kích hoạt qua public entry', () => {
    const darkCss = readSource('dark.css');
    const darkTokens = declarations(darkCss);

    expect(darkCss).toContain('[data-theme="dark"]');
    expect(Object.keys(darkTokens).sort()).toEqual(Object.keys(semanticTokens).sort());
    expect(readSource('index.css')).not.toContain('dark.css');
  });

  it('khai báo đúng component contract của Sheet và UserMenu', () => {
    expect(declarations(readSource('components.css'))).toEqual({
      '--sheet-side-width': 'min(400px, 100vw - 48px)',
      '--sheet-snap-peek': 'max(160px, 25dvh)',
      '--sheet-snap-medium': '60dvh',
      '--sheet-snap-expanded': 'calc(92dvh - env(safe-area-inset-top))',
      '--user-menu-name-max-width': '160px',
    });
  });

  it('nối --semantic-size-form sang utility max-w-form', async () => {
    expect(readSource('theme.css')).toContain('--spacing-form: var(--semantic-size-form);');

    const compiler = await compile('@import "tailwindcss"; @import "./index.css";', {
      base: srcDir,
      onDependency: () => undefined,
    });
    const css = compiler.build(['max-w-form']);

    expect(css).toContain('.max-w-form');
    expect(css).toContain('max-width: var(--semantic-size-form)');
  });
});

describe('Tailwind theme contract', () => {
  it('biên dịch semantic utilities và loại palette mặc định', async () => {
    const compiler = await compile('@import "tailwindcss"; @import "./index.css";', {
      base: srcDir,
      onDependency: () => undefined,
    });
    const css = compiler.build([
      'bg-primary',
      'text-zinc-600',
      'rounded-control',
      'shadow-overlay',
      'p-stack-md',
      'text-body',
      'font-semibold',
      'md:flex',
    ]);

    expect(css).toContain('.bg-primary');
    expect(css).toContain('background-color: var(--semantic-color-primary)');
    expect(css).toContain('.rounded-control');
    expect(css).toContain('border-radius: var(--semantic-radius-control)');
    expect(css).toContain('.p-stack-md');
    expect(css).toContain('padding: var(--semantic-space-stack-md)');
    expect(css).not.toContain('.text-zinc-600');
  });

  it('reset namespace mặc định và giữ breakpoint dạng literal', () => {
    const themeCss = readSource('theme.css');

    for (const namespace of ['color', 'radius', 'shadow', 'font', 'text', 'font-weight', 'breakpoint']) {
      expect(themeCss, `thiếu reset namespace ${namespace}`).toContain(`--${namespace}-*: initial;`);
    }
    expect(themeCss).toContain('--breakpoint-sm: 640px;');
    expect(themeCss).toContain('--breakpoint-md: 768px;');
    expect(themeCss).toContain('--breakpoint-lg: 1024px;');
    expect(themeCss).toContain('--breakpoint-xl: 1280px;');
    expect(themeCss).not.toMatch(/--breakpoint-[a-z]+:\s*var\(/);
  });

  it('đối chiếu CSS Sheet contract với hằng TypeScript', () => {
    const componentTokens = declarations(readSource('components.css'));

    expect(overlayOffsetPx).toBe(8);
    expect(sheetSnapPoints).toEqual({ peek: 0.25, medium: 0.6, expanded: 0.92 });
    expect(sheetPeekMinPx).toBe(160);
    expect(componentTokens['--sheet-snap-peek']).toBe(`max(${sheetPeekMinPx}px, ${sheetSnapPoints.peek * 100}dvh)`);
    expect(componentTokens['--sheet-snap-medium']).toBe(`${sheetSnapPoints.medium * 100}dvh`);
    expect(componentTokens['--sheet-snap-expanded']).toContain(`${sheetSnapPoints.expanded * 100}dvh`);
  });
});
