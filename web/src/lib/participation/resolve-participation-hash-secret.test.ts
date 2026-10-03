import { describe, expect, it } from "vitest";
import {
  DEV_PARTICIPATION_HASH_SECRET,
  resolveParticipationHashSecret,
} from "./resolve-participation-hash-secret";

const LONG_SECRET = "a".repeat(32);

describe("resolveParticipationHashSecret", () => {
  it("32文字以上の値が設定されていればそれを使う", () => {
    expect(
      resolveParticipationHashSecret({
        secret: LONG_SECRET,
        nodeEnv: "production",
      })
    ).toEqual({ value: LONG_SECRET, source: "env" });
  });

  it("前後の空白は取り除いて扱う", () => {
    expect(
      resolveParticipationHashSecret({
        secret: `  ${LONG_SECRET}\n`,
        nodeEnv: "production",
      })
    ).toEqual({ value: LONG_SECRET, source: "env" });
  });

  it("本番で未設定なら null（投票を止める）", () => {
    expect(
      resolveParticipationHashSecret({
        secret: undefined,
        nodeEnv: "production",
      })
    ).toBeNull();
  });

  it("本番で短すぎる値なら null（推測されやすい鍵を使わない）", () => {
    expect(
      resolveParticipationHashSecret({
        secret: "short-secret",
        nodeEnv: "production",
      })
    ).toBeNull();
  });

  it("開発では未設定でも開発用の既定値を使う", () => {
    expect(
      resolveParticipationHashSecret({
        secret: undefined,
        nodeEnv: "development",
      })
    ).toEqual({ value: DEV_PARTICIPATION_HASH_SECRET, source: "dev-default" });
  });

  it("テストや NODE_ENV 未設定でも開発用の既定値を使う", () => {
    expect(
      resolveParticipationHashSecret({ secret: "", nodeEnv: "test" })?.source
    ).toBe("dev-default");
    expect(
      resolveParticipationHashSecret({ secret: "", nodeEnv: undefined })?.source
    ).toBe("dev-default");
  });
});
