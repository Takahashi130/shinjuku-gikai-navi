// 検査一式（pnpm check）の工程の定義。release の preflight と status もここを使う。
// inputs に書いたファイルの中身が前回成功時と同じなら、その工程は飛ばす（fingerprint.mjs）。
// integration テストは入れない。.env が開発用のクラウド DB を指しているので、手元で実行すると
// そこにテスト用の行を作成・削除してしまう（CI の integration_test.yml で回る）。

import { join } from "node:path";
import { computeFingerprint, listRepoFiles } from "./fingerprint.mjs";
import { CACHE_DIR, readJson } from "./io.mjs";

const DEPS = ["pnpm-lock.yaml", "pnpm-workspace.yaml"];

export const CHECK_STEPS = [
  {
    id: "lint",
    cmd: ["pnpm", "lint"],
    kind: "biome",
    inputs: [...DEPS, "package.json", "biome.json", "web/src/", "admin/src/", "tests/"],
  },
  {
    id: "typecheck:web",
    cmd: ["pnpm", "--filter", "web", "typecheck"],
    kind: "tsc",
    // web/tsconfig.json の paths で @test-utils/* → tests/supabase/*（integration テストが import し、tsc の対象）
    inputs: [...DEPS, "web/", "packages/", "tests/supabase/"],
  },
  {
    id: "typecheck:admin",
    cmd: ["pnpm", "--filter", "admin", "typecheck"],
    kind: "tsc",
    inputs: [...DEPS, "admin/", "packages/"],
  },
  {
    id: "typecheck:packages",
    cmd: ["pnpm", "--filter", "./packages/**", "--filter", "./worker", "run", "typecheck"],
    kind: "tsc",
    inputs: [...DEPS, "packages/", "worker/"],
  },
  {
    id: "test:packages",
    cmd: ["pnpm", "--filter", "./packages/**", "run", "test"],
    kind: "vitest",
    inputs: [...DEPS, "packages/"],
  },
  {
    id: "test:web",
    // web/vitest.config.mts が *.integration.test.ts を除いている
    cmd: ["pnpm", "--filter", "web", "test"],
    kind: "vitest",
    inputs: [...DEPS, "web/", "packages/"],
  },
  {
    id: "test:admin",
    cmd: ["pnpm", "--filter", "admin", "test"],
    kind: "vitest",
    inputs: [...DEPS, "admin/", "packages/"],
  },
  {
    id: "test:scripts",
    cmd: ["pnpm", "test:scripts"],
    kind: "vitest",
    inputs: [...DEPS, "package.json", "scripts/"],
  },
];

export const CHECK_STATE_PATH = join(CACHE_DIR, "check-state.json");

/** 工程の入力のハッシュ。コマンドと Node のメジャー版も含める（変わったらやり直す） */
export function checkFingerprint(root, step, files) {
  const nodeMajor = process.versions.node.split(".")[0];
  return computeFingerprint(
    root,
    step.inputs,
    { cmd: step.cmd, node: nodeMajor },
    files
  );
}

/**
 * 今の作業ツリーで、すべての工程が「前回成功・変更なし」かどうか。
 * @returns {{ passed: boolean, stale: string[], lastAt: string | null }}
 *   stale: やり直しが必要な工程（失敗・変更あり・記録なし）
 */
export function checkStatusNow(root) {
  const state = readJson(CHECK_STATE_PATH, { steps: {} });
  const files = listRepoFiles(root);
  const stale = CHECK_STEPS.filter((step) => {
    const last = state.steps?.[step.id];
    return !last?.ok || last.fingerprint !== checkFingerprint(root, step, files);
  }).map((s) => s.id);
  return { passed: stale.length === 0, stale, lastAt: state.lastRun?.at ?? null };
}
