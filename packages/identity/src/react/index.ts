import { useMutation, useQuery } from '@tanstack/react-query';
import type { DefaultError, UseMutationOptions } from '@tanstack/react-query';
import type { ChangePasswordInput, LoginInput, ProfileReader, RegisterInput, SessionGateway } from '../application';
import type { Viewer } from '../domain';

// Hook factory: composition của app lắp `SessionGateway` và `ProfileReader` rồi nhận hook ra, nên package không
// biết gì về HTTP, cookie hay điều hướng. Mutation nhận `options` để app gắn `meta` (cấu hình toast), vì package
// không biết `MutationFeedback`. `mutationFn` luôn do hook đặt, app không ghi đè được.

/** Khóa query dùng chung để app seed hồ sơ ngay sau đăng nhập và xóa khi đăng xuất. */
export const identityKeys = { me: ['identity', 'me'] } as const;

type MutationOptions<TData, TVariables> = Omit<UseMutationOptions<TData, DefaultError, TVariables>, 'mutationFn'>;

export type IdentityHooksDeps = Readonly<{ gateway: SessionGateway; profile: ProfileReader }>;

export function createIdentityHooks(deps: IdentityHooksDeps) {
  return {
    useLogin: (options?: MutationOptions<Viewer, LoginInput>) =>
      useMutation({ ...options, mutationFn: (input: LoginInput) => deps.gateway.login(input) }),

    useRegister: (options?: MutationOptions<Viewer, RegisterInput>) =>
      useMutation({ ...options, mutationFn: (input: RegisterInput) => deps.gateway.register(input) }),

    useChangePassword: (options?: MutationOptions<void, ChangePasswordInput>) =>
      useMutation({ ...options, mutationFn: (input: ChangePasswordInput) => deps.gateway.changePassword(input) }),

    useLogout: (options?: MutationOptions<void, void>) =>
      useMutation({ ...options, mutationFn: () => deps.gateway.logout() }),

    /** `enabled` do app quyết (chỉ hỏi khi đã có phiên). Avatar hiếm đổi nên giữ tươi 5 phút. */
    useMyProfile: (enabled: boolean) =>
      useQuery({
        queryKey: identityKeys.me,
        queryFn: () => deps.profile.me(),
        enabled,
        staleTime: 5 * 60_000,
      }),
  };
}
