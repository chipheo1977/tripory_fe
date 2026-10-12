import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as publicUi from './index';

const atoms = [
  'Avatar',
  'Badge',
  'Button',
  'Checkbox',
  'Icon',
  'IconButton',
  'Input',
  'Label',
  'Separator',
  'Skeleton',
  'Spinner',
  'Switch',
  'Textarea',
] as const;

const molecules = [
  'FormField',
  'SearchInput',
  'Select',
  'Tabs',
  'DropdownMenu',
  'Tooltip',
  'Toast',
  'Dialog',
  'Sheet',
  'Card',
  'EmptyState',
  'ErrorState',
] as const;

const compoundParts = [
  'FormFieldLabel',
  'FormFieldDescription',
  'FormFieldError',
  'SelectLabel',
  'SelectTrigger',
  'SelectValue',
  'SelectContent',
  'SelectPopup',
  'SelectList',
  'SelectItem',
  'SelectItemText',
  'SelectGroup',
  'SelectGroupLabel',
  'SelectSeparator',
  'SelectPortal',
  'SelectPositioner',
  'SelectItemIndicator',
  'TabsList',
  'TabsTrigger',
  'TabsIndicator',
  'TabsPanel',
  'DropdownMenuTrigger',
  'DropdownMenuContent',
  'DropdownMenuItem',
  'DropdownMenuCheckboxItem',
  'DropdownMenuRadioGroup',
  'DropdownMenuRadioItem',
  'DropdownMenuGroup',
  'DropdownMenuGroupLabel',
  'DropdownMenuSeparator',
  'DropdownMenuPortal',
  'DropdownMenuPositioner',
  'DropdownMenuPopup',
  'DropdownMenuCheckboxItemIndicator',
  'DropdownMenuRadioItemIndicator',
  'TooltipProvider',
  'TooltipTrigger',
  'TooltipContent',
  'TooltipPortal',
  'TooltipPositioner',
  'TooltipPopup',
  'TooltipArrow',
  'DialogTrigger',
  'DialogBackdrop',
  'DialogContent',
  'DialogTitle',
  'DialogDescription',
  'DialogClose',
  'DialogPortal',
  'DialogViewport',
  'SheetTrigger',
  'SheetBackdrop',
  'SheetContent',
  'SheetHandle',
  'SheetControls',
  'SheetTitle',
  'SheetDescription',
  'SheetClose',
  'SheetPortal',
  'SheetViewport',
] as const;

const hasEveryExport = (names: readonly string[]) => names.filter((name) => !(name in publicUi));

describe('ui-web public entry', () => {
  it('export đủ 13 atoms bằng tên', () => {
    expect(hasEveryExport(atoms)).toEqual([]);
  });

  it('export đủ inventory molecules bằng tên', () => {
    expect(hasEveryExport(molecules)).toEqual([]);
  });

  it('export mọi compound child bằng tên', () => {
    expect(hasEveryExport(compoundParts)).toEqual([]);
  });

  it('export Sheet snap adapter và feedback helpers', () => {
    expect(hasEveryExport(['resolveSnapPoints', 'stepSnapPoint', 'notify', 'toastDurations'])).toEqual([]);
  });

  it('ErrorState public nhận onRetry', () => {
    type ErrorStateProps = Parameters<typeof publicUi.ErrorState>[0];
    const retryProps = { onRetry: () => undefined } satisfies ErrorStateProps;
    expect('onRetry' in retryProps).toBe(true);
  });

  it('barrel server-safe và compound API không dùng static properties', () => {
    const srcDir = path.dirname(fileURLToPath(import.meta.url));
    expect(readFileSync(path.join(srcDir, 'index.ts'), 'utf8')).not.toContain("'use client'");
    expect('Panel' in publicUi.Tabs).toBe(false);
    expect('Title' in publicUi.Dialog).toBe(false);
    expect('Title' in publicUi.Sheet).toBe(false);
  });
});
