import { describe, expect, it } from "vitest";
import { hashForPurpose } from "./hash-for-purpose";

const SECRET = "test-secret-that-is-long-enough-1234567890";

describe("hashForPurpose", () => {
  it("同じ入力からは同じハッシュを返す", () => {
    expect(hashForPurpose(SECRET, "ip", "203.0.113.1")).toBe(
      hashForPurpose(SECRET, "ip", "203.0.113.1")
    );
  });

  it("32文字の16進文字列を返し、元の値を含まない", () => {
    const hash = hashForPurpose(SECRET, "ip", "203.0.113.1");
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).not.toContain("203");
  });

  it("用途が違えば同じ値でも別のハッシュになる", () => {
    expect(hashForPurpose(SECRET, "ip", "abc")).not.toBe(
      hashForPurpose(SECRET, "pseudonym", "abc")
    );
  });

  it("秘密鍵が違えば別のハッシュになる", () => {
    expect(hashForPurpose(SECRET, "ip", "abc")).not.toBe(
      hashForPurpose(`${SECRET}-other`, "ip", "abc")
    );
  });

  it("値が違えば別のハッシュになる", () => {
    expect(hashForPurpose(SECRET, "ip", "203.0.113.1")).not.toBe(
      hashForPurpose(SECRET, "ip", "203.0.113.2")
    );
  });

  it("秘密鍵が空なら例外にする（鍵なしのハッシュは推測できるため）", () => {
    expect(() => hashForPurpose("", "ip", "abc")).toThrow();
  });
});
