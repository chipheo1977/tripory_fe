import { makeApiError } from '@tripory/api-client';
import type { HttpClient, HttpRequest } from '@tripory/api-client';
import { describe, expect, it, vi } from 'vitest';
import { authResponseFixture, userIdFixture, userProfileFixture, viewerJsonFixture } from './fixtures';
import { createHttpProfileReader, createHttpSessionGateway } from './http-session-gateway';

const fakeHttp = (reply: unknown = viewerJsonFixture) => {
  const send = vi.fn<HttpClient['send']>(async () => reply);
  const http: HttpClient = { send };

  return { http, send };
};

const failingHttp = (error: unknown) => {
  const send = vi.fn<HttpClient['send']>(async () => {
    throw error;
  });
  const http: HttpClient = { send };

  return { http, send };
};

/** Request đã gửi ở lần gọi đầu tiên. */
const firstRequest = (send: ReturnType<typeof fakeHttp>['send']): HttpRequest => {
  const request = send.mock.calls[0]?.[0];

  if (request === undefined) throw new Error('send chưa được gọi');

  return request;
};

const expectedViewer = {
  id: userIdFixture,
  email: 'a@b.vn',
  fullName: 'Nguyễn Văn Ánh',
  handle: 'a',
  avatarUrl: null,
};

const loginInput = { email: 'a@b.vn', password: 'Matkhau1!' };
const registerInput = { ...loginInput, fullName: 'Nguyễn Văn Ánh' };
const changeInput = { currentPassword: 'Matkhau1!', newPassword: 'Matkhau2!' };

describe('createHttpSessionGateway.login', () => {
  it('gọi POST /login với sessionRefresh: false và trả Viewer', async () => {
    const { http, send } = fakeHttp();

    const viewer = await createHttpSessionGateway(http).login(loginInput);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/login', body: loginInput, sessionRefresh: false }),
    );
    expect(viewer).toEqual(expectedViewer);
  });

  it('chỉ gửi email và password, bỏ trường thừa của form', async () => {
    const { http, send } = fakeHttp();
    const withExtra = { ...loginInput, confirmPassword: 'khong-gui' };

    await createHttpSessionGateway(http).login(withExtra);

    expect(firstRequest(send).body).toEqual(loginInput);
  });

  it('chuẩn hóa avatar mặc định của BE thành null, giữ avatar riêng', async () => {
    const withDefault = fakeHttp({
      viewer: { ...viewerJsonFixture.viewer, avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=tripory' },
    });
    const withOwn = fakeHttp({ viewer: { ...viewerJsonFixture.viewer, avatarUrl: 'https://cdn.tripory.vn/a.png' } });

    expect((await createHttpSessionGateway(withDefault.http).login(loginInput)).avatarUrl).toBeNull();
    expect((await createHttpSessionGateway(withOwn.http).login(loginInput)).avatarUrl).toBe('https://cdn.tripory.vn/a.png');
  });

  it('Viewer trả về không có khóa token dù route gửi kèm (T-03-12)', async () => {
    const { http } = fakeHttp({ viewer: viewerJsonFixture.viewer, accessToken: 'x', refreshToken: 'y' });

    const viewer = await createHttpSessionGateway(http).login(loginInput);

    expect(Object.keys(viewer).toSorted()).toEqual(['avatarUrl', 'email', 'fullName', 'handle', 'id']);
    expect(JSON.stringify(viewer)).not.toMatch(/accessToken|refreshToken|expiresAt/);
  });
});

describe('createHttpSessionGateway.register', () => {
  it('gọi POST /register với sessionRefresh: false, body có fullName, trả Viewer', async () => {
    const { http, send } = fakeHttp();

    const viewer = await createHttpSessionGateway(http).register(registerInput);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', path: '/register', body: registerInput, sessionRefresh: false }),
    );
    expect(viewer).toEqual(expectedViewer);
  });

  it('chỉ gửi email, password, fullName, bỏ ô nhập lại mật khẩu', async () => {
    const { http, send } = fakeHttp();
    const withExtra = { ...registerInput, confirmPassword: registerInput.password };

    await createHttpSessionGateway(http).register(withExtra);

    expect(firstRequest(send).body).toEqual(registerInput);
  });
});

describe('createHttpSessionGateway.logout', () => {
  it('gọi POST /logout với sessionRefresh: false và resolve undefined', async () => {
    const { http, send } = fakeHttp(null);

    await expect(createHttpSessionGateway(http).logout()).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/logout', sessionRefresh: false }));
    expect(firstRequest(send).body).toBeUndefined();
  });
});

describe('createHttpSessionGateway.changePassword', () => {
  it('gọi PUT /change-password với đúng hai trường và resolve undefined', async () => {
    const { http, send } = fakeHttp(null);

    await expect(createHttpSessionGateway(http).changePassword(changeInput)).resolves.toBeUndefined();

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'PUT', path: '/change-password', body: changeInput }),
    );
  });

  it('KHÔNG đặt sessionRefresh: false, để 401 session.expired được refresh rồi phát lại', async () => {
    const { http, send } = fakeHttp(null);

    await createHttpSessionGateway(http).changePassword(changeInput);

    const request = firstRequest(send);
    expect(request.sessionRefresh).not.toBe(false);
    expect('sessionRefresh' in request).toBe(false);
  });

  it('chỉ gửi currentPassword và newPassword, bỏ ô nhập lại', async () => {
    const { http, send } = fakeHttp(null);

    const withExtra = { ...changeInput, confirmPassword: 'khong-gui' };

    await createHttpSessionGateway(http).changePassword(withExtra);

    expect(firstRequest(send).body).toEqual(changeInput);
  });
});

describe('createHttpSessionGateway: lỗi', () => {
  it.each([
    ['thiếu viewer', {}],
    ['viewer là null', { viewer: null }],
    ['data là null', null],
    ['data là chuỗi', 'ok'],
    ['viewer thiếu email', { viewer: { id: userIdFixture, fullName: 'A', handle: 'a', avatarUrl: null } }],
    ['trả nguyên AuthResponse của BE thay vì { viewer }', authResponseFixture],
  ] as const)('login: body sai hình dạng (%s) thì ném lỗi, không trả Viewer', async (_name, reply) => {
    const { http } = fakeHttp(reply);

    await expect(createHttpSessionGateway(http).login(loginInput)).rejects.toThrow();
  });

  it('register: body thiếu viewer thì ném lỗi', async () => {
    const { http } = fakeHttp({});

    await expect(createHttpSessionGateway(http).register(registerInput)).rejects.toThrow();
  });

  it('login: id viewer không phải GUID thì ném lỗi', async () => {
    const { http } = fakeHttp({ viewer: { ...viewerJsonFixture.viewer, id: 'khong-phai-guid' } });

    await expect(createHttpSessionGateway(http).login(loginInput)).rejects.toThrow();
  });

  it('ApiError của http.send lan nguyên (cùng tham chiếu) ở cả bốn lệnh', async () => {
    const error = makeApiError({ kind: 'http', status: 400, code: 'Auth.InvalidCredentials', message: 'Sai.' });
    const { http } = failingHttp(error);
    const gateway = createHttpSessionGateway(http);

    await expect(gateway.login(loginInput)).rejects.toBe(error);
    await expect(gateway.register(registerInput)).rejects.toBe(error);
    await expect(gateway.logout()).rejects.toBe(error);
    await expect(gateway.changePassword(changeInput)).rejects.toBe(error);
  });
});

describe('createHttpSessionGateway: không state toàn cục', () => {
  it('mỗi gateway chỉ gọi client của chính nó', async () => {
    const first = fakeHttp();
    const second = fakeHttp();

    await createHttpSessionGateway(first.http).login(loginInput);

    expect(first.send).toHaveBeenCalledTimes(1);
    expect(second.send).not.toHaveBeenCalled();
  });
});

describe('createHttpProfileReader.me', () => {
  it('gọi GET /users/me không kèm cờ sessionRefresh và trả Viewer, avatar mặc định thành null', async () => {
    const { http, send } = fakeHttp(userProfileFixture);

    const viewer = await createHttpProfileReader(http).me();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ method: 'GET', path: '/users/me' });
    expect('sessionRefresh' in firstRequest(send)).toBe(false);
    expect(viewer).toEqual(expectedViewer);
  });

  it('giữ avatar riêng của người dùng', async () => {
    const { http } = fakeHttp({ ...userProfileFixture, avatarUrl: 'https://cdn.tripory.vn/a.png' });

    expect((await createHttpProfileReader(http).me()).avatarUrl).toBe('https://cdn.tripory.vn/a.png');
  });

  it.each([
    ['thiếu id', { ...userProfileFixture, id: undefined }],
    ['thiếu createdAt', { ...userProfileFixture, createdAt: undefined }],
    ['data là null', null],
    ['id không phải GUID', { ...userProfileFixture, id: 'khong-phai-guid' }],
  ] as const)('body sai hình dạng (%s) thì ném lỗi', async (_name, reply) => {
    const { http } = fakeHttp(reply);

    await expect(createHttpProfileReader(http).me()).rejects.toThrow();
  });

  it('ApiError của http.send lan nguyên', async () => {
    const error = makeApiError({ kind: 'session_expired', status: 401, code: 'session.expired', message: null });
    const { http } = failingHttp(error);

    await expect(createHttpProfileReader(http).me()).rejects.toBe(error);
  });
});
