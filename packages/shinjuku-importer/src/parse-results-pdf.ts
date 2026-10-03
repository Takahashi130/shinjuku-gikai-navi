/**
 * 新宿区議会「議案の概要と審議結果」PDF のパーサー
 *
 * PDF はテキストの抽出順が表の並びと一致しないため、
 * 罫線（水平線・垂直線）でセルを確定し、文字の座標からセルに振り分ける。
 */

export type TextItem = { str: string; x: number; y: number; width: number; height: number };
/** 水平線は y、垂直線は x の座標 */
export type RuleLines = { horizontal: number[]; vertical: number[] };

export type Vote = "for" | "against" | "unknown";

export type Faction = { abbr: string; name: string };

export type ResultRow = {
  name: string;
  summary: string;
  votes: Record<string, Vote>;
  result: string;
};

export type ResultsTable = {
  factions: Faction[];
  rows: ResultRow[];
};

const MARK_FOR = /^[〇○◯]$/;
const MARK_AGAINST = /^[×✕]$/;
const RESULT_WORDS = /^(可決|否決|承認|不承認|同意|不同意|認定|不認定|採択|不採択|原案可決|修正可決)$/;

/** 近い座標をひとつにまとめる（同じ罫線が二重に描かれていることがある） */
export function dedupeCoords(values: number[], tolerance = 1): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (out.length === 0 || v - out[out.length - 1] > tolerance) out.push(v);
  }
  return out;
}

/** 「自参ク＝自民・参政クラブ」形式の凡例を読む。略称が別アイテムに分かれていても連結する */
export function parseFactionLegend(items: TextItem[]): Map<string, string> {
  const legendItems = items.filter((i) => i.str.trim());
  const lines = groupByLine(legendItems);
  const legend = new Map<string, string>();
  // 離れた位置にある文字（ページタイトルなど）を連結しないための距離
  const maxGap = 20;
  for (const line of lines) {
    let buffer = "";
    let lastKey: string | null = null;
    let prevEnd = Number.NEGATIVE_INFINITY;
    for (const item of line) {
      const s = item.str.replace(/\s/g, "");
      const adjacent = item.x - prevEnd < maxGap;
      prevEnd = item.x + item.width;
      const eq = s.indexOf("＝");
      if (eq === -1) {
        if (adjacent && lastKey && !buffer) {
          // 正式名称の続き（例：「れいわ新選組」＋「新宿」）
          legend.set(lastKey, `${legend.get(lastKey)} ${s}`);
        } else {
          buffer = adjacent ? buffer + s : s;
          lastKey = null;
        }
        continue;
      }
      const key = (adjacent ? buffer : "") + s.slice(0, eq);
      legend.set(key, s.slice(eq + 1));
      lastKey = key;
      buffer = "";
    }
  }
  return legend;
}

function groupByLine(items: TextItem[], tolerance = 2): TextItem[][] {
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

/** セル内の文字を上から順に読み、ひと続きの文にする。「・」で始まる行だけ改行を残す */
export function joinCellText(items: TextItem[]): string {
  return groupByLine(items)
    .map((line) => line.map((i) => i.str).join("").trim())
    .filter(Boolean)
    .reduce((acc, line) => {
      if (!acc) return line;
      return line.startsWith("・") ? `${acc}\n${line}` : acc + line;
    }, "");
}

function centerX(i: TextItem) {
  return i.x + i.width / 2;
}
function centerY(i: TextItem) {
  // y はベースライン。文字の中心は少し上
  return i.y + i.height * 0.35;
}

function findInterval(bounds: number[], v: number): number {
  for (let k = 0; k < bounds.length - 1; k++) {
    if (v >= bounds[k] && v < bounds[k + 1]) return k;
  }
  return -1;
}

export function parseResultsTable(items: TextItem[], rules: RuleLines): ResultsTable {
  const xs = dedupeCoords(rules.vertical);
  const ysDesc = dedupeCoords(rules.horizontal).reverse();
  const texts = items.filter((i) => i.str.trim());

  // 見出し行：「議決」の文字を含む行
  const resultHeader = texts.find((i) => i.str.replace(/\s/g, "") === "議決");
  if (!resultHeader) throw new Error("見出し「議決」が見つかりません");
  const headerRowIdx = ysDesc.findIndex((y, k) => k + 1 < ysDesc.length && centerY(resultHeader) < y && centerY(resultHeader) >= ysDesc[k + 1]);
  if (headerRowIdx === -1) throw new Error("見出し行の罫線が見つかりません");
  const headerTop = ysDesc[headerRowIdx];
  const headerBottom = ysDesc[headerRowIdx + 1];

  // 列：概要は最も幅の広い列、その左が議案名
  const widths = xs.slice(0, -1).map((x, k) => xs[k + 1] - x);
  const summaryCol = widths.indexOf(Math.max(...widths));
  const nameCol = summaryCol - 1;
  const summaryRight = xs[summaryCol + 1];

  const headerItems = texts.filter((i) => centerY(i) < headerTop && centerY(i) >= headerBottom);
  const legend = parseFactionLegend(texts.filter((i) => centerY(i) > headerTop));
  const factionHeaders = headerItems
    .filter((i) => centerX(i) > summaryRight && centerX(i) < resultHeader.x)
    .sort((a, b) => a.x - b.x);
  const factions: Faction[] = factionHeaders.map((h) => {
    const abbr = h.str.replace(/\s/g, "");
    return { abbr, name: legend.get(abbr) ?? abbr };
  });
  const factionCols = factionHeaders.map((h) => findInterval(xs, centerX(h)));
  const resultCol = findInterval(xs, centerX(resultHeader));

  // データ行：見出しより下の罫線の間
  const rowBounds = ysDesc.slice(headerRowIdx + 1);
  const rows: ResultRow[] = [];
  for (let r = 0; r < rowBounds.length - 1; r++) {
    const top = rowBounds[r];
    const bottom = rowBounds[r + 1];
    const inRow = texts.filter((i) => centerY(i) < top && centerY(i) >= bottom);
    const inCol = (col: number) => inRow.filter((i) => findInterval(xs, centerX(i)) === col);

    const name = joinCellText(inCol(nameCol));
    if (!name) continue;
    const votes: Record<string, Vote> = {};
    factions.forEach((f, k) => {
      const mark = inCol(factionCols[k]).map((i) => i.str.trim()).join("");
      votes[f.abbr] = MARK_FOR.test(mark) ? "for" : MARK_AGAINST.test(mark) ? "against" : "unknown";
    });
    const result = inCol(resultCol).map((i) => i.str.trim()).join("");
    rows.push({
      name,
      summary: joinCellText(inCol(summaryCol)),
      votes,
      result: RESULT_WORDS.test(result) ? result : result || "不明",
    });
  }
  return { factions, rows };
}
