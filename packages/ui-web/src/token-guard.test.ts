import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as publicUi from './index';
import { cn } from './lib/cn';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceRoots = [
  path.join(repoRoot, 'packages/ui-web/src/atoms'),
  path.join(repoRoot, 'packages/ui-web/src/molecules'),
  path.join(repoRoot, 'apps/web/src/components'),
];

const forbidden = [
  { name: 'màu hard-code', pattern: /#[\da-f]{3,8}|\b(?:rgb|hsl|oklch)\(/iu },
  { name: 'primitive token', pattern: /--primitive-/u },
  { name: 'Tailwind palette', pattern: /\b(?:text|bg|border|fill|stroke)-(?:zinc|slate|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/u },
  { name: 'spacing hoặc size số', pattern: /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|h|w|size|min-h|min-w)-(?!0\b)\d+\b/u },
  { name: 'spacing prop số', pattern: /\b(?:sideOffset|alignOffset|collisionPadding|arrowPadding)\s*=\s*\{\s*\d/u },
  { name: 'z-index số', pattern: /\bz-\d+\b/u },
  { name: 'duration số', pattern: /\bduration-\d+\b/u },
  { name: 'arbitrary unit', pattern: /-\[[\d.]+(?:px|rem|ms)\]/u },
  { name: 'dark variant', pattern: /\bdark:/u },
] as const;

export function findTokenViolations(source: string) {
  return forbidden.filter(({ pattern }) => pattern.test(source)).map(({ name }) => name);
}

function productionFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx'))
    .map((entry) => path.join(entry.parentPath, entry.name));
}

describe('semantic token guard', () => {
  const files = sourceRoots.flatMap(productionFiles);

  it.each(files)('%s chỉ dùng semantic/component tokens', (file) => {
    const violations = findTokenViolations(readFileSync(file, 'utf8'));
    expect(violations, `${path.relative(repoRoot, file)} vi phạm: ${violations.join(', ')}`).toEqual([]);
  });

  it('bắt mutation dùng Tailwind palette', () => {
    expect(findTokenViolations('className="text-zinc-600"')).toContain('Tailwind palette');
  });

  it('bắt mutation dùng numeric spacing prop', () => {
    expect(findTokenViolations('<Positioner sideOffset={8} />')).toContain('spacing prop số');
  });

  it('không có Storybook hoặc route showcase', () => {
    const manifests = productionFiles(path.join(repoRoot, 'apps')).filter((file) => file.endsWith('.stories.tsx'));
    expect(manifests).toEqual([]);
    expect(existsSync(path.join(repoRoot, 'apps/web/src/app/dev/ui'))).toBe(false);
    expect(readFileSync(path.join(repoRoot, 'package.json'), 'utf8').toLowerCase()).not.toContain('storybook');
  });
});

it('export đủ 13 atoms bằng named exports', () => {
  const names = ['Avatar', 'Badge', 'Button', 'Checkbox', 'Icon', 'IconButton', 'Input', 'Label', 'Separator', 'Skeleton', 'Spinner', 'Switch', 'Textarea'];
  expect(names.every((name) => name in publicUi)).toBe(true);
});

it('cn gộp conditional class và giải quyết Tailwind conflict', () => {
  expect(cn('bg-surface', false && 'hidden', 'bg-primary')).toBe('bg-primary');
});
