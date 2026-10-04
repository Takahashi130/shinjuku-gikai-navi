// 長いコマンドの出力を、1行の要約と、失敗したときの短い抜き出しにする（すべて純粋関数）。

// biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI の色コードを消すため
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;

export function stripAnsi(text) {
  return text.replace(ANSI, "");
}

/** 3100 → "3.1s"、203000 → "3m23s" */
export function formatDuration(ms) {
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${String(s).padStart(2, "0")}s`;
}

/**
 * vitest の「Tests  3 failed | 578 passed (581)」を足し合わせる（pnpm で複数のパッケージを回したときも）。
 * @returns {{ passed: number, failed: number, skipped: number, files: number } | null}
 */
export function summarizeVitest(output) {
  const total = { passed: 0, failed: 0, skipped: 0, files: 0 };
  let found = false;
  for (const line of stripAnsi(output).split(/\r?\n/)) {
    const files = line.match(/Test Files\s+(.*)\((\d+)\)/);
    if (files) {
      total.files += Number(files[2]);
      continue;
    }
    const m = line.match(/\bTests\s+(.*)\((\d+)\)/);
    if (!m) continue;
    found = true;
    for (const key of ["passed", "failed", "skipped"]) {
      const n = m[1].match(new RegExp(`(\\d+) ${key}`));
      if (n) total[key] += Number(n[1]);
    }
  }
  return found ? total : null;
}

/** tsc の「error TS2322: ...」の数 */
export function countTscErrors(output) {
  return (stripAnsi(output).match(/error TS\d+/g) ?? []).length;
}

/**
 * biome の「Checked 1299 files」「Found 145 warnings.」「Found 2 errors.」
 * @returns {{ files: number | null, warnings: number, errors: number }}
 */
export function summarizeBiome(output) {
  const text = stripAnsi(output);
  const checked = [...text.matchAll(/Checked (\d+) files?/g)].map((m) =>
    Number(m[1])
  );
  const warnings = [...text.matchAll(/Found (\d+) warnings?/g)].map((m) =>
    Number(m[1])
  );
  const errors = [...text.matchAll(/Found (\d+) errors?/g)].map((m) =>
    Number(m[1])
  );
  return {
    files: checked.length ? Math.max(...checked) : null,
    warnings: warnings.length ? Math.max(...warnings) : 0,
    errors: errors.reduce((a, b) => a + b, 0),
  };
}

/** 工程の種類ごとに、結果を短い文字にする */
export function summarizeOutput(kind, output) {
  if (kind === "vitest") {
    const v = summarizeVitest(output);
    if (!v) return "要約なし（ログを確認）";
    const parts = [`${v.passed} passed`];
    if (v.failed) parts.push(`${v.failed} failed`);
    if (v.skipped) parts.push(`${v.skipped} skipped`);
    return parts.join(", ");
  }
  if (kind === "tsc") {
    const n = countTscErrors(output);
    return n ? `型エラー ${n} 件` : "";
  }
  if (kind === "biome") {
    const b = summarizeBiome(output);
    const parts = [];
    if (b.files !== null) parts.push(`${b.files} files`);
    if (b.errors) parts.push(`error ${b.errors}`);
    parts.push(`warning ${b.warnings}`);
    return parts.join(", ");
  }
  return "";
}

const FAILURE_LINE =
  /(FAIL\b|error TS\d+|✗|×|AssertionError|Error:|ERR_|ELIFECYCLE|failed)/;

/**
 * 失敗したときに画面に出す分だけを抜き出す：失敗を示す行（最大 maxHits 行）と、末尾 tail 行。
 * ログ全体はファイルに残っているので、ここでは短さを優先する。
 */
export function failureExcerpt(output, { maxHits = 20, tail = 20 } = {}) {
  const lines = stripAnsi(output)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  const tailStart = Math.max(0, lines.length - tail);
  const hits = [];
  for (let i = 0; i < tailStart && hits.length < maxHits; i++) {
    if (FAILURE_LINE.test(lines[i])) hits.push(lines[i]);
  }
  const out = [...hits];
  if (hits.length) out.push("…");
  out.push(...lines.slice(tailStart));
  return out.join("\n");
}

/** 表の列をそろえる（全角は2文字分として数える） */
export function padEnd(text, width) {
  let w = 0;
  for (const ch of text) w += /[　-鿿＀-￯]/.test(ch) ? 2 : 1;
  return text + " ".repeat(Math.max(0, width - w));
}
