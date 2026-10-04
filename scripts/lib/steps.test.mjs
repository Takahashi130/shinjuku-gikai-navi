import { describe, expect, it } from "vitest";
import { flagValue, parseArgs } from "./args.mjs";
import { decideSkip, selectSteps, shortTime, todayInJapan } from "./steps.mjs";

const STEPS = [
  { id: "lint" },
  { id: "typecheck:web" },
  { id: "test:packages" },
  { id: "test:web" },
];

describe("selectSteps", () => {
  it("指定が無ければすべて", () => {
    expect(selectSteps(STEPS).map((s) => s.id)).toEqual(STEPS.map((s) => s.id));
  });

  it("--only はカンマ区切りで、':' の前だけを書くとまとめて選ぶ", () => {
    expect(selectSteps(STEPS, { only: "lint,test" }).map((s) => s.id)).toEqual([
      "lint",
      "test:packages",
      "test:web",
    ]);
  });

  it("':' で区切った単位でだけまとめる（'type' で typecheck:* は選ばない）", () => {
    expect(() => selectSteps(STEPS, { only: "type" })).toThrow(/知らない工程/);
    expect(selectSteps(STEPS, { only: "typecheck" }).map((s) => s.id)).toEqual([
      "typecheck:web",
    ]);
  });

  it("--from はその工程から最後まで", () => {
    expect(selectSteps(STEPS, { from: "test:packages" }).map((s) => s.id)).toEqual([
      "test:packages",
      "test:web",
    ]);
  });

  it("知らない名前は例外にして、使える名前を知らせる", () => {
    expect(() => selectSteps(STEPS, { only: "nope" })).toThrow(/使える名前: lint/);
    expect(() => selectSteps(STEPS, { from: "nope" })).toThrow(/知らない工程/);
  });
});

describe("decideSkip", () => {
  const ok = { ok: true, fingerprint: "a" };
  it("前回成功・同じハッシュなら飛ばす", () => {
    expect(decideSkip(ok, "a", false)).toEqual({ skip: true, reason: "変更なし" });
  });
  it("ハッシュが違う・前回失敗・記録なし・やり直し指定・毎回の工程は実行する", () => {
    expect(decideSkip(ok, "b", false).skip).toBe(false);
    expect(decideSkip({ ok: false, fingerprint: "a" }, "a", false).reason).toBe("前回失敗");
    expect(decideSkip(undefined, "a", false).reason).toBe("記録なし");
    expect(decideSkip(ok, "a", true).reason).toBe("やり直し指定");
    expect(decideSkip(ok, null, false).reason).toBe("毎回確かめる工程");
  });
});

describe("shortTime / todayInJapan", () => {
  it("日本時間で表示する", () => {
    expect(shortTime("2026-10-04T03:05:00.000Z")).toBe("10/04 12:05");
    expect(shortTime(null)).toBe("-");
    expect(todayInJapan(Date.parse("2026-10-04T15:30:00Z"))).toBe("2026-10-05");
  });
});

describe("parseArgs", () => {
  it("pnpm が渡す '--' を無視し、値をとるフラグを読む", () => {
    const { flags, positional } = parseArgs(
      ["--", "--only", "lint", "--force", "--env=prod", "x"],
      ["--only"]
    );
    expect(flagValue(flags, "--only")).toBe("lint");
    expect(flags.get("--force")).toBe(true);
    expect(flagValue(flags, "--env")).toBe("prod");
    expect(positional).toEqual(["x"]);
  });

  it("値が無いときは true になり、flagValue は null", () => {
    const { flags } = parseArgs(["--only", "--force"], ["--only"]);
    expect(flagValue(flags, "--only")).toBeNull();
  });
});
