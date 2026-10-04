// 工程の選び方と「飛ばしてよいか」の判定（check と release で共通。すべて純粋関数）。

/**
 * --only / --from で工程を選ぶ。
 * - only: "lint,test:web" のようにカンマ区切り。"test" のように ":" の前だけを書くと test:* をすべて選ぶ
 * - from: その工程から最後まで（途中からのやり直し）
 * どちらも無ければすべて。知らない名前があれば例外にする。
 * @template {{ id: string }} T
 * @param {T[]} steps
 * @param {{ only?: string | null, from?: string | null }} opts
 * @returns {T[]}
 */
export function selectSteps(steps, { only = null, from = null } = {}) {
  const ids = steps.map((s) => s.id);
  const matches = (id, token) => id === token || id.startsWith(`${token}:`);
  let selected = steps;
  if (only) {
    const tokens = only
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const unknown = tokens.filter((t) => !ids.some((id) => matches(id, t)));
    if (unknown.length)
      throw new Error(
        `知らない工程です: ${unknown.join(", ")}（使える名前: ${ids.join(", ")}）`
      );
    selected = selected.filter((s) => tokens.some((t) => matches(s.id, t)));
  }
  if (from) {
    const start = ids.findIndex((id) => matches(id, from));
    if (start < 0)
      throw new Error(`知らない工程です: ${from}（使える名前: ${ids.join(", ")}）`);
    const allowed = new Set(ids.slice(start));
    selected = selected.filter((s) => allowed.has(s.id));
  }
  return selected;
}

/**
 * 前回の記録から、この工程を飛ばしてよいかを決める。
 * 飛ばすのは「前回成功」かつ「入力のハッシュが同じ」で、やり直しの指定が無いときだけ。
 * ハッシュが null の工程（毎回確かめるもの）は飛ばさない。
 * @param {{ ok: boolean, fingerprint: string | null } | undefined} last
 * @param {string | null} fingerprint
 * @param {boolean} force
 * @returns {{ skip: boolean, reason: string }}
 */
export function decideSkip(last, fingerprint, force) {
  if (force) return { skip: false, reason: "やり直し指定" };
  if (fingerprint === null) return { skip: false, reason: "毎回確かめる工程" };
  if (!last) return { skip: false, reason: "記録なし" };
  if (!last.ok) return { skip: false, reason: "前回失敗" };
  if (last.fingerprint !== fingerprint) return { skip: false, reason: "変更あり" };
  return { skip: true, reason: "変更なし" };
}

/** ISO 日時 → "10/04 12:34"（日本時間） */
export function shortTime(iso) {
  if (!iso) return "-";
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/** 日本時間の今日（YYYY-MM-DD） */
export function todayInJapan(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
