"use client";

import type { ItinerarySummary } from "@tripory/itinerary";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@tripory/ui-web";
import { MoreHorizontal, SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Ref } from "react";
import { CoverImage } from "./cover-image";
import { markEnteredFromList } from "./entry-flag";
import { formatKm, formatStartDate } from "./format";

export type ItineraryCardProps = Readonly<{
  summary: ItinerarySummary;
  onDelete(summary: ItinerarySummary): void;
  /** View dùng để chuyển focus tới link tiêu đề sau khi xóa thẻ lân cận (D-42). */
  titleLinkRef?: Ref<HTMLAnchorElement>;
}>;

export function ItineraryCard({ summary, onDelete, titleLinkRef }: ItineraryCardProps) {
  const href = `/itineraries/${summary.id}/edit`;
  const meta = [formatStartDate(summary.startDate), formatKm(summary.totalDistanceKm)]
    .filter((part): part is string => part !== null)
    .join(" · ");
  return (
    <article className="group relative isolate w-full overflow-hidden rounded-container border border-border bg-surface text-left text-text transition-[border-color,box-shadow] duration-(--semantic-motion-duration-fast) ease-standard has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-focus-ring has-[a:hover]:border-border-strong has-[a:hover]:shadow-sm">
      <CoverImage className="rounded-t-container" src={summary.coverImageUrl} />
      <div className="flex flex-col gap-stack-sm p-stack-md">
        <div className="flex items-center justify-between gap-inline-sm">
          <Badge variant={summary.isPublic ? "success" : "neutral"}>
            {summary.isPublic ? "Đã xuất bản" : "Nháp"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`Thao tác cho "${summary.title}"`}
              className="relative z-sticky min-h-touch min-w-touch border-transparent bg-transparent p-0"
            >
              <Icon icon={MoreHorizontal} size="md" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLinkItem render={<Link href={href} onNavigate={() => markEnteredFromList()} />}>
                <Icon icon={SquarePen} size="sm" />
                Mở
              </DropdownMenuLinkItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem aria-label="Xóa" onClick={() => onDelete(summary)} variant="danger">
                <Icon icon={Trash2} size="sm" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <h2 className="line-clamp-2 break-words text-heading font-semibold text-text">
          <Link
            className="outline-hidden after:absolute after:inset-0"
            href={href}
            onNavigate={() => markEnteredFromList()}
            ref={titleLinkRef}
          >
            {summary.title}
          </Link>
        </h2>
        {meta === "" ? null : <p className="text-label tabular-nums text-muted">{meta}</p>}
      </div>
    </article>
  );
}
