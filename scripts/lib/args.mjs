// コマンドの引数を読む（scripts/*.mjs で共通）。
// `pnpm check -- --only lint` のように pnpm が "--" を渡してくることがあるので、"--" だけの引数は無視する。

/**
 * @param {string[]} argv process.argv.slice(2)
 * @param {string[]} valueFlags 値をとるフラグ（例: ["--only", "--env"]）
 * @returns {{ flags: Map<string, string | true>, positional: string[] }}
 */
export function parseArgs(argv, valueFlags = []) {
  const flags = new Map();
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        flags.set(a.slice(0, eq), a.slice(eq + 1));
        continue;
      }
      const next = argv[i + 1];
      if (
        valueFlags.includes(a) &&
        next !== undefined &&
        !next.startsWith("--")
      ) {
        flags.set(a, next);
        i++;
      } else flags.set(a, true);
    } else positional.push(a);
  }
  return { flags, positional };
}

/** 値をとるフラグの値（無い・値が無いときは null） */
export function flagValue(flags, name) {
  const v = flags.get(name);
  return typeof v === "string" ? v : null;
}
