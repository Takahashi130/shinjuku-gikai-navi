import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { childEnv, logPathFor, rel, ROOT } from "./io.mjs";

describe("childEnv", () => {
  it("親の pnpm -s が伝える「静かに」の設定を外し、色を止める", () => {
    process.env.npm_config_reporter = "silent";
    try {
      const env = childEnv({ EXTRA: "1" });
      expect(env.npm_config_reporter).toBeUndefined();
      expect(env.NO_COLOR).toBe("1");
      expect(env.EXTRA).toBe("1");
    } finally {
      delete process.env.npm_config_reporter;
    }
  });
});

describe("logPathFor / rel", () => {
  it("工程名をファイル名に使える形にして .logs/<group>/ に置く", () => {
    expect(rel(logPathFor("check", "typecheck:web"))).toBe(
      join(".logs", "check", "typecheck-web.log")
    );
    expect(rel(join(ROOT, "x"))).toBe("x");
  });
});
