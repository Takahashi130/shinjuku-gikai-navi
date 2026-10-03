/**
 * 新宿区議会「政務活動費収支一覧」（各会派収支状況）PDF のパーサー
 * 掲載ページ: https://www.city.shinjuku.lg.jp/kusei/file08_00021.html
 *
 * 表の形（年度によって列の位置・字間・注記の位置が少しずつ違う）:
 *   会派名 | 人数 | 収入 | 調査研究費 | 研修費 | 広報費 | 広聴費 | 要請・陳情活動費 | 会議費 | 資料費 | 人件費 | 事務費 | 支出合計
 * - 行は「収入から支出合計までの11個の金額が並ぶ行」を基準にする。
 *   会派名・人数・注記の番号（※1）は、その行の少し上下にずれて描かれていることがある。
 * - 費目の合計が支出合計と一致しない行はエラーにする（読み違いを見逃さないため）。
 */
import { cleanFactionName } from "./normalize-member-name";
import { reiwaToYear } from "./page-content";
import type { TextItem } from "./parse-results-pdf";

export const EXPENSE_CATEGORIES = [
  { key: "research", label: "調査研究費" },
  { key: "training", label: "研修費" },
  { key: "publicity", label: "広報費" },
  { key: "hearing", label: "広聴費" },
  { key: "petition", label: "要請・陳情活動費" },
  { key: "meeting", label: "会議費" },
  { key: "materials", label: "資料費" },
  { key: "personnel", label: "人件費" },
  { key: "office", label: "事務費" },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["key"];

export type ExpenseRow = {
  factionName: string;
  /** 表の「人数」。年度の途中で人数が変わった会派は注記を参照 */
  memberCount: number | null;
  /** 収入（区が交付した額） */
  income: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpense: number;
  /** この会派に関する注記（※1 …） */
  notes: string[];
};

export type ExpenseReport = {
  /** 年度の開始年（令和7年度なら 2025） */
  fiscalYear: number;
  /** 「令和7年4月～令和8年3月分」「20期 令和5年5月～令和6年3月分」 */
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  rows: ExpenseRow[];
  /** 表の下の注記（※1 …）すべて */
  notes: string[];
};

const NUMBER = /^\d{1,3}(,\d{3})*$|^\d+$/;

function norm(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "");
}

function isNumber(item: TextItem): boolean {
  return NUMBER.test(norm(item.str));
}

function toNumber(item: TextItem): number {
  return Number(norm(item.str).replace(/,/g, ""));
}

function groupLines(items: TextItem[], tolerance = 2): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  for (const item of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= tolerance);
    if (line) line.push(item);
    else lines.push([item]);
  }
  for (const l of lines) l.sort((a, b) => a.x - b.x);
  return lines;
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 「〔令和7年4月～令和8年3月分〕」「〔令和5年4月分〕」を読む */
export function parseExpensePeriod(text: string): { label: string; start: string; end: string } | null {
  const t = text.normalize("NFKC");
  const bracket = t.match(/(?:(\d+)期)?\s*〔([^〕]+)〕/);
  if (!bracket) return null;
  const m = bracket[2].match(/令和(\d+|元)年(\d{1,2})月(?:[~～〜](?:令和(\d+|元)年)?(\d{1,2})月)?分?/);
  if (!m) return null;
  const startYear = reiwaToYear(m[1]);
  const startMonth = Number(m[2]);
  const endYear = m[3] ? reiwaToYear(m[3]) : startYear;
  const endMonth = m[4] ? Number(m[4]) : startMonth;
  const inner = bracket[2].replace(/[~〜]/g, "～");
  return {
    label: bracket[1] ? `${bracket[1]}期 ${inner}` : inner,
    start: `${startYear}-${String(startMonth).padStart(2, "0")}-01`,
    end: lastDayOfMonth(endYear, endMonth),
  };
}

/** 表の下の注記。「※1」で始まる行を1件とし、同じ高さの文字をつなげる */
function readFootnotes(lines: TextItem[][], belowY: number): string[] {
  return lines
    .filter((l) => l[0].y < belowY)
    .map((l) => l.map((i) => i.str.trim()).join(" ").replace(/\s+/g, " ").trim())
    .filter((s) => /^※/.test(s));
}

function footnoteNumber(note: string): number | null {
  const m = note.normalize("NFKC").match(/^※\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/** 1ページ分の文字から収支の表を読む */
export function parseExpensePdf(pages: TextItem[][]): ExpenseReport {
  const allText = pages.flat().map((i) => i.str).join("");
  const yearMatch = allText.normalize("NFKC").match(/令和\s*(\d+|元)\s*年度/);
  if (!yearMatch) throw new Error("年度（令和◯年度）が見つかりません");
  const period = parseExpensePeriod(allText.replace(/\s+/g, ""));
  if (!period) throw new Error("対象期間（〔令和◯年◯月～…分〕）が見つかりません");

  const rows: ExpenseRow[] = [];
  const notes: string[] = [];
  for (const pageItems of pages) {
    const items = pageItems.filter((i) => i.str.trim());
    const headers = EXPENSE_CATEGORIES.map((c) => {
      const label = c.key === "petition" ? "陳情活動費" : c.label;
      return items.find((i) => norm(i.str) === label);
    });
    if (headers.some((h) => !h)) continue;
    const headerXs = headers.map((h) => h!.x);
    if (headerXs.some((x, k) => k > 0 && x <= headerXs[k - 1])) {
      throw new Error("費目の並びが想定（調査研究費〜事務費）と違います");
    }
    const headerBottom = Math.min(...headers.map((h) => h!.y));

    const lines = groupLines(items.filter((i) => i.y < headerBottom - 1));
    const totalIdx = lines.findIndex((l) => norm(l.map((i) => i.str).join("")).startsWith("合計"));
    if (totalIdx === -1) throw new Error("合計の行が見つかりません");
    const totalY = lines[totalIdx][0].y;
    const anchors = lines.filter((l) => l[0].y > totalY && l.filter(isNumber).length >= 11);

    const footnotes = readFootnotes(lines, totalY);
    notes.push(...footnotes);
    const pageRows: ExpenseRow[] = [];

    for (const [k, anchor] of anchors.entries()) {
      const y = anchor[0].y;
      const upper = k === 0 ? headerBottom - 1 : (anchors[k - 1][0].y + y) / 2;
      const lower = k === anchors.length - 1 ? totalY + 1 : (anchors[k + 1][0].y + y) / 2;
      const money = anchor.filter(isNumber).slice(-11);
      const incomeX = money[0].x;
      const band = items.filter((i) => i.y < upper && i.y > lower && i.x < incomeX - 3);

      // 人数：収入の左にある数字のうち、いちばん右のもの（左の数字は注記の番号）
      const countCandidates = band.filter((i) => isNumber(i) && toNumber(i) <= 99).sort((a, b) => b.x - a.x);
      const countItem = countCandidates[0];
      const labelText = groupLines(band.filter((i) => i !== countItem))
        .map((l) => l.map((i) => i.str).join(" "))
        .join(" ");
      const markers = [...labelText.normalize("NFKC").matchAll(/※\s*(\d+)/g)].map((m) => Number(m[1]));
      const factionName = cleanFactionName(labelText.replace(/[（(]?※\s*[0-9０-９]*[）)]?/g, " "));
      if (!factionName) throw new Error(`${k + 1} 行目の会派名が読めません`);

      const values = money.map(toNumber);
      const expenses = Object.fromEntries(EXPENSE_CATEGORIES.map((c, j) => [c.key, values[j + 1]])) as Record<
        ExpenseCategory,
        number
      >;
      const totalExpense = values[10];
      const sum = Object.values(expenses).reduce((a, b) => a + b, 0);
      if (sum !== totalExpense) {
        throw new Error(`${factionName} の費目の合計 ${sum} が支出合計 ${totalExpense} と一致しません`);
      }
      const nameKey = factionName.replace(/\s+/g, "");
      pageRows.push({
        factionName,
        memberCount: countItem ? toNumber(countItem) : null,
        income: values[0],
        expenses,
        totalExpense,
        notes: footnotes.filter((n) => {
          const num = footnoteNumber(n);
          return (num !== null && markers.includes(num)) || n.replace(/\s+/g, "").includes(`「${nameKey}」`);
        }),
      });
    }

    // 合計の行と、会派の行を足した額が合うか確かめる（行の読み落とし・読み違いを見逃さないため）
    const totals = lines[totalIdx].filter(isNumber).slice(-11).map(toNumber);
    const sums = [
      pageRows.reduce((a, r) => a + r.income, 0),
      ...EXPENSE_CATEGORIES.map((c) => pageRows.reduce((a, r) => a + r.expenses[c.key], 0)),
      pageRows.reduce((a, r) => a + r.totalExpense, 0),
    ];
    if (totals.length === 11 && totals.some((v, j) => v !== sums[j])) {
      throw new Error(`会派の行の合計（${sums.join(",")}）が表の合計（${totals.join(",")}）と一致しません`);
    }
    rows.push(...pageRows);
  }
  if (rows.length === 0) throw new Error("会派の行が見つかりません");
  return {
    fiscalYear: reiwaToYear(yearMatch[1]),
    periodLabel: period.label,
    periodStart: period.start,
    periodEnd: period.end,
    rows,
    notes,
  };
}

export type ExpenseReportLink = { title: string; pdfUrl: string };

/** 政務活動費のページから「令和◯年度 政務活動費収支一覧」の PDF リンクを取り出す */
export function extractExpenseReportLinks(html: string, pageUrl: string): ExpenseReportLink[] {
  const links: ExpenseReportLink[] = [];
  for (const m of html.matchAll(/<a[^>]+href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/\[PDF[^\]]*\]/g, "")
      .replace(/（新規ウィンドウ表示）/g, "")
      .replace(/[\s　]+/g, " ")
      .trim();
    if (!/年度\s*政務活動費収支一覧/.test(text)) continue;
    links.push({ title: text, pdfUrl: new URL(m[1], pageUrl).toString() });
  }
  return links;
}
