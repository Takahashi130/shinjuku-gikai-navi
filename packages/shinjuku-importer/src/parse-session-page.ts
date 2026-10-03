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

  return {
    title: `令和${reiwaYear}年第${o}回${t}`,
    reiwaYear,
    ordinal: Number(o),
    type: t === "定例会" ? "regular" : "extraordinary",
    startDate,
    endDate,
    bills,
    resultsPdfUrl,
  };
}
