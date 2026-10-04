import { describe, expect, it } from "vitest";
import { shouldStartAnonymousSession } from "./should-start-anonymous-session";

describe("shouldStartAnonymousSession", () => {
  it("ログイン状態が無ければサインインする", () => {
    expect(shouldStartAnonymousSession(null)).toBe(true);
    expect(
      shouldStartAnonymousSession({
        name: "AuthSessionMissingError",
        status: 400,
      })
    ).toBe(true);
  });

  it("保存してあるログイン状態が使えない（4xx）ならサインインし直す", () => {
    expect(
      shouldStartAnonymousSession({ name: "AuthApiError", status: 403 })
    ).toBe(true);
    expect(
      shouldStartAnonymousSession({ name: "AuthApiError", status: 401 })
    ).toBe(true);
  });

  // 通信の失敗で新しい ID を作ると、前の票を取り消せなくなり、2票目も入れられる
  it("通信の失敗・サーバーのエラーでは前の ID を上書きしない", () => {
    expect(
      shouldStartAnonymousSession({
        name: "AuthRetryableFetchError",
        status: 0,
      })
    ).toBe(false);
    expect(
      shouldStartAnonymousSession({
        name: "AuthRetryableFetchError",
        status: 503,
      })
    ).toBe(false);
    expect(
      shouldStartAnonymousSession({ name: "AuthApiError", status: 500 })
    ).toBe(false);
    expect(shouldStartAnonymousSession({ name: "AuthUnknownError" })).toBe(
      false
    );
  });
});
