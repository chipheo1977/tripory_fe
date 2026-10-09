// Luật ranh giới cho monorepo tripory-fe.
// Nguồn quy tắc: ai-memories/tripory-fe--ddd-architecture.md (mục 5, 8).
// Self-test: packages/config/test/boundaries.test.ts. Sửa file này thì phải chạy `pnpm test`.
import { base } from './base.mjs';

const KERNEL = '@tripory/shared-kernel';
const API_CLIENT = '@tripory/api-client';

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Default-deny cho import: chỉ cho import tương đối ("./", "../") và các module trong
 * `allowed` (kèm subpath). Dùng `regex` vì pattern kiểu gitignore (`group`) không diễn đạt
 * được "mọi thứ trừ danh sách". Thêm thư viện vào tầng nào = sửa allowlist ở đây, có chủ đích.
 */
const allowOnly = (allowed) => ({
  regex: `^(?!${['\\.{1,2}(?:/|$)', ...allowed.map((name) => `${escapeRegex(name)}(?:/|$)`)].join('|')})`,
  message: `Chỉ được import tương đối${allowed.length > 0 ? ` và: ${allowed.join(', ')}` : ''}. Cần thư viện mới thì sửa allowlist trong packages/config/eslint/boundaries.mjs.`,
});

/** Chặn import chéo tầng. Pattern gitignore khớp theo đoạn đường dẫn, dùng cho import tương đối. */
const layer = (...names) => ({
  group: names.flatMap((name) => [`**/${name}`, `**/${name}/**`]),
  message: `Tầng này không được import tầng ${names.join(', ')} (ai-memories/tripory-fe--ddd-architecture.md, mục 5).`,
});

const noDeepImport = {
  group: ['@tripory/*/src', '@tripory/*/src/**'],
  message: 'Chỉ import package qua "exports": @tripory/<pkg>, /http, /react.',
};

const httpOnlyInComposition = {
  group: ['@tripory/*/http'],
  message: 'Chỉ src/composition/** được import adapter /http; UI dùng hook/use case do composition xuất ra.',
};

const BROWSER_GLOBALS = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator'];

/**
 * @param {object} options
 * @param {string[]} options.allowed  module ngoài (ngoài import tương đối) được phép
 * @param {string[]} [options.layers] tầng trong cùng package bị cấm import
 * @param {boolean} [options.pure]    domain/application/kernel: cấm thêm fetch, đồng hồ, ngẫu nhiên
 */
const rulesFor = ({ allowed, layers = [], pure = false }) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [allowOnly(allowed), noDeepImport, ...(layers.length > 0 ? [layer(...layers)] : [])] },
  ],
  'no-restricted-globals': [
    'error',
    ...BROWSER_GLOBALS.map((name) => ({
      name,
      message: 'Code dùng chung web + mobile: không dùng browser global; nhận qua deps.',
    })),
    ...(pure
      ? [{ name: 'fetch', message: 'domain/application không gọi mạng; I/O nằm ở infrastructure hoặc api-client.' }]
      : []),
  ],
  // `no-restricted-imports` chỉ kiểm import tĩnh; import() động sẽ lách được allowlist.
  'no-restricted-syntax': [
    'error',
    { selector: 'ImportExpression', message: 'Package không dùng import() động (lách allowlist); lazy-load ở app.' },
    ...(pure
      ? [
          {
            selector: "NewExpression[callee.name='Date'][arguments.length=0]",
            message: 'new Date() không tham số đọc đồng hồ hệ thống; truyền clock qua deps.',
          },
        ]
      : []),
  ],
  ...(pure
    ? {
        'no-restricted-properties': [
          'error',
          { object: 'Date', property: 'now', message: 'Truyền clock qua deps.' },
          { object: 'Math', property: 'random', message: 'Truyền bộ sinh id/số ngẫu nhiên qua deps.' },
        ],
      }
    : {}),
});

/** Một vùng = 2 block: mã nguồn, và file test (test được thêm `vitest` vào allowlist). */
const zone = (root, options) => [
  { files: [`${root}/**/*.{ts,tsx}`], ignores: [`${root}/**/*.test.{ts,tsx}`], rules: rulesFor(options) },
  {
    files: [`${root}/**/*.test.{ts,tsx}`],
    rules: rulesFor({ ...options, allowed: [...options.allowed, 'vitest'] }),
  },
];

/** Package bounded context: domain / application / infrastructure / react. */
export const contextPackage = () => [
  ...base,
  ...zone('src/domain', { allowed: [KERNEL], layers: ['application', 'infrastructure', 'react'], pure: true }),
  ...zone('src/application', { allowed: [KERNEL], layers: ['infrastructure', 'react'], pure: true }),
  ...zone('src/infrastructure', { allowed: [KERNEL, API_CLIENT, 'zod'], layers: ['react'] }),
  ...zone('src/react', { allowed: [KERNEL, 'react', '@tanstack/react-query'], layers: ['infrastructure'] }),
  // Barrel gốc chỉ phơi domain + application; infrastructure và react đi qua /http và /react.
  { files: ['src/index.ts'], rules: rulesFor({ allowed: [KERNEL], layers: ['infrastructure', 'react'], pure: true }) },
];

/** @tripory/shared-kernel: không phụ thuộc package nào. */
export const kernelPackage = () => [...base, ...zone('src', { allowed: [], pure: true })];

/** @tripory/api-client: chỉ phụ thuộc shared-kernel; được dùng fetch. */
export const httpPackage = () => [...base, ...zone('src', { allowed: [KERNEL] })];

/** Mỗi app thêm sau config sẵn của framework (eslint-config-next, ...). */
export const app = () => [
  { files: ['src/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport, httpOnlyInComposition] }] } },
  { files: ['src/composition/**/*.{ts,tsx}'], rules: { 'no-restricted-imports': ['error', { patterns: [noDeepImport] }] } },
];
