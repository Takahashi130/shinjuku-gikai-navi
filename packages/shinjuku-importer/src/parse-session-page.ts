/**
 * 新宿区議会の会期ページ（例：令和8年 第2回定例会）のパーサー
 */

export type BillKind = "mayor" | "approval" | "consent" | "accounts" | "inquiry" | "member";

export type SessionBill = {
  kind: BillKind;
  number: number;
  /** 「第42号議案」「承認第2号」「同意第1号」「認定第1号」「諮問第1号」「議員提出議案第7号」 */
  label: string;
  name: string;
};

export type SessionPage = {
  title: string;
  /** 和暦の年（令和8年なら 8） */
  reiwaYear: number;
  /** 第◯回 */
  ordinal: number;
  type: "regular" | "extraordinary";
  startDate: string;
  endDate: string;
  /** 議案を採決する本会議の開始予定（ISO 8601、日本時間）。読めなければ null */
  finalVoteAt: string | null;
  /**
   * finalVoteAt の時刻が、採決の行に書かれた時刻ではない（直前の行の時刻・既定の 14 時など、
   * 実際の採決より早いかもしれない下限の時刻）なら true。読めなかったときも true
   */
  finalVoteTimeInferred: boolean;
  /** 先議（一部の議案を先に採決する本会議）の予定。無ければ null */
  earlyVoteAt: string | null;
  bills: SessionBill[];
  resultsPdfUrl: string | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

export function htmlToLines(html: string): string[] {
  const body = html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|td|th|dt|dd)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(body)
    .split("\n")
    .map((l) => l.replace(/[\s　]+/g, " ").trim())
    .filter(Boolean);
}

/** 全角数字を半角に */
export function toHalfWidthDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

function reiwaToYear(reiwa: number): number {
  return 2018 + reiwa;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const BILL_LINE = /^・?\s*(議員提出議案|承認|同意|認定|諮問)?第\s*(\d+)\s*号(議案)?\s+(.+)$/;

const KIND_BY_PREFIX: Record<string, BillKind> = {
  議員提出議案: "member",
  承認: "approval",
  同意: "consent",
  認定: "accounts",
  諮問: "inquiry",
};

export function parseSessionPage(html: string, pageUrl: string): SessionPage {
  // 「令和元年」は「令和1年」として扱う
  const lines = htmlToLines(html).map((l) => toHalfWidthDigits(l).replace(/令和\s*元\s*年/g, "令和1年"));

  const titleLine = lines.find((l) => /^令和\s*\d+\s*年\s*第\s*\d+\s*回\s*(定例会|臨時会)$/.test(l));
  if (!titleLine) throw new Error("会期名（例：令和8年 第2回定例会）が見つかりません");
  const [, y, o, t] = titleLine.match(/令和\s*(\d+)\s*年\s*第\s*(\d+)\s*回\s*(定例会|臨時会)/)!;
  const reiwaYear = Number(y);

  // 「令和8年6月10日（水曜日）から6月19日（金曜日）まで」または臨時会の「令和7年3月31日（月曜日）［1日間］」
  const periodIdx = lines.findIndex((l) => l === "会期");
  const periodLine =
    (periodIdx >= 0 ? lines.slice(periodIdx + 1).find((l) => /令和\s*\d+\s*年/.test(l)) : undefined) ??
    lines.find((l) => /令和\s*\d+\s*年\s*\d+\s*月\s*\d+\s*日.*から/.test(l));
  if (!periodLine) throw new Error("会期（開始日・終了日）が見つかりません");
  const p = periodLine.match(
    /令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日(?:.*?から\s*(?:令和\s*(\d+)\s*年\s*)?(\d+)\s*月\s*(\d+)\s*日)?/
  );
  if (!p) throw new Error(`会期の形式を読めません: ${periodLine}`);
  const startYear = reiwaToYear(Number(p[1]));
  const endYear = p[4] ? reiwaToYear(Number(p[4])) : startYear;
  const startDate = `${startYear}-${pad(Number(p[2]))}-${pad(Number(p[3]))}`;
  const endDate = p[5] ? `${endYear}-${pad(Number(p[5]))}-${pad(Number(p[6]))}` : startDate;

  const bills: SessionBill[] = [];
  for (const line of lines) {
    const m = line.match(BILL_LINE);
    if (!m) continue;
    const [, prefix, num, gian, rawName] = m;
    // 「第42号議案」は区長提出。接頭辞がなく「議案」もない行は議案ではない
    if (!prefix && !gian) continue;
    const name = rawName.trim();
    const number = Number(num);
    if (prefix) bills.push({ kind: KIND_BY_PREFIX[prefix], number, label: `${prefix}第${number}号`, name });
    else bills.push({ kind: "mayor", number, label: `第${number}号議案`, name });
  }

  const pdfLink = html.match(/<a[^>]+href="([^"]+\.pdf)"[^>]*>(?:(?!<\/a>)[\s\S])*審議結果/);
  const resultsPdfUrl = pdfLink ? new URL(pdfLink[1], pageUrl).toString() : null;

  const type = t === "定例会" ? "regular" : "extraordinary";
  const { finalVoteAt, finalVoteTimeInferred, earlyVoteAt } = parseVoteSchedule(lines, { startDate, type });

  return {
    title: `令和${reiwaYear}年第${o}回${t}`,
    reiwaYear,
    ordinal: Number(o),
    type,
    startDate,
    endDate,
    finalVoteAt,
    finalVoteTimeInferred,
    earlyVoteAt,
    bills,
    resultsPdfUrl,
  };
}

export type VoteSchedule = {
  finalVoteAt: string | null;
  /** finalVoteAt の時刻が採決の行に書かれていない（下限の時刻）か */
  finalVoteTimeInferred: boolean;
  earlyVoteAt: string | null;
};

const SCHEDULE_DATE_LINE = /^(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:\s*[（(][^）)]*[）)])?$/;
const SCHEDULE_TIME_PREFIX = /^(\d{1,2})\s*(?:時\s*(?:(\d{1,2})\s*分)?|[:：]\s*(\d{2}))\s*/;
/** 日程の終わり（議案の一覧や審議結果の PDF へのリンク） */
const SCHEDULE_END = /^(議案|区長提出議案|議員提出議案)$|^議案の概要/;
/** 採決の時刻が書かれていないときの時刻（本会議は 14 時に始まることが多い） */
const DEFAULT_VOTE_TIME = "14:00";

function jstIso(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

/**
 * 会期ページの「主な会議日程」から、議案を採決する本会議の日時を読む。
 *
 * - 「14時 本会議（議案の討論・採決等）」「14：00本会議（議案の採決等）」→ 採決（finalVoteAt。最後のもの）
 * - 「本会議（先議議案の採決等）」→ 先議（earlyVoteAt。最初のもの）
 * - 「本会議（追加議案の採決等）」は数えない（同じ日の本会議の続き）
 * - 時刻が書かれていない行は、同じ日の直前に書かれた時刻を使う（無ければ 14 時）。
 *   実際の採決はそれより後のことがあるので、finalVoteTimeInferred = true にする
 * - 臨時会で採決の行が無いとき（「14時 本会議」だけ）は、初日の最初の本会議の時刻（無ければ 14 時）
 * - 定例会で採決の行が無いときは null（締切は会期の最終日 14 時にする）
 */
export function parseVoteSchedule(
  lines: string[],
  session: { startDate: string; type: SessionPage["type"] }
): VoteSchedule {
  const startIdx = lines.findIndex((l) => l.replace(/\s/g, "") === "主な会議日程");
  if (startIdx === -1) return fallbackSchedule(null, session);

  const startYear = Number(session.startDate.slice(0, 4));
  const startMonth = Number(session.startDate.slice(5, 7));
  let date: string | null = null;
  let lastTime: string | null = null;
  let finalVoteAt: string | null = null;
  let finalVoteTimeInferred = true;
  let earlyVoteAt: string | null = null;
  let firstPlenaryOnStart: string | null = null;

  for (const raw of lines.slice(startIdx + 1)) {
    const line = toHalfWidthDigits(raw).trim();
    if (SCHEDULE_END.test(line)) break;
    const d = line.match(SCHEDULE_DATE_LINE);
    if (d) {
      const month = Number(d[1]);
      // 年をまたぐ会期（11月〜翌年1月など）
      const year = month < startMonth ? startYear + 1 : startYear;
      date = `${year}-${pad(month)}-${pad(Number(d[2]))}`;
      lastTime = null;
      continue;
    }
    if (!date) continue;
    const tm = line.match(SCHEDULE_TIME_PREFIX);
    if (tm) lastTime = `${pad(Number(tm[1]))}:${pad(Number(tm[2] ?? tm[3] ?? 0))}`;
    const text = (tm ? line.slice(tm[0].length) : line).replace(/\s/g, "");
    if (!text.includes("本会議")) continue;
    if (date === session.startDate && tm && !firstPlenaryOnStart) {
      firstPlenaryOnStart = jstIso(date, lastTime!);
    }
    if (!text.includes("採決")) continue;
    const at = jstIso(date, lastTime ?? DEFAULT_VOTE_TIME);
    if (text.includes("先議")) {
      earlyVoteAt ??= at;
    } else if (!text.includes("追加")) {
      finalVoteAt = at;
      finalVoteTimeInferred = !tm;
    }
  }

  if (finalVoteAt) return { finalVoteAt, finalVoteTimeInferred, earlyVoteAt };
  return { ...fallbackSchedule(firstPlenaryOnStart, session), earlyVoteAt };
}

function fallbackSchedule(
  firstPlenaryOnStart: string | null,
  session: { startDate: string; type: SessionPage["type"] }
): VoteSchedule {
  if (session.type !== "extraordinary") return { finalVoteAt: null, finalVoteTimeInferred: true, earlyVoteAt: null };
  return {
    finalVoteAt: firstPlenaryOnStart ?? jstIso(session.startDate, DEFAULT_VOTE_TIME),
    finalVoteTimeInferred: true,
    earlyVoteAt: null,
  };
}

/**
 * 会期ページから「会期」「主な会議日程」の部分の行を取り出す（解説の材料に使う）
 */
export function extractScheduleLines(html: string): string[] {
  const lines = htmlToLines(html);
  const start = lines.findIndex((l) => l === "会期と日程" || l === "会期");
  if (start === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(start)) {
    if (SCHEDULE_END.test(line)) break;
    out.push(line);
  }
  return out;
}
