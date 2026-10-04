import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "./io.mjs";
import {
  ENV_RULES,
  evaluateEnv,
  evaluatePreflight,
  importerArgs,
  parseMigrationList,
  parseVercelEnvNames,
  planRelease,
  RELEASE_STEPS,
  restoreGitignore,
  withGuardSteps,
} from "./release-plan.mjs";

describe("planRelease", () => {
  const steps = [
    { id: "preflight", envs: ["dev", "prod"] },
    { id: "db", envs: ["dev", "prod"] },
    { id: "deploy", envs: ["prod"] },
    { id: "smoke", envs: ["dev", "prod"] },
  ];
  const state = {
    steps: {
      db: { ok: true, fingerprint: "m1", at: "2026-10-04T00:00:00Z" },
      deploy: { ok: false, fingerprint: "c1", at: "2026-10-04T00:00:00Z" },
    },
  };
  const fps = { preflight: null, db: "m1", deploy: "c1", smoke: null };

  it("成功済みで入力が同じ工程は飛ばし、毎回の工程・失敗した工程は実行する", () => {
    const plan = planRelease(steps, state, fps, { env: "prod", forced: new Set() });
    expect(plan.map((p) => [p.id, p.action, p.reason])).toEqual([
      ["preflight", "run", "毎回確かめる"],
      ["db", "skip", "済み（変更なし）"],
      ["deploy", "run", "前回失敗"],
      ["smoke", "run", "毎回確かめる"],
    ]);
  });

  it("対象外の環境・入力の変更・やり直し指定", () => {
    const plan = planRelease(steps, state, { ...fps, db: "m2" }, { env: "dev", forced: new Set(["smoke"]) });
    expect(plan.find((p) => p.id === "deploy")?.action).toBe("n/a");
    expect(plan.find((p) => p.id === "db")?.reason).toBe("前回から変更あり");
    expect(plan.find((p) => p.id === "smoke")?.reason).toBe("やり直し指定");
    const forcedDb = planRelease(steps, state, fps, { env: "dev", forced: new Set(["db"]) });
    expect(forcedDb.find((p) => p.id === "db")?.action).toBe("run");
  });

  it("前回は飛ばしただけ（skipped）の工程は、入力が同じでも済みにしない", () => {
    const skippedState = { steps: { db: { ok: true, skipped: true, fingerprint: "m1", at: "2026-10-04T00:00:00Z" } } };
    const plan = planRelease(steps, skippedState, fps, { env: "dev", forced: new Set() });
    expect(plan.find((p) => p.id === "db")).toEqual({ id: "db", action: "run", reason: "前回は飛ばした" });
  });
});

describe("withGuardSteps", () => {
  const pick = (...ids) => RELEASE_STEPS.filter((s) => ids.includes(s.id));
  const ids = (r) => r.steps.map((s) => s.id);

  it("開発用で書き込む工程（db）だけを選んでも、preflight を先に通す（別ブランチから共有 DB に当てないため）", () => {
    const r = withGuardSteps(pick("db"), "dev");
    expect(ids(r)).toEqual(["preflight", "db"]);
    expect(r.added).toEqual(["preflight"]);
  });

  it("開発用で書き込まない工程だけなら何も足さない", () => {
    expect(withGuardSteps(pick("env", "smoke"), "dev")).toEqual({ steps: pick("env", "smoke"), added: [] });
  });

  it("開発用の deploy は対象外なので、書き込む工程に数えない", () => {
    expect(withGuardSteps(pick("deploy"), "dev").added).toEqual([]);
  });

  it("本番で書き込む工程を選ぶと、preflight と env を先に通す（順番は工程の順）", () => {
    const r = withGuardSteps(pick("db", "data:members"), "prod");
    expect(ids(r)).toEqual(["preflight", "env", "db", "data:members"]);
    expect(r.added).toEqual(["preflight", "env"]);
  });

  it("本番で書き込まない工程だけなら preflight だけを足す", () => {
    expect(ids(withGuardSteps(pick("smoke"), "prod"))).toEqual(["preflight", "smoke"]);
    expect(withGuardSteps(pick("env"), "prod").added).toEqual(["preflight"]);
  });

  it("すでに選んでいる工程は重ねない", () => {
    const all = withGuardSteps(RELEASE_STEPS, "prod");
    expect(all.added).toEqual([]);
    expect(ids(all)).toEqual(RELEASE_STEPS.map((s) => s.id));
  });
});

describe("evaluatePreflight", () => {
  const clean = { branch: "develop", dirtyCount: 0, ahead: 0, behind: 0, checkStale: [] };

  it("すべて満たせば問題なし", () => {
    expect(evaluatePreflight({ env: "prod", ...clean })).toEqual({ blockers: [], warnings: [] });
  });

  it("本番は未コミット・未 push・遅れ・check 未済をすべて止める理由にする", () => {
    const r = evaluatePreflight({ env: "prod", branch: "develop", dirtyCount: 2, ahead: 1, behind: 3, checkStale: ["test:web"] });
    expect(r.blockers).toHaveLength(4);
    expect(r.warnings).toHaveLength(0);
  });

  it("開発用は develop 以外だけを止め、ほかは注意にする", () => {
    const r = evaluatePreflight({ env: "dev", branch: "develop", dirtyCount: 2, ahead: null, behind: null, checkStale: ["lint"] });
    expect(r.blockers).toEqual([]);
    expect(r.warnings).toHaveLength(3);
    expect(evaluatePreflight({ env: "dev", ...clean, branch: "feat/x" }).blockers[0]).toMatch(/develop ではありません/);
  });
});

describe("evaluateEnv", () => {
  const full = Object.fromEntries(ENV_RULES.required.map((k) => [k, "x".repeat(40)]));

  it("開発用（値あり）は、無い・空・短すぎるを見分ける（値は返さない）", () => {
    const r = evaluateEnv({ ...full, SUPABASE_URL: "", PARTICIPATION_HASH_SECRET: "tiny-secret-value" });
    expect(r.missing).toEqual(["SUPABASE_URL"]);
    expect(r.short).toEqual(["PARTICIPATION_HASH_SECRET（32文字以上が必要）"]);
    expect(JSON.stringify(r)).not.toContain("tiny-secret-value");
    expect(r.missingRecommended).toEqual(["NEXT_PUBLIC_WEB_URL"]);
    expect(r.decide).toEqual(["NEXT_PUBLIC_GA_TRACKING_ID: なし"]);
  });

  it("本番（名前だけ）は有無だけを見る", () => {
    const r = evaluateEnv(ENV_RULES.required.filter((k) => k !== "PARTICIPATION_HASH_SECRET"));
    expect(r.missing).toEqual(["PARTICIPATION_HASH_SECRET"]);
    expect(r.short).toEqual([]);
  });
});

describe("parseVercelEnvNames", () => {
  it("表から変数名だけを取り出す", () => {
    const out = [
      "Vercel CLI 48.0.0",
      "> Environment Variables found for someone/project [200ms]",
      "",
      " name                        value         environments        created",
      " SUPABASE_URL                Encrypted     Production          3d ago",
      " NEXT_PUBLIC_WEB_URL         Encrypted     Production          3d ago",
    ].join("\n");
    expect(parseVercelEnvNames(out)).toEqual(["NEXT_PUBLIC_WEB_URL", "SUPABASE_URL"]);
  });
});

describe("parseMigrationList", () => {
  it("適用済み・未適用・DB にだけあるものを数える", () => {
    const out = [
      "   Local          | Remote         | Time (UTC)",
      "  ----------------|----------------|---------------------",
      "   20261004120000 | 20261004120000 | 2026-10-04 12:00:00",
      "   20261006100000 |                | 2026-10-06 10:00:00",
      "                  | 20261005100000 | 2026-10-05 10:00:00",
    ].join("\n");
    expect(parseMigrationList(out)).toEqual({
      applied: 1,
      pending: ["20261006100000"],
      remoteOnly: ["20261005100000"],
    });
    expect(parseMigrationList("Cannot connect")).toBeNull();
  });

  it("JSON で出たときも読む", () => {
    const out = JSON.stringify({
      migrations: [
        { local: "20261004120000", remote: "20261004120000", time: "x" },
        { local: "20261006100000", remote: "", time: "x" },
      ],
      message: "Migrations listed",
    });
    expect(parseMigrationList(out)).toEqual({ applied: 1, pending: ["20261006100000"], remoteOnly: [] });
    expect(parseMigrationList('{"migrations":[]}')).toBeNull();
  });
});

describe("restoreGitignore", () => {
  const before = "node_modules\n.vercel\n";
  it('末尾に ".env*" だけが足されたときは元に戻す', () => {
    expect(restoreGitignore(before, `${before}.env*\n`)).toBe(before);
    expect(restoreGitignore(before, `${before}\n.env*\n`)).toBe(before);
  });
  it("変わっていない・ほかの変更が混ざっているときは戻さない", () => {
    expect(restoreGitignore(before, before)).toBeNull();
    expect(restoreGitignore(before, `${before}.env*\nfoo\n`)).toBeNull();
    expect(restoreGitignore(before, "other\n.env*\n")).toBeNull();
  });
});

describe("RELEASE_STEPS", () => {
  it("importer の工程が指すファイルはある", () => {
    const ids = RELEASE_STEPS.map((s) => s.id).filter((id) => importerArgs(id));
    expect(ids).toEqual(["data:ingest", "data:members", "data:questions", "data:expenses", "data:faction-votes"]);
    for (const id of ids) {
      expect(existsSync(join(ROOT, "packages/shinjuku-importer", importerArgs(id)[0]))).toBe(true);
    }
  });

  it("順番の決まり：members は questions より先、ingest は faction-votes より先、deploy は smoke より先", () => {
    const order = RELEASE_STEPS.map((s) => s.id);
    const before = (a, b) => order.indexOf(a) < order.indexOf(b);
    expect(before("data:members", "data:questions")).toBe(true);
    expect(before("data:ingest", "data:faction-votes")).toBe(true);
    expect(before("env", "db")).toBe(true);
    expect(before("db", "data:ingest")).toBe(true);
    expect(before("data:ingest", "explainers")).toBe(true);
    expect(before("deploy", "smoke")).toBe(true);
  });
});
