// Self-test của lớp cưỡng chế: chạy ESLint thật bằng chính eslint.config.mjs của từng package/app
// trên đoạn mã cố ý sai. Nếu sửa preset hoặc nâng ESLint làm rule âm thầm ngừng bắt lỗi,
// test này vỡ trước khi vi phạm lọt vào code thật.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint, type Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

const engines = new Map<string, ESLint>();

async function lint(dir: string, file: string, code: string): Promise<Linter.LintMessage[]> {
  let engine = engines.get(dir);
  if (!engine) {
    engine = new ESLint({ cwd: path.join(repoRoot, dir) });
    engines.set(dir, engine);
  }
  const [result] = await engine.lintText(code, { filePath: path.join(repoRoot, dir, file) });
  return result?.messages ?? [];
}

type Violation = { rule: string; includes: string };

type Case = {
  name: string;
  dir: string;
  file: string;
  code: string;
  /** Mỗi mục phải có ít nhất một message khớp ruleId và chứa chuỗi `includes`. */
  violations: Violation[];
};

const imp = (includes: string): Violation => ({ rule: 'no-restricted-imports', includes });

const itinerary = 'packages/itinerary';
const kernel = 'packages/shared-kernel';
const apiClient = 'packages/api-client';
const web = 'apps/web';

const bad: Case[] = [
  // domain
  { name: 'domain: react', dir: itinerary, file: 'src/domain/x.ts', code: "import React from 'react';\nexport const x = React;", violations: [imp("'react'")] },
  { name: 'domain: import type cũng bị chặn', dir: itinerary, file: 'src/domain/x.ts', code: "import type { FC } from 'react';\nexport type X = FC;", violations: [imp("'react'")] },
  { name: 'domain: thư viện ngoài allowlist (default-deny)', dir: itinerary, file: 'src/domain/x.ts', code: "import lodash from 'lodash';\nexport const x = lodash;", violations: [imp("'lodash'")] },
  { name: 'domain: tầng infrastructure', dir: itinerary, file: 'src/domain/x.ts', code: "import { r } from '../infrastructure/repo';\nexport const x = r;", violations: [imp("'../infrastructure/repo'")] },
  { name: 'domain: tầng application', dir: itinerary, file: 'src/domain/x.ts', code: "import { u } from '../application';\nexport const x = u;", violations: [imp("'../application'")] },
  { name: 'domain: re-export tầng infrastructure', dir: itinerary, file: 'src/domain/x.ts', code: "export * from '../infrastructure';", violations: [imp("'../infrastructure'")] },
  { name: 'domain: context khác', dir: itinerary, file: 'src/domain/x.ts', code: "import chat from '@tripory/chat';\nexport const x = chat;", violations: [imp("'@tripory/chat'")] },
  { name: 'domain: api-client', dir: itinerary, file: 'src/domain/x.ts', code: "import client from '@tripory/api-client';\nexport const x = client;", violations: [imp("'@tripory/api-client'")] },
  { name: 'domain: import sâu vào src của package khác', dir: itinerary, file: 'src/domain/x.ts', code: "import k from '@tripory/shared-kernel/src/index';\nexport const x = k;", violations: [imp("'@tripory/shared-kernel/src/index'")] },
  { name: 'domain: import() động', dir: itinerary, file: 'src/domain/x.ts', code: "export const load = () => import('react');", violations: [{ rule: 'no-restricted-syntax', includes: 'import()' }] },
  { name: 'domain: Date.now', dir: itinerary, file: 'src/domain/x.ts', code: 'export const t = Date.now();', violations: [{ rule: 'no-restricted-properties', includes: 'Date.now' }] },
  { name: 'domain: Math.random', dir: itinerary, file: 'src/domain/x.ts', code: 'export const r = Math.random();', violations: [{ rule: 'no-restricted-properties', includes: 'Math.random' }] },
  { name: 'domain: new Date() không tham số', dir: itinerary, file: 'src/domain/x.ts', code: 'export const d = new Date();', violations: [{ rule: 'no-restricted-syntax', includes: 'new Date()' }] },
  { name: 'domain: window', dir: itinerary, file: 'src/domain/x.ts', code: 'export const w = window.location;', violations: [{ rule: 'no-restricted-globals', includes: "'window'" }] },
  { name: 'domain: fetch', dir: itinerary, file: 'src/domain/x.ts', code: "export const f = () => fetch('/x');", violations: [{ rule: 'no-restricted-globals', includes: "'fetch'" }] },
  { name: 'domain: file test vẫn không được import react', dir: itinerary, file: 'src/domain/x.test.ts', code: "import React from 'react';\nexport const x = React;", violations: [imp("'react'")] },
  // application
  { name: 'application: tầng infrastructure', dir: itinerary, file: 'src/application/x.ts', code: "import { r } from '../infrastructure/repo';\nexport const x = r;", violations: [imp("'../infrastructure/repo'")] },
  { name: 'application: tầng react', dir: itinerary, file: 'src/application/x.ts', code: "import { h } from '../react/hooks';\nexport const x = h;", violations: [imp("'../react/hooks'")] },
  { name: 'application: context khác (react)', dir: itinerary, file: 'src/application/x.ts', code: "import c from '@tripory/chat/react';\nexport const x = c;", violations: [imp("'@tripory/chat/react'")] },
  { name: 'application: Date.now', dir: itinerary, file: 'src/application/x.ts', code: 'export const t = Date.now();', violations: [{ rule: 'no-restricted-properties', includes: 'Date.now' }] },
  // infrastructure
  { name: 'infrastructure: next/*', dir: itinerary, file: 'src/infrastructure/x.ts', code: "import { cookies } from 'next/headers';\nexport const x = cookies;", violations: [imp("'next/headers'")] },
  { name: 'infrastructure: server-only', dir: itinerary, file: 'src/infrastructure/x.ts', code: "import 'server-only';", violations: [imp("'server-only'")] },
  { name: 'infrastructure: tầng react', dir: itinerary, file: 'src/infrastructure/x.ts', code: "import { h } from '../react';\nexport const x = h;", violations: [imp("'../react'")] },
  { name: 'infrastructure: context khác', dir: itinerary, file: 'src/infrastructure/x.ts', code: "import c from '@tripory/chat';\nexport const x = c;", violations: [imp("'@tripory/chat'")] },
  { name: 'infrastructure: localStorage', dir: itinerary, file: 'src/infrastructure/x.ts', code: "export const t = localStorage.getItem('token');", violations: [{ rule: 'no-restricted-globals', includes: "'localStorage'" }] },
  // react (hooks dùng chung web + mobile)
  { name: 'react: react-dom', dir: itinerary, file: 'src/react/x.ts', code: "import { createPortal } from 'react-dom';\nexport const x = createPortal;", violations: [imp("'react-dom'")] },
  { name: 'react: react-native', dir: itinerary, file: 'src/react/x.ts', code: "import { Platform } from 'react-native';\nexport const x = Platform;", violations: [imp("'react-native'")] },
  { name: 'react: next/*', dir: itinerary, file: 'src/react/x.ts', code: "import Link from 'next/link';\nexport const x = Link;", violations: [imp("'next/link'")] },
  { name: 'react: tầng infrastructure', dir: itinerary, file: 'src/react/x.ts', code: "import { r } from '../infrastructure/repo';\nexport const x = r;", violations: [imp("'../infrastructure/repo'")] },
  { name: 'react: document', dir: itinerary, file: 'src/react/x.ts', code: 'export const t = document.title;', violations: [{ rule: 'no-restricted-globals', includes: "'document'" }] },
  // barrel gốc
  { name: 'barrel: lộ infrastructure qua entry gốc', dir: itinerary, file: 'src/index.ts', code: "export * from './infrastructure';", violations: [imp("'./infrastructure'")] },
  { name: 'barrel: lộ react qua entry gốc', dir: itinerary, file: 'src/index.ts', code: "export * from './react';", violations: [imp("'./react'")] },
  // shared-kernel
  { name: 'kernel: package khác', dir: kernel, file: 'src/x.ts', code: "import i from '@tripory/itinerary';\nexport const x = i;", violations: [imp("'@tripory/itinerary'")] },
  { name: 'kernel: react', dir: kernel, file: 'src/x.ts', code: "import React from 'react';\nexport const x = React;", violations: [imp("'react'")] },
  { name: 'kernel: Math.random', dir: kernel, file: 'src/x.ts', code: 'export const r = Math.random();', violations: [{ rule: 'no-restricted-properties', includes: 'Math.random' }] },
  // api-client
  { name: 'api-client: package khác', dir: apiClient, file: 'src/x.ts', code: "import i from '@tripory/itinerary';\nexport const x = i;", violations: [imp("'@tripory/itinerary'")] },
  { name: 'api-client: next/*', dir: apiClient, file: 'src/x.ts', code: "import { cookies } from 'next/headers';\nexport const x = cookies;", violations: [imp("'next/headers'")] },
  { name: 'api-client: localStorage', dir: apiClient, file: 'src/x.ts', code: "export const t = localStorage.getItem('token');", violations: [{ rule: 'no-restricted-globals', includes: "'localStorage'" }] },
  // apps/web
  { name: 'web: /http ngoài composition', dir: web, file: 'src/app/x.ts', code: "import r from '@tripory/itinerary/http';\nexport const x = r;", violations: [imp("'@tripory/itinerary/http'")] },
  { name: 'web: /http trong modules/ui', dir: web, file: 'src/modules/itinerary/ui/x.ts', code: "import r from '@tripory/itinerary/http';\nexport const x = r;", violations: [imp("'@tripory/itinerary/http'")] },
  { name: 'web: import sâu src (UI)', dir: web, file: 'src/modules/itinerary/ui/x.ts', code: "import d from '@tripory/itinerary/src/domain/itinerary';\nexport const x = d;", violations: [imp("'@tripory/itinerary/src/domain/itinerary'")] },
  { name: 'web: import sâu src (composition)', dir: web, file: 'src/composition/x.ts', code: "import d from '@tripory/itinerary/src/domain/itinerary';\nexport const x = d;", violations: [imp("'@tripory/itinerary/src/domain/itinerary'")] },
];

const ok: Omit<Case, 'violations'>[] = [
  { name: 'domain: kernel + import tương đối (kể cả file tên giống framework)', dir: itinerary, file: 'src/domain/x.ts', code: "import k from '@tripory/shared-kernel';\nimport e from './errors';\nimport n from './next';\nimport h from './react-helpers';\nexport const x = [k, e, n, h];" },
  { name: 'domain: new Date(iso) có tham số', dir: itinerary, file: 'src/domain/x.ts', code: "export const d = new Date('2026-10-08');" },
  { name: 'domain: file test import vitest', dir: itinerary, file: 'src/domain/x.test.ts', code: "import { expect, it } from 'vitest';\nit('ok', () => expect(1).toBe(1));" },
  { name: 'application: domain + kernel', dir: itinerary, file: 'src/application/x.ts', code: "import d from '../domain/itinerary';\nimport k from '@tripory/shared-kernel';\nexport const x = [d, k];" },
  { name: 'infrastructure: application + domain + api-client + kernel + zod', dir: itinerary, file: 'src/infrastructure/x.ts', code: "import http from '@tripory/api-client';\nimport k from '@tripory/shared-kernel';\nimport { z } from 'zod';\nimport p from '../application/ports';\nimport d from '../domain/itinerary';\nexport const x = [http, k, z, p, d];" },
  { name: 'react: react + react-query + application + domain', dir: itinerary, file: 'src/react/x.ts', code: "import { useQuery } from '@tanstack/react-query';\nimport { useMemo } from 'react';\nimport u from '../application';\nimport d from '../domain';\nexport const x = [useQuery, useMemo, u, d];" },
  { name: 'barrel: domain + application', dir: itinerary, file: 'src/index.ts', code: "export * from './domain';\nexport * from './application';" },
  { name: 'kernel: không import gì', dir: kernel, file: 'src/x.ts', code: 'export const x = 1;' },
  { name: 'api-client: kernel + fetch', dir: apiClient, file: 'src/x.ts', code: "import k from '@tripory/shared-kernel';\nexport const get = (url: string) => fetch(url);\nexport { k };" },
  { name: 'web: composition import /http, /react và entry gốc', dir: web, file: 'src/composition/itinerary.client.ts', code: "import r from '@tripory/itinerary/http';\nimport h from '@tripory/itinerary/react';\nimport u from '@tripory/itinerary';\nexport const x = [r, h, u];" },
  { name: 'web: UI import /react và entry gốc', dir: web, file: 'src/modules/itinerary/ui/x.ts', code: "import h from '@tripory/itinerary/react';\nimport u from '@tripory/itinerary';\nexport const x = [h, u];" },
];

describe('lớp cưỡng chế bắt vi phạm', () => {
  it.each(bad)('$name', async ({ dir, file, code, violations }) => {
    const messages = await lint(dir, file, code);
    for (const { rule, includes } of violations) {
      const hit = messages.some((m) => m.ruleId === rule && m.message.includes(includes));
      expect(hit, `không có lỗi ${rule} chứa ${includes}; thực tế: ${JSON.stringify(messages.map((m) => [m.ruleId, m.message]))}`).toBe(true);
    }
  });
});

describe('lớp cưỡng chế không báo nhầm', () => {
  it.each(ok)('$name', async ({ dir, file, code }) => {
    expect(await lint(dir, file, code)).toEqual([]);
  });
});

describe('mọi package và app đều nối preset', () => {
  const listDirs = (parent: string) =>
    readdirSync(path.join(repoRoot, parent), { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(path.join(repoRoot, parent, entry.name, 'package.json')))
      .map((entry) => `${parent}/${entry.name}`);

  const targets = [...listDirs('packages'), ...listDirs('apps')];

  it.each(targets)('%s có eslint.config.mjs gọi @tripory/config/eslint', (dir) => {
    const configPath = path.join(repoRoot, dir, 'eslint.config.mjs');
    expect(existsSync(configPath), `${dir} thiếu eslint.config.mjs`).toBe(true);
    const text = readFileSync(configPath, 'utf8');
    // packages/config tự dùng base cục bộ; mọi nơi còn lại phải qua preset chung.
    if (dir !== 'packages/config') {
      expect(text).toContain('@tripory/config/eslint');
    }
  });
});
