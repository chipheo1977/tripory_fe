import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, QueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { ItineraryId } from '@tripory/shared-kernel';
import type {
  AddWaypointInput,
  CreateItineraryInput,
  ItineraryRepository,
  MetadataInput,
  ReorderInput,
  ShortLinkResolver,
  WaypointFields,
} from '../application';
import {
  appendWaypoint,
  applyDayOrder,
  withDay,
  withDaySubtitle,
  withMetadata,
  withoutWaypoint,
} from '../domain';
import type { Itinerary, ItinerarySummary, Page, StatusFilter, Waypoint } from '../domain';

// Hook factory: composition của app lắp `ItineraryRepository` + `ShortLinkResolver` rồi nhận hook ra, nên
// package không biết gì về HTTP, cookie hay điều hướng. Mọi lệnh ghi của editor dùng chung `mutationKey`
// `['itinerary','write',id]` và `scope { id: 'itinerary:'+id }`: TanStack chạy nối đuôi trong cùng scope, nên
// "DELETE gửi trước reorder" (D-33) đúng tự nhiên, còn trạng thái lưu (D-30) và chặn rời trang (D-35) đọc
// `isMutating`/`useIsMutating` trên key chung đó.
//
// Quy tắc callback (bài học 03-11): hook tự đặt `onMutate/onError/onSuccess/onSettled` ở cấp hook rồi gọi tiếp
// `options?.onX` SAU logic cache của mình. Callback cấp `mutate(vars, {...})` bị bỏ khi component unmount hoặc
// Activity ẩn, còn cấp hook thì không.

export { createPlaceHooks, placeKeys, type PlaceHooks } from './place-hooks';

export const ITINERARY_PAGE_SIZE = 12;

/** Khóa query/mutation dùng chung để UI đọc trạng thái lưu và để app seed/xóa cache. */
export const itineraryKeys = {
  all: ['itinerary'] as const,
  lists: () => ['itinerary', 'list'] as const,
  list: (status: StatusFilter) => ['itinerary', 'list', status] as const,
  detail: (id: ItineraryId) => ['itinerary', 'detail', id] as const,
  write: (id: ItineraryId) => ['itinerary', 'write', id] as const,
  remove: () => ['itinerary', 'remove'] as const,
};

type MutationOptions<TData, TVariables> = Omit<
  UseMutationOptions<TData, DefaultError, TVariables>,
  'mutationFn' | 'mutationKey' | 'scope'
>;

export type ItineraryHooksDeps = Readonly<{ repository: ItineraryRepository; shortLinks: ShortLinkResolver }>;

export type WaypointUpdateInput = Readonly<{ waypointId: string }> & WaypointFields;
export type DaySubtitleInput = Readonly<{ dayNumber: number; subtitle: string | null }>;
export type AddDayInput = Readonly<{ dayNumber: number }>;
export type DeleteWaypointInput = Readonly<{ waypointId: string }>;

/**
 * Chỉ lệnh ghi cuối cùng còn chạy mới làm tươi chi tiết + danh sách: chuỗi kéo thả liên tiếp chỉ gây một GET
 * (Pattern 5). `onSettled` chạy khi mutation hiện tại còn được tính là đang chạy, nên "cuối" nghĩa là `<= 1`.
 */
function settle(qc: QueryClient, id: ItineraryId): void {
  if (qc.isMutating({ mutationKey: itineraryKeys.write(id) }) <= 1) {
    void qc.invalidateQueries({ queryKey: itineraryKeys.detail(id) });
    void qc.invalidateQueries({ queryKey: itineraryKeys.lists() });
  }
}

type Snapshot = Readonly<{ previous: Itinerary | undefined }>;

const snapshotOf = (result: unknown): Snapshot | undefined =>
  typeof result === 'object' && result !== null && 'previous' in result ? (result as Snapshot) : undefined;

type WriteSpec<TData, TVariables> = Readonly<{
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Có thì cache được ghi ngay (optimistic) và hoàn lại khi lỗi. */
  optimistic?: (itinerary: Itinerary, variables: TVariables) => Itinerary;
  /** Cập nhật cache từ phản hồi, chạy trước `options.onSuccess`. */
  onSuccess?: (qc: QueryClient, data: TData) => void;
}>;

/** Lệnh ghi của editor: chung key + scope, optimistic có snapshot, rollback, settle theo lệnh cuối. */
function useWriteMutation<TData, TVariables>(
  id: ItineraryId,
  spec: WriteSpec<TData, TVariables>,
  options: MutationOptions<TData, TVariables> | undefined,
) {
  const qc = useQueryClient();
  return useMutation<TData, DefaultError, TVariables, unknown>({
    ...options,
    mutationKey: itineraryKeys.write(id),
    scope: { id: `itinerary:${id}` },
    mutationFn: spec.mutationFn,
    onMutate: async (variables, context) => {
      let previous: Itinerary | undefined;
      const { optimistic } = spec;
      if (optimistic !== undefined) {
        await qc.cancelQueries({ queryKey: itineraryKeys.detail(id) });
        previous = qc.getQueryData<Itinerary>(itineraryKeys.detail(id));
        if (previous !== undefined) qc.setQueryData(itineraryKeys.detail(id), optimistic(previous, variables));
      }
      await options?.onMutate?.(variables, context);
      const snapshot: Snapshot = { previous };
      return snapshot;
    },
    onSuccess: async (data, variables, onMutateResult, context) => {
      spec.onSuccess?.(qc, data);
      await options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: async (error, variables, onMutateResult, context) => {
      const previous = snapshotOf(onMutateResult)?.previous;
      if (previous !== undefined) qc.setQueryData(itineraryKeys.detail(id), previous);
      await options?.onError?.(error, variables, onMutateResult, context);
    },
    onSettled: async (data, error, variables, onMutateResult, context) => {
      settle(qc, id);
      await options?.onSettled?.(data, error, variables, onMutateResult, context);
    },
  });
}

export function createItineraryHooks(deps: ItineraryHooksDeps) {
  const { repository } = deps;

  return {
    /** Mỗi status một key nên đổi tab không xóa trang đã tải của tab khác (D-03). */
    useMyItineraries: (status: StatusFilter) =>
      useInfiniteQuery({
        queryKey: itineraryKeys.list(status),
        queryFn: ({ pageParam, signal }): Promise<Page<ItinerarySummary>> =>
          repository.listMine({ pageIndex: pageParam, pageSize: ITINERARY_PAGE_SIZE, status }, signal),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.hasNextPage ? last.pageIndex + 1 : undefined),
      }),

    /**
     * `staleTime: 0` và refetch khi focus lại (D-37), trừ khi còn lệnh ghi của itinerary này đang chạy: refetch
     * lúc đó sẽ đè mất bản optimistic.
     */
    useItinerary: (id: ItineraryId) => {
      const qc = useQueryClient();
      return useQuery({
        queryKey: itineraryKeys.detail(id),
        queryFn: ({ signal }) => repository.getById(id, signal),
        staleTime: 0,
        refetchOnWindowFocus: () => (qc.isMutating({ mutationKey: itineraryKeys.write(id) }) > 0 ? false : 'always'),
      });
    },

    useCreateItinerary: (options?: MutationOptions<Itinerary, CreateItineraryInput>) => {
      const qc = useQueryClient();
      return useMutation<Itinerary, DefaultError, CreateItineraryInput, unknown>({
        ...options,
        mutationFn: (input) => repository.create(input),
        onSuccess: async (data, variables, onMutateResult, context) => {
          qc.setQueryData(itineraryKeys.detail(data.id), data);
          void qc.invalidateQueries({ queryKey: itineraryKeys.lists() });
          await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
      });
    },

    useUpdateMetadata: (id: ItineraryId, options?: MutationOptions<void, MetadataInput>) =>
      useWriteMutation<void, MetadataInput>(
        id,
        {
          mutationFn: (input) => repository.updateMetadata(id, input),
          optimistic: (itinerary, input) => withMetadata(itinerary, input),
        },
        options,
      ),

    usePublish: (id: ItineraryId, options?: MutationOptions<void, void>) =>
      useWriteMutation<void, void>(id, { mutationFn: () => repository.publish(id) }, options),

    /** Xóa cả lịch trình: key riêng, không nằm trong scope của editor. */
    useDeleteItinerary: (options?: MutationOptions<void, ItineraryId>) => {
      const qc = useQueryClient();
      return useMutation<void, DefaultError, ItineraryId, unknown>({
        ...options,
        mutationKey: itineraryKeys.remove(),
        mutationFn: (id) => repository.remove(id),
        onSuccess: async (data, variables, onMutateResult, context) => {
          qc.removeQueries({ queryKey: itineraryKeys.detail(variables) });
          void qc.invalidateQueries({ queryKey: itineraryKeys.lists() });
          await options?.onSuccess?.(data, variables, onMutateResult, context);
        },
      });
    },

    /** Không optimistic (form đang mở, có loading): chèn điểm BE trả về rồi `settle` lấy km. */
    useAddWaypoint: (id: ItineraryId, options?: MutationOptions<Waypoint, AddWaypointInput>) =>
      useWriteMutation<Waypoint, AddWaypointInput>(
        id,
        {
          mutationFn: (input) => repository.addWaypoint(id, input),
          onSuccess: (qc, waypoint) => {
            qc.setQueryData<Itinerary>(
              itineraryKeys.detail(id),
              (current) => current && appendWaypoint(current, waypoint),
            );
          },
        },
        options,
      ),

    useUpdateWaypoint: (id: ItineraryId, options?: MutationOptions<void, WaypointUpdateInput>) =>
      useWriteMutation<void, WaypointUpdateInput>(
        id,
        {
          mutationFn: ({ waypointId, name, address, notes, coordinate }) =>
            repository.updateWaypoint(id, waypointId, { name, address, notes, coordinate }),
        },
        options,
      ),

    useDeleteWaypoint: (id: ItineraryId, options?: MutationOptions<void, DeleteWaypointInput>) =>
      useWriteMutation<void, DeleteWaypointInput>(
        id,
        {
          mutationFn: ({ waypointId }) => repository.deleteWaypoint(id, waypointId),
          optimistic: (itinerary, { waypointId }) => withoutWaypoint(itinerary, waypointId),
        },
        options,
      ),

    // Gọi thẳng `repository.reorderWaypoints` thay vì use case `reorderWaypoints(repo, itinerary, input)`: use
    // case cần snapshot lịch trình, mà lệnh nằm trong hàng đợi scope nên cache lúc chạy có thể đã khác lúc kéo.
    // Caller (UI 04-19) kiểm tập id bằng `isValidDayOrder` trước khi `mutate`.
    useReorderWaypoints: (id: ItineraryId, options?: MutationOptions<void, ReorderInput>) =>
      useWriteMutation<void, ReorderInput>(
        id,
        {
          mutationFn: (input) => repository.reorderWaypoints(id, input),
          optimistic: (itinerary, { dayNumber, orderedIds }) => applyDayOrder(itinerary, dayNumber, orderedIds),
        },
        options,
      ),

    useSetDaySubtitle: (id: ItineraryId, options?: MutationOptions<void, DaySubtitleInput>) =>
      useWriteMutation<void, DaySubtitleInput>(
        id,
        {
          mutationFn: ({ dayNumber, subtitle }) => repository.setDaySubtitle(id, dayNumber, subtitle),
          optimistic: (itinerary, { dayNumber, subtitle }) => withDaySubtitle(itinerary, dayNumber, subtitle ?? ''),
        },
        options,
      ),

    /** Ngày mới = đặt phụ đề `null` cho ngày đó (D-27): BE tạo bản ghi ngày. */
    useAddDay: (id: ItineraryId, options?: MutationOptions<void, AddDayInput>) =>
      useWriteMutation<void, AddDayInput>(
        id,
        {
          mutationFn: ({ dayNumber }) => repository.setDaySubtitle(id, dayNumber, null),
          optimistic: (itinerary, { dayNumber }) => withDay(itinerary, dayNumber),
        },
        options,
      ),

    /** Không scope, không write key: dán link rút gọn không phải lệnh ghi và không được xếp sau lệnh ghi. */
    useResolveShortLink: (options?: MutationOptions<string, Readonly<{ url: string }>>) =>
      useMutation<string, DefaultError, Readonly<{ url: string }>, unknown>({
        ...options,
        mutationFn: ({ url }) => deps.shortLinks.resolve(url),
      }),
  };
}
