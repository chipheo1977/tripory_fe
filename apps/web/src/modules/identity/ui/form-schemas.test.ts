import { describe, expect, it } from "vitest";
import {
  CHANGE_PASSWORD_FIELDS,
  LOGIN_FIELDS,
  REGISTER_FIELDS,
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./form-schemas";
import { buildChecklistItems, passwordRuleLabel } from "./password-rule-copy";

type Issue = Readonly<{ path: string; message: string }>;

/** Rút gọn issue của Zod thành `{ path[0], message }` để so sánh. */
const issuesOf = (result: { success: boolean; error?: { issues: readonly { path: PropertyKey[]; message: string }[] } }): Issue[] =>
  (result.error?.issues ?? []).map((issue) => ({ path: String(issue.path[0]), message: issue.message }));

const login = (override: Partial<{ email: string; password: string }> = {}) =>
  loginSchema.safeParse({ email: "user@gmail.com", password: "secret", ...override });

const register = (
  override: Partial<{ fullName: string; email: string; password: string; confirmPassword: string }> = {},
) =>
  registerSchema.safeParse({
    fullName: "Nguyễn Văn A",
    email: "user@gmail.com",
    password: "12345678",
    confirmPassword: "12345678",
    ...override,
  });

const change = (
  override: Partial<{ currentPassword: string; newPassword: string; confirmPassword: string }> = {},
) =>
  changePasswordSchema.safeParse({
    currentPassword: "Old12345!",
    newPassword: "Abcdef1!",
    confirmPassword: "Abcdef1!",
    ...override,
  });

describe("loginSchema", () => {
  it("giá trị hợp lệ → ok", () => {
    expect(login().success).toBe(true);
  });

  it.each([
    ["", "Vui lòng nhập email."],
    ["   ", "Vui lòng nhập email."],
    ["abc", "Email không đúng định dạng."],
    ["a@b", "Email không đúng định dạng."],
    ["a b@c.vn", "Email không đúng định dạng."],
  ] as const)("email %j → đúng một lỗi %j ở ô email", (email, message) => {
    expect(issuesOf(login({ email }))).toEqual([{ path: "email", message }]);
  });

  it.each(["user@gmail.com", "tester@sub.example.vn", " user@gmail.com ", "S.S@s.ss"] as const)(
    "email %j hợp lệ, kể cả có chữ 's' (D-33)",
    (email) => {
      expect(login({ email }).success).toBe(true);
    },
  );

  it("email được trim ở giá trị đầu ra", () => {
    const result = login({ email: " user@gmail.com " });
    expect(result.success && result.data.email).toBe("user@gmail.com");
  });

  it("mật khẩu rỗng → 'Vui lòng nhập mật khẩu.'", () => {
    expect(issuesOf(login({ password: "" }))).toEqual([{ path: "password", message: "Vui lòng nhập mật khẩu." }]);
  });

  it("mật khẩu có khoảng trắng đầu/cuối giữ nguyên, không trim", () => {
    const result = login({ password: "  secret  " });
    expect(result.success && result.data.password).toBe("  secret  ");
  });

  it("mật khẩu toàn khoảng trắng vẫn là mật khẩu (BE không trim)", () => {
    expect(login({ password: "   " }).success).toBe(true);
  });
});

describe("registerSchema", () => {
  it("giá trị hợp lệ → ok", () => {
    expect(register().success).toBe(true);
  });

  it("họ tên toàn khoảng trắng → 'Vui lòng nhập họ và tên.'", () => {
    expect(issuesOf(register({ fullName: "   " }))).toEqual([
      { path: "fullName", message: "Vui lòng nhập họ và tên." },
    ]);
  });

  it("họ tên rỗng → 'Vui lòng nhập họ và tên.'", () => {
    expect(issuesOf(register({ fullName: "" }))).toEqual([
      { path: "fullName", message: "Vui lòng nhập họ và tên." },
    ]);
  });

  it("101 ký tự → 'Họ và tên tối đa 100 ký tự.'", () => {
    expect(issuesOf(register({ fullName: "a".repeat(101) }))).toEqual([
      { path: "fullName", message: "Họ và tên tối đa 100 ký tự." },
    ]);
  });

  it("100 ký tự hợp lệ", () => {
    expect(register({ fullName: "a".repeat(100) }).success).toBe(true);
  });

  it("đếm họ tên trên giá trị thô: 100 ký tự + 1 khoảng trắng cuối là 101 → lỗi", () => {
    expect(issuesOf(register({ fullName: `${"a".repeat(100)} ` }))).toEqual([
      { path: "fullName", message: "Họ và tên tối đa 100 ký tự." },
    ]);
  });

  it("email rỗng / sai dạng dùng cùng copy với đăng nhập", () => {
    expect(issuesOf(register({ email: "" }))).toEqual([{ path: "email", message: "Vui lòng nhập email." }]);
    expect(issuesOf(register({ email: "abc" }))).toEqual([
      { path: "email", message: "Email không đúng định dạng." },
    ]);
  });

  it("mật khẩu rỗng → 'Vui lòng nhập mật khẩu.' (không kèm lỗi checklist)", () => {
    expect(issuesOf(register({ password: "", confirmPassword: "" }))).toEqual([
      { path: "password", message: "Vui lòng nhập mật khẩu." },
      { path: "confirmPassword", message: "Vui lòng nhập lại mật khẩu." },
    ]);
  });

  it("'1234567' (7 ký tự) → 'Mật khẩu chưa đạt đủ yêu cầu.'", () => {
    expect(issuesOf(register({ password: "1234567", confirmPassword: "1234567" }))).toEqual([
      { path: "password", message: "Mật khẩu chưa đạt đủ yêu cầu." },
    ]);
  });

  it("'12345678' hợp lệ: đăng ký chỉ đòi minLength (D-27)", () => {
    expect(register({ password: "12345678", confirmPassword: "12345678" }).success).toBe(true);
  });

  it("nhập lại rỗng → 'Vui lòng nhập lại mật khẩu.'", () => {
    expect(issuesOf(register({ confirmPassword: "" }))).toEqual([
      { path: "confirmPassword", message: "Vui lòng nhập lại mật khẩu." },
    ]);
  });

  it("nhập lại khác mật khẩu → lỗi gắn vào path confirmPassword", () => {
    const result = register({ confirmPassword: "87654321" });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({ path: ["confirmPassword"], message: "Mật khẩu nhập lại không khớp." }),
    );
    expect(issuesOf(result)).toHaveLength(1);
  });

  it("mật khẩu có khoảng trắng đầu/cuối giữ nguyên và so khớp nguyên văn", () => {
    expect(register({ password: " 12345678 ", confirmPassword: " 12345678 " }).success).toBe(true);
    expect(issuesOf(register({ password: " 12345678 ", confirmPassword: "12345678" }))).toEqual([
      { path: "confirmPassword", message: "Mật khẩu nhập lại không khớp." },
    ]);
  });
});

describe("changePasswordSchema", () => {
  it("giá trị hợp lệ → ok", () => {
    expect(change().success).toBe(true);
  });

  it("mật khẩu hiện tại rỗng → 'Vui lòng nhập mật khẩu hiện tại.'", () => {
    expect(issuesOf(change({ currentPassword: "" }))).toEqual([
      { path: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại." },
    ]);
  });

  it("mật khẩu mới rỗng → 'Vui lòng nhập mật khẩu.' (không kèm lỗi checklist)", () => {
    expect(issuesOf(change({ newPassword: "", confirmPassword: "" }))).toEqual([
      { path: "newPassword", message: "Vui lòng nhập mật khẩu." },
      { path: "confirmPassword", message: "Vui lòng nhập lại mật khẩu." },
    ]);
  });

  it.each([
    ["thiếu minLength", "Ab1!"],
    ["thiếu chữ in hoa", "abcdef1!"],
    ["thiếu chữ thường", "ABCDEF1!"],
    ["thiếu chữ số", "Abcdefg!"],
    ["thiếu ký tự đặc biệt", "Abcdefg1"],
    ["dấu '-' không phải ký tự đặc biệt của BE (D-34)", "Abcdef1-"],
    ["dấu '_' không phải ký tự đặc biệt của BE (D-34)", "Abcdef1_"],
  ] as const)("%s → 'Mật khẩu chưa đạt đủ yêu cầu.' ở newPassword", (_name, newPassword) => {
    expect(issuesOf(change({ newPassword, confirmPassword: newPassword }))).toEqual([
      { path: "newPassword", message: "Mật khẩu chưa đạt đủ yêu cầu." },
    ]);
  });

  it("mật khẩu mới trùng mật khẩu hiện tại → differentFromCurrent fail, cùng lỗi ở newPassword", () => {
    expect(issuesOf(change({ currentPassword: "Abcdef1!", newPassword: "Abcdef1!", confirmPassword: "Abcdef1!" }))).toEqual([
      { path: "newPassword", message: "Mật khẩu chưa đạt đủ yêu cầu." },
    ]);
  });

  it.each(["!", "?", "*", "@", "#", "$", "%", "^", "&", "+", "="] as const)(
    "ký tự đặc biệt %s được chấp nhận",
    (special) => {
      const newPassword = `Abcdef1${special}`;
      expect(change({ newPassword, confirmPassword: newPassword }).success).toBe(true);
    },
  );

  it("nhập lại lệch → lỗi confirmPassword", () => {
    expect(issuesOf(change({ confirmPassword: "Abcdef1?" }))).toEqual([
      { path: "confirmPassword", message: "Mật khẩu nhập lại không khớp." },
    ]);
  });

  it("nhập lại rỗng → 'Vui lòng nhập lại mật khẩu.'", () => {
    expect(issuesOf(change({ confirmPassword: "" }))).toEqual([
      { path: "confirmPassword", message: "Vui lòng nhập lại mật khẩu." },
    ]);
  });

  it("mật khẩu hiện tại có khoảng trắng đầu/cuối giữ nguyên (không trim)", () => {
    const result = change({ currentPassword: " Old12345! " });
    expect(result.success && result.data.currentPassword).toBe(" Old12345! ");
  });

  it("nhiều ô sai cùng lúc: mỗi ô đúng một lỗi, thứ tự theo ô", () => {
    expect(issuesOf(change({ currentPassword: "", newPassword: "abc", confirmPassword: "xyz" }))).toEqual([
      { path: "currentPassword", message: "Vui lòng nhập mật khẩu hiện tại." },
      { path: "newPassword", message: "Mật khẩu chưa đạt đủ yêu cầu." },
      { path: "confirmPassword", message: "Mật khẩu nhập lại không khớp." },
    ]);
  });
});

describe("tên field", () => {
  it("khớp key của schema và đúng thứ tự DOM của UI-SPEC", () => {
    expect(LOGIN_FIELDS).toEqual(["email", "password"]);
    expect(REGISTER_FIELDS).toEqual(["fullName", "email", "password", "confirmPassword"]);
    expect(CHANGE_PASSWORD_FIELDS).toEqual(["currentPassword", "newPassword", "confirmPassword"]);
  });
});

describe("passwordRuleLabel", () => {
  it.each([
    ["minLength", 8, "Ít nhất 8 ký tự"],
    ["minLength", 12, "Ít nhất 12 ký tự"],
    ["uppercase", undefined, "Có chữ in hoa (A–Z)"],
    ["lowercase", undefined, "Có chữ thường (a–z)"],
    ["digit", undefined, "Có chữ số (0–9)"],
    ["special", undefined, "Có một trong các ký tự ! ? * @ # $ % ^ & + ="],
    ["differentFromCurrent", undefined, "Khác mật khẩu hiện tại"],
  ] as const)("%s (min=%s) → %j", (id, min, label) => {
    expect(passwordRuleLabel(id, min)).toBe(label);
  });
});

describe("buildChecklistItems", () => {
  it("map kết quả evaluatePasswordRules sang { id, label, met } cùng thứ tự", () => {
    expect(
      buildChecklistItems([
        { id: "minLength", min: 8, met: true },
        { id: "uppercase", met: false },
      ]),
    ).toEqual([
      { id: "minLength", label: "Ít nhất 8 ký tự", met: true },
      { id: "uppercase", label: "Có chữ in hoa (A–Z)", met: false },
    ]);
  });

  it("danh sách rỗng → mảng rỗng", () => {
    expect(buildChecklistItems([])).toEqual([]);
  });
});
