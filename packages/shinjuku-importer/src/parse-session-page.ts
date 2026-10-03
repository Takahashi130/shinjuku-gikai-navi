/**
 * 新宿区議会の会期ページ（例：令和8年 第2回定例会）のパーサー
 */

export type BillKind = "mayor" | "approval" | "member";

export type SessionBill = {
  kind: BillKind;
  number: number;
  /** 「第42号議案」「承認第2号」「議員提出議案第7号」 */
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

const BILL_LINE =
  /^・\s*(?:(議員提出議案第\s*(\d+)\s*号)|(承認第\s*(\d+)\s*号)|(第\s*(\d+)\s*号議案))\s*(.+)$/;

export function parseSessionPage(html: string, pageUrl: string): SessionPage {
  const lines = htmlToLines(html).map(toHalfWidthDigits);

  const titleLine = lines.find((l) => /^令和\s*\d+\s*年\s*第\s*\d+\s*回\s*(定例会|臨時会)$/.test(l));
  if (!titleLine) throw new Error("会期名（例：令和8年 第2回定例会）が見つかりません");
  const [, y, o, t] = titleLine.match(/令和\s*(\d+)\s*年\s*第\s*(\d+)\s*回\s*(定例会|臨時会)/)!;
  const reiwaYear = Number(y);

  const periodLine = lines.find((l) => /令和\s*\d+\s*年\s*\d+\s*月\s*\d+\s*日.*から/.test(l));
  if (!periodLine) throw new Error("会期（開始日・終了日）が見つかりません");
  const p = periodLine.match(
    /令和\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日.*?から\s*(?:令和\s*(\d+)\s*年\s*)?(\d+)\s*月\s*(\d+)\s*日/
  );
  if (!p) throw new Error(`会期の形式を読めません: ${periodLine}`);
  const startYear = reiwaToYear(Number(p[1]));
  const endYear = p[4] ? reiwaToYear(Number(p[4])) : startYear;
  const startDate = `${startYear}-${pad(Number(p[2]))}-${pad(Number(p[3]))}`;
  const endDate = `${endYear}-${pad(Number(p[5]))}-${pad(Number(p[6]))}`;

  const bills: SessionBill[] = [];
  for (const line of lines) {
    const m = line.match(BILL_LINE);
    if (!m) continue;
    const name = m[7].trim();
    if (m[1]) bills.push({ kind: "member", number: Number(m[2]), label: `議員提出議案第${m[2]}号`, name });
    else if (m[3]) bills.push({ kind: "approval", number: Number(m[4]), label: `承認第${m[4]}号`, name });
    else bills.push({ kind: "mayor", number: Number(m[6]), label: `第${m[6]}号議案`, name });
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
