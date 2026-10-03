/**
 * 投票の回の締切（polls.closes_at）を運営が手で直すときの、日時の読み方と確認。
 *
 * 採決前か後かは、集計のたびに responded_at < closes_at で決める。締切を動かすと、
 * 古い締切と新しい締切のあいだに入った票の区分（採決前／採決後）が入れ替わるので、
 * そうした票があるときは --force を付けたときだけ直す。
 */

export type ParsedCloseAt =
  | { ok: true; iso: string }
  | { ok: false; reason: string };

const WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const WITHOUT_OFFSET =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/;

/**
 * 「2027-02-17T14:00:00+09:00」「2027-02-17T05:00:00Z」はそのまま、
 * 「2027-02-17 14:00」「2027-02-17T14:00」（時差なし）は日本時間として読み、UTC の ISO で返す。
 */
export function parseCloseAtInput(text: string | undefined): ParsedCloseAt {
  const value = text?.trim() ?? "";
  if (!value) {
    return {
      ok: false,
      reason:
        "--at に締切の日時を指定してください（例：--at 2027-02-17T14:00+09:00。先議の議案は --early）",
    };
  }
  let candidate: string | null = null;
  if (WITH_OFFSET.test(value)) {
    candidate = value;
  } else {
    const m = value.match(WITHOUT_OFFSET);
    if (m) candidate = `${m[1]}T${m[2]}:${m[3] ?? "00"}+09:00`;
  }
  const time = candidate ? new Date(candidate).getTime() : Number.NaN;
  if (!candidate || Number.isNaN(time)) {
    return {
      ok: false,
      reason: `日時「${value}」を読めません（例：2027-02-17T14:00+09:00、2027-02-17 14:00 は日本時間）`,
    };
  }
  return { ok: true, iso: new Date(time).toISOString() };
}

/**
 * polls:set-close の --at / --early の指定を確かめる（議案ごとの先議の予定は見ない）。
 * 書き込み先に接続する前に、指定の誤りで止めるために使う。
 */
export function checkCloseFlags(input: {
  at: string | undefined;
  early: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (input.early) {
    return input.at === undefined
      ? { ok: true }
      : {
          ok: false,
          reason: "--at と --early はどちらか一方だけ指定してください",
        };
  }
  const parsed = parseCloseAtInput(input.at);
  return parsed.ok ? { ok: true } : parsed;
}

/**
 * polls:set-close の新しい締切を決める。
 * - --at <日時>：その日時
 * - --early：議案の会期の先議の予定（diet_sessions.early_vote_at）。先議で採決する議案に使う
 */
export function resolveCloseTarget(input: {
  at: string | undefined;
  early: boolean;
  /** 議案の会期の先議の予定（無ければ null） */
  earlyVoteAt: string | null;
}): ParsedCloseAt {
  const flags = checkCloseFlags(input);
  if (!flags.ok) return flags;
  if (!input.early) return parseCloseAtInput(input.at);
  if (!input.earlyVoteAt) {
    return {
      ok: false,
      reason:
        "議案の会期に先議の予定（diet_sessions.early_vote_at）がありません。--at で日時を指定してください",
    };
  }
  return parseCloseAtInput(input.earlyVoteAt);
}

/**
 * 締切を current から next に変えたとき、採決前・後の区分が入れ替わる票の responded_at の範囲
 * （gte 以上 lt 未満。lt が null なら上限なし）。区分が変わらなければ null。
 */
export function reclassifiedRange(
  current: string | null,
  next: string
): { gte: string; lt: string | null } | null {
  const nextTime = new Date(next).getTime();
  if (current === null) {
    // 締切なし（すべて採決前）→ next 以降の票が採決後になる
    return { gte: new Date(nextTime).toISOString(), lt: null };
  }
  const currentTime = new Date(current).getTime();
  if (currentTime === nextTime) return null;
  return {
    gte: new Date(Math.min(currentTime, nextTime)).toISOString(),
    lt: new Date(Math.max(currentTime, nextTime)).toISOString(),
  };
}

export type CloseChangePlan =
  | { action: "unchanged" }
  | { action: "update"; note: string | null }
  | { action: "blocked"; reason: string };

/** 締切を直してよいか（区分が入れ替わる票があれば --force が要る） */
export function planCloseChange(input: {
  current: string | null;
  currentSource: string;
  next: string;
  reclassifiedVotes: number;
  force: boolean;
}): CloseChangePlan {
  const sameTime =
    input.current !== null &&
    new Date(input.current).getTime() === new Date(input.next).getTime();
  if (sameTime && input.currentSource === "manual") {
    return { action: "unchanged" };
  }
  if (input.reclassifiedVotes > 0 && !input.force) {
    return {
      action: "blocked",
      reason: `採決前・後の区分が入れ替わる票が ${input.reclassifiedVotes} 件あります。確かめたうえで --force を付けて実行してください`,
    };
  }
  return {
    action: "update",
    note:
      input.reclassifiedVotes > 0
        ? `票 ${input.reclassifiedVotes} 件の採決前・後の区分が入れ替わります`
        : null,
  };
}
