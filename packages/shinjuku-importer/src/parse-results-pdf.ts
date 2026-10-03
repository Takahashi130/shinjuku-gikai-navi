/**
 * 新宿区議会「議案の概要と審議結果」PDF のパーサー
 *
 * PDF はテキストの抽出順が表の並びと一致しないため、
 * 罫線（水平線・垂直線）でセルを確定し、文字の座標からセルに振り分ける。
 */

export type TextItem = { str: string; x: number; y: number; width: number; height: number };
/** 水平線は y、垂直線は x の座標 */
export type RuleLines = {
  horizontal: number[];
  vertical: number[];
  /** 水平線の左右の端。結合セル（複数行にまたがる議案名）の判定に使う */
  horizontalSegments?: { y: number; x0: number; x1: number }[];
};

export type Vote = "for" | "against" | "unknown";

export type Faction = { abbr: string; name: string };

export type ResultRow = {
  name: string;
  summary: string;
  votes: Record<string, Vote>;
  /** 「1人反対」など、賛否の記号に添えられた注記 */
  voteNotes: Record<string, string>;
  result: string;
};

export type ResultsTable = {
  factions: Faction[];
  rows: ResultRow[];
};

const MARK_FOR = /^[〇○◯]/;
const MARK_AGAINST = /^[×✕]/;
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
  // 見出しの「会派名略称」は略称に連結しない
  const legendItems = items.filter((i) => i.str.trim() && !/略称$/.test(i.str.trim()));
  const lines = groupByLine(legendItems);
  const legend = new Map<string, string>();
  // 離れた位置にある文字（ページタイトルなど）を連結しないための距離
  const maxGap = 20;
  for (const line of lines) {
    let buffer = "";
    let lastKey: string | null = null;
    let prevEnd = Number.NEGATIVE_INFINITY;
    for (const [idx, item] of line.entries()) {
      const s = item.str.replace(/\s/g, "");
      const adjacent = item.x - prevEnd < maxGap;
      prevEnd = item.x + item.width;
      const eq = s.indexOf("＝");
      if (eq === -1) {
        // すぐ右に「＝」を含む文字が続くなら、次の略称の1文字目（例：「公」＋「明＝…」）
        const next = line[idx + 1];
        const startsNextKey = next?.str.includes("＝") && next.x - prevEnd < maxGap;
        if (adjacent && lastKey && !buffer && !startsNextKey) {
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

/** 凡例から正式名称を引く。略称の1文字目だけ離れて描かれている場合（「公　明＝…」）にも対応する */
export function lookupFaction(legend: Map<string, string>, abbr: string): string {
  const exact = legend.get(abbr);
  if (exact) return exact;
  for (const [key, name] of legend) {
    if (key && abbr.endsWith(key) && abbr.length - key.length === 1) return name;
  }
  return abbr;
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
  // 列の区切りは二重線で描かれていることがあるため、近い線はまとめる
  const xs = dedupeCoords(rules.vertical, 5);
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
    return { abbr, name: lookupFaction(legend, abbr) };
  });
  const factionCols = factionHeaders.map((h) => findInterval(xs, centerX(h)));
  const resultCol = findInterval(xs, centerX(resultHeader));

  // 議案名の列を横切る罫線だけで区切ったブロック（結合セルは複数行にまたがる）
  const nameColCenter = (xs[nameCol] + xs[nameCol + 1]) / 2;
  const nameBounds = rules.horizontalSegments
    ? dedupeCoords(
        rules.horizontalSegments
          .filter((s) => s.x0 <= nameColCenter && s.x1 >= nameColCenter)
          .map((s) => s.y)
      ).reverse()
    : ysDesc;
  const nameTexts = texts.filter((i) => findInterval(xs, centerX(i)) === nameCol);
  const nameAt = (y: number): string => {
    for (let k = 0; k < nameBounds.length - 1; k++) {
      if (y < nameBounds[k] && y >= nameBounds[k + 1]) {
        return joinCellText(nameTexts.filter((i) => centerY(i) < nameBounds[k] && centerY(i) >= nameBounds[k + 1]));
      }
    }
    return "";
  };

  // データ行：見出しより下の罫線の間
  const rowBounds = ysDesc.slice(headerRowIdx + 1);
  const rows: ResultRow[] = [];
  for (let r = 0; r < rowBounds.length - 1; r++) {
    const top = rowBounds[r];
    const bottom = rowBounds[r + 1];
    const inRow = texts.filter((i) => centerY(i) < top && centerY(i) >= bottom);
    const inCol = (col: number) => inRow.filter((i) => findInterval(xs, centerX(i)) === col);

    const name = nameAt((top + bottom) / 2);
    if (!name) continue;
    const votes: Record<string, Vote> = {};
    const voteNotes: Record<string, string> = {};
    factions.forEach((f, k) => {
      const mark = inCol(factionCols[k]).map((i) => i.str.trim()).join("");
      votes[f.abbr] = MARK_FOR.test(mark) ? "for" : MARK_AGAINST.test(mark) ? "against" : "unknown";
      const note = mark.replace(/^[〇○◯×✕]/, "").trim();
      if (note) voteNotes[f.abbr] = note;
    });
    const result = inCol(resultCol).map((i) => i.str.trim()).join("");
    rows.push({
      name,
      summary: joinCellText(inCol(summaryCol)),
      votes,
      voteNotes,
      result: RESULT_WORDS.test(result) ? result : result || "不明",
    });
  }
  return { factions, rows };
}

function mode(values: number[]): number | undefined {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * 罫線が描かれていない PDF 向け。文字の座標だけで表を読む。
 * - 列：議案名・概要は文字の左端がそろう位置、会派・議決は見出しの位置
 * - 行：議決結果（可決など）の高さを各行の中心とし、各列の文のかたまりを最も近い行に割り当てる
 */
export function parseResultsTableByText(items: TextItem[]): ResultsTable {
  const texts = items.filter((i) => i.str.trim());
  const resultHeader = texts.find((i) => i.str.replace(/\s/g, "") === "議決");
  if (!resultHeader) throw new Error("見出し「議決」が見つかりません");
  const headerY = centerY(resultHeader);

  // 見出し行（「議決」と同じ高さ付近）の会派略称。賛否の記号が並ぶ範囲にあるものだけ
  const markXs = texts.filter((i) => /^[〇○◯×✕]$/.test(i.str.trim()) && centerY(i) < headerY).map(centerX);
  const minMarkX = Math.min(...markXs);
  const factionHeaders = texts
    .filter((i) => Math.abs(centerY(i) - headerY) < 6 && i.x < resultHeader.x - 5 && centerX(i) > minMarkX - 12)
    .sort((a, b) => a.x - b.x);
  const legend = parseFactionLegend(texts.filter((i) => centerY(i) > headerY + 10));
  const factions: Faction[] = factionHeaders.map((h) => {
    const abbr = h.str.replace(/\s/g, "");
    return { abbr, name: lookupFaction(legend, abbr) };
  });
  const firstFactionX = factionHeaders[0]?.x ?? resultHeader.x;
  const factionPitch =
    factionHeaders.length > 1 ? (factionHeaders[factionHeaders.length - 1].x - firstFactionX) / (factionHeaders.length - 1) : 20;

  const body = texts.filter((i) => centerY(i) < headerY - 8);
  const resultItems = body
    .filter((i) => Math.abs(i.x - resultHeader.x) < 15 && RESULT_WORDS.test(i.str.trim()))
    .sort((a, b) => b.y - a.y);
  const rowYs = resultItems.map(centerY);

  // 議案名・概要の列の左端
  const wide = body.filter((i) => i.str.trim().length > 1 && i.x < firstFactionX - 10);
  const nameStart = mode(wide.filter((i) => i.x < 200).map((i) => Math.round(i.x)));
  if (nameStart === undefined) throw new Error("議案名の列が見つかりません");
  const summaryStart = mode(wide.filter((i) => i.x > nameStart + 60).map((i) => Math.round(i.x))) ?? firstFactionX;
  const inName = (i: TextItem) => i.x >= nameStart - 3 && i.x < summaryStart - 3;
  const inSummary = (i: TextItem) => i.x >= summaryStart - 3 && i.x < firstFactionX - factionPitch / 2;

  /** 列の文を、行の間隔より大きくあいたところで「かたまり」に分け、最も近い行に割り当てる */
  const assign = (colItems: TextItem[]): string[] => {
    const out: string[] = rowYs.map(() => "");
    const lines = groupByLine(colItems);
    if (lines.length === 0) return out;
    const lineHeight = Math.max(...colItems.map((i) => i.height)) * 1.6;
    const blocks: TextItem[][][] = [];
    let prevY = Number.POSITIVE_INFINITY;
    for (const line of lines) {
      const y = line[0].y;
      if (prevY - y > lineHeight || blocks.length === 0) blocks.push([line]);
      else blocks[blocks.length - 1].push(line);
      prevY = y;
    }
    for (const block of blocks) {
      // かたまりが複数の行の中心をまたぐ場合は、行の中間で分ける
      const groups = new Map<number, TextItem[]>();
      for (const line of block) {
        const y = centerY(line[0]);
        let nearest = 0;
        rowYs.forEach((ry, k) => {
          if (Math.abs(ry - y) < Math.abs(rowYs[nearest] - y)) nearest = k;
        });
        const top = centerY(block[0][0]);
        const bottom = centerY(block[block.length - 1][0]);
        const spanned = rowYs.map((ry, k) => [ry, k] as const).filter(([ry]) => ry <= top + 2 && ry >= bottom - 2);
        const target = spanned.length > 1 ? nearest : nearestRow(rowYs, (top + bottom) / 2);
        groups.set(target, [...(groups.get(target) ?? []), ...line]);
      }
      for (const [k, its] of groups) {
        const text = joinCellText(its);
        out[k] = out[k] ? `${out[k]}${text}` : text;
      }
    }
    return out;
  };

  const names = assign(body.filter(inName));
  const summaries = assign(body.filter(inSummary));

  // 結合セル：議案名がない行は、最も近い議案名のある行の名前を引き継ぐ
  const filledNames = names.map((n, k) => {
    if (n) return n;
    let best = -1;
    names.forEach((m, j) => {
      if (m && (best === -1 || Math.abs(rowYs[j] - rowYs[k]) < Math.abs(rowYs[best] - rowYs[k]))) best = j;
    });
    return best >= 0 ? names[best] : "";
  });

  const rows: ResultRow[] = resultItems.map((resultItem, k) => {
    const votes: Record<string, Vote> = {};
    const voteNotes: Record<string, string> = {};
    factionHeaders.forEach((h, f) => {
      const cx = centerX(h);
      const mark = body
        .filter((i) => Math.abs(centerX(i) - cx) < factionPitch / 2 && Math.abs(centerY(i) - rowYs[k]) < 8)
        .sort((a, b) => b.y - a.y)
        .map((i) => i.str.trim())
        .join("");
      const abbr = factions[f].abbr;
      votes[abbr] = MARK_FOR.test(mark) ? "for" : MARK_AGAINST.test(mark) ? "against" : "unknown";
      const note = mark.replace(/^[〇○◯×✕]/, "").trim();
      if (note) voteNotes[abbr] = note;
    });
    return { name: filledNames[k], summary: summaries[k], votes, voteNotes, result: resultItem.str.trim() };
  });
  return { factions, rows: rows.filter((r) => r.name) };
}

function nearestRow(rowYs: number[], y: number): number {
  let best = 0;
  rowYs.forEach((ry, k) => {
    if (Math.abs(ry - y) < Math.abs(rowYs[best] - y)) best = k;
  });
  return best;
}
