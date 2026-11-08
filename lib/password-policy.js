export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_ERROR =
  "Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ số và ký tự đặc biệt.";

export function passwordChecks(value) {
  const password = typeof value === "string" ? value : "";
  return [
    {
      id: "length",
      label: "Ít nhất 8 ký tự",
      passed: [...password].length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "uppercase",
      label: "Có chữ cái viết hoa",
      passed: /\p{Lu}/u.test(password),
    },
    { id: "digit", label: "Có chữ số", passed: /[0-9]/.test(password) },
    {
      id: "special",
      label: "Có ký tự đặc biệt",
      passed: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ];
}

export function validatePassword(value) {
  if (typeof value !== "string") return PASSWORD_ERROR;
  if (value.length > PASSWORD_MAX_LENGTH) return "Mật khẩu tối đa 128 ký tự.";
  return passwordChecks(value).every((check) => check.passed)
    ? null
    : PASSWORD_ERROR;
}
