import { normalizeMaterialText } from "./normalize-material-text";

/**
 * 文から数字・日付・金額を取り出し、表記の違いに左右されない形（key）にする。
 *
 * - 日付：和暦・西暦をそろえる（「令和8年12月1日」「2026年12月1日」→ D:2026-12-01）
 * - 金額・数：単位（兆・億・万・千）をかけた値にする（「2億2,990万円」→ N:229900000、
 *   「514,734千円」→ N:514734000）
 * - 「約」「程度」などが付いた数（approx）は、資料の該当箇所（解説の抜き出し）の数を、
 *   表示した最後の桁で丸めた（四捨五入・切り捨て）ときに一致すればよい（figureInMaterial）
 * - 表の列の区切りが消えてくっついた数（「193,612,345,6781,234,567」）は、3桁区切りの
 *   形で分けて読む
 *
 * 解説の数字が資料にあるかを確かめるために使う。
 */

export type Figure = {
  /** 文中の表記 */
  raw: string;
  /** 比べるための形（D:2026-12-01、MD:12-01、YM:2026-12、FY:2026、Y:2026、N:229900000） */
  key: string;
  /** 数の値（N: のときだけ） */
  value?: number;
  /** 「約」「程度」などが付いている */
  approx: boolean;
  /**
   * 表示した最後の桁の位（N: のときだけ）。「1,936億」なら 1億、「2.3億」なら 1,000万、
   * 「5億1,473万」なら 1万、「514,734千」なら 1千、「3,000」なら 1,000（末尾の 0 は位取り）
   */
  step?: number;
  /** 数のすぐ後の単位（円・人・件・% など。無ければ null。N: のときだけ） */
  unit?: string | null;
};

const ERA_BASE: Record<string, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 };

function eraYear(era: string | undefined, year: string): number {
  const n = year === "元" ? 1 : Number(year);
  return era ? ERA_BASE[era] + n : n;
}

const pad = (n: number | string) => String(n).padStart(2, "0");

// 日付は長いものから順に当てる（「令和8年12月1日」を「12月1日」より先に）
const S = "\\s*";
const ERA = `(令和|平成|昭和)${S}(元|\\d{1,2})`;
const DATE_PATTERNS: {
  re: RegExp;
  keys: (m: RegExpExecArray) => string[];
}[] = [
  {
    re: new RegExp(`${ERA}${S}年${S}(\\d{1,2})${S}月${S}(\\d{1,2})${S}日`, "g"),
    keys: (m) => {
      const y = eraYear(m[1], m[2]);
      return [`D:${y}-${pad(m[3])}-${pad(m[4])}`];
    },
  },
  {
    re: new RegExp(
      `(\\d{4})${S}年${S}(\\d{1,2})${S}月${S}(\\d{1,2})${S}日`,
      "g"
    ),
    keys: (m) => [`D:${m[1]}-${pad(m[2])}-${pad(m[3])}`],
  },
  {
    re: new RegExp(`${ERA}${S}年${S}度`, "g"),
    keys: (m) => [`FY:${eraYear(m[1], m[2])}`],
  },
  {
    re: new RegExp(`(\\d{4})${S}年${S}度`, "g"),
    keys: (m) => [`FY:${m[1]}`],
  },
  {
    re: new RegExp(`${ERA}${S}年${S}(\\d{1,2})${S}月(?!${S}\\d)`, "g"),
    keys: (m) => [`YM:${eraYear(m[1], m[2])}-${pad(m[3])}`],
  },
  {
    re: new RegExp(`(\\d{4})${S}年${S}(\\d{1,2})${S}月(?!${S}\\d)`, "g"),
    keys: (m) => [`YM:${m[1]}-${pad(m[2])}`],
  },
  {
    re: new RegExp(`${ERA}${S}年`, "g"),
    keys: (m) => [`Y:${eraYear(m[1], m[2])}`],
  },
  {
    re: new RegExp(`(?<!\\d)(\\d{4})${S}年`, "g"),
    keys: (m) => [`Y:${m[1]}`],
  },
  {
    re: new RegExp(`(?<!\\d)(\\d{1,2})${S}月${S}(\\d{1,2})${S}日`, "g"),
    keys: (m) => [`MD:${pad(m[1])}-${pad(m[2])}`],
  },
  {
    re: new RegExp(`(?<!\\d)(\\d{1,2})${S}月(?!${S}\\d)`, "g"),
    keys: (m) => [`M:${pad(m[1])}`],
  },
  {
    re: new RegExp(`(?<!\\d)(\\d{1,2})${S}日`, "g"),
    keys: (m) => [`DAY:${pad(m[1])}`],
  },
];

/** 資料の側では、日付から短い形も作っておく（解説が「12月1日」「12月」とだけ書く場合に備える） */
function derivedDateKeys(key: string): string[] {
  const d = key.match(/^D:(\d{4})-(\d{2})-(\d{2})$/);
  if (d) {
    return [
      `MD:${d[2]}-${d[3]}`,
      `YM:${d[1]}-${d[2]}`,
      `Y:${d[1]}`,
      `M:${d[2]}`,
      `DAY:${d[3]}`,
    ];
  }
  const ym = key.match(/^YM:(\d{4})-(\d{2})$/);
  if (ym) return [`Y:${ym[1]}`, `M:${ym[2]}`];
  const md = key.match(/^MD:(\d{2})-(\d{2})$/);
  if (md) return [`M:${md[1]}`, `DAY:${md[2]}`];
  const fy = key.match(/^FY:(\d{4})$/);
  if (fy) return [`Y:${fy[1]}`];
  return [];
}

const BIG_UNIT: Record<string, number> = { 兆: 1e12, 億: 1e8, 万: 1e4 };
const SMALL_UNIT: Record<string, number> = { 千: 1e3, 百: 1e2 };
const APPROX_BEFORE = /(約|およそ|概ね|おおむね|ほぼ)\s*$/;
const APPROX_AFTER =
  /^\s*[^\s\d]{0,2}?\s*(程度|余り|あまり|超|強|弱|前後|ほど)/;

/**
 * 1つの数の表記。3桁区切りの数は、先頭が1〜3桁で、続く区切りがちょうど3桁のものだけを
 * 1つの数とみなす。表の列の区切りが消えて「193,612,345,6781,234,567」のように
 * 数がくっついていても、「193,612,345,678」と「1,234,567」に分けて読める。
 */
const NUMBER_RE = /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/y;

/** 数のすぐ後の単位（長いものから）。同じ意味の書き方は1つにそろえる */
const UNIT_RE =
  /^\s?(円|人|名|件|世帯|戸|台|校|園|か所|カ所|ヶ所|箇所|床|室|団体|社|回|本|冊|か月|ヶ月|年|時間|%|km|m2|m|ha|kWh|kW|kg|t)/;
const UNIT_ALIASES: Record<string, string> = {
  名: "人",
  カ所: "か所",
  ヶ所: "か所",
  箇所: "か所",
  ヶ月: "か月",
};

function readUnit(textAfter: string): string | null {
  const m = textAfter.match(UNIT_RE);
  if (!m) return null;
  return UNIT_ALIASES[m[1]] ?? m[1];
}

/** 小数の計算で出る端数（2.3 × 1億 = 229999999.99999997 など）を消す */
function clean(n: number): number {
  return Number(n.toPrecision(15));
}

/**
 * 数の表記の最後の桁の位（単位をかけたもの）。
 * 小数があれば小数の最後の桁（「2.3億」→ 1,000万）。整数の末尾の 0 は位取りとみなし、
 * 0 でない最後の桁にする（「約3,000人」→ 1,000、「1,936億」→ 1億、「380億」→ 10億）。
 */
function displayStep(numeral: string, multiplier: number): number {
  const [intPart, decimals = ""] = numeral.replace(/,/g, "").split(".");
  if (decimals.length > 0) return clean(10 ** -decimals.length * multiplier);
  const trailingZeros = /^0+$/.test(intPart)
    ? 0
    : (intPart.match(/0+$/)?.[0].length ?? 0);
  return clean(10 ** trailingZeros * multiplier);
}

/** 「2億2,990万」「514,734千」「31万5,000」などを1つの数として読む */
function readNumbers(text: string): Figure[] {
  const out: Figure[] = [];
  let i = 0;
  /** 直前の数がここで終わり、すぐ後に数字が続いている（くっついた数）位置 */
  let gluedAt = -1;
  while (i < text.length) {
    if (
      !/\d/.test(text[i]) ||
      (i > 0 && i !== gluedAt && /[\d.,]/.test(text[i - 1]))
    ) {
      i++;
      continue;
    }
    const start = i;
    let total = 0;
    let step = 1;
    let hasBigUnit = false;
    let lastEnd = i;
    for (;;) {
      NUMBER_RE.lastIndex = i;
      const m = NUMBER_RE.exec(text);
      if (!m) break;
      let n = Number(m[0].replace(/,/g, ""));
      let multiplier = 1;
      let j = i + m[0].length;
      while (text[j] === " ") j++;
      if (SMALL_UNIT[text[j]]) {
        multiplier *= SMALL_UNIT[text[j]];
        j++;
      }
      if (BIG_UNIT[text[j]]) {
        multiplier *= BIG_UNIT[text[j]];
        n *= multiplier;
        total += n;
        step = displayStep(m[0], multiplier);
        hasBigUnit = true;
        lastEnd = j + 1;
        // 「2億 2,990万」のように続く数を読む
        let k = j + 1;
        while (text[k] === " ") k++;
        if (/\d/.test(text[k] ?? "")) {
          i = k;
          continue;
        }
        break;
      }
      n *= multiplier;
      total += n;
      step = displayStep(m[0], multiplier);
      lastEnd = text[j - 1] === " " ? i + m[0].length : j;
      break;
    }
    total = clean(total);
    const raw = text.slice(start, lastEnd).trim();
    if (raw) {
      const approx =
        APPROX_BEFORE.test(text.slice(Math.max(0, start - 5), start)) ||
        APPROX_AFTER.test(text.slice(lastEnd, lastEnd + 8));
      // 1桁の数で単位の無いものは、番号や「2つ」などとして比べない印を付ける
      const ignorable = !hasBigUnit && total < 10 && !/[千百]/.test(raw);
      out.push({
        raw,
        key: `${ignorable ? "n" : "N"}:${total}`,
        value: total,
        approx,
        step,
        unit: readUnit(text.slice(lastEnd, lastEnd + 6)),
      });
    }
    gluedAt = /\d/.test(text[lastEnd] ?? "") ? lastEnd : -1;
    i = Math.max(lastEnd, start + 1);
  }
  return out;
}

/** 文から数字・日付・金額を取り出す（日付の中の数は数としては数えない） */
export function extractFigures(text: string): Figure[] {
  let rest = normalizeMaterialText(text).replace(/\n/g, " ");
  const figures: Figure[] = [];
  for (const { re, keys } of DATE_PATTERNS) {
    re.lastIndex = 0;
    rest = rest.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      for (const key of keys(m)) {
        figures.push({ raw: m[0], key, approx: false });
      }
      return " ";
    });
  }
  return [...figures, ...readNumbers(rest)];
}

/** 資料の側の数（「約」付きの数と比べる） */
export type MaterialNumber = { value: number; unit: string | null };

export type MaterialFigureIndex = {
  keys: Set<string>;
  numbers: MaterialNumber[];
};

/** 資料の側の数字・日付の一覧を作る */
export function indexMaterialFigures(texts: string[]): MaterialFigureIndex {
  const keys = new Set<string>();
  const numbers: MaterialNumber[] = [];
  for (const text of texts) {
    for (const f of extractFigures(text)) {
      keys.add(f.key);
      for (const k of derivedDateKeys(f.key)) keys.add(k);
      if (f.value !== undefined) {
        keys.add(`N:${f.value}`);
        numbers.push({ value: f.value, unit: f.unit ?? null });
      }
    }
  }
  return { keys, numbers };
}

/** 照合しない数（1桁の番号など）か */
export function isIgnorableFigure(f: Figure): boolean {
  return f.key.startsWith("n:");
}

/**
 * 「約」付きの数が、資料の数を表示した桁で丸めた値になっているか。
 * 四捨五入（x − 桁/2 ≦ v < x + 桁/2）か切り捨て（x ≦ v < x + 桁）で一致すればよい。
 * 単位が両方に書かれていて食い違うもの（円と人など）は一致としない。
 *
 * 例：約1,936億円 → 1,935.5億以上 1,937億未満の数が要る。
 *     約2.3億円 → 2.25億以上 2.4億未満、約3,000人 → 2,500人以上 4,000人未満。
 */
export function approxFigureMatches(f: Figure, n: MaterialNumber): boolean {
  if (f.value === undefined || f.step === undefined) return false;
  if (f.unit && n.unit && f.unit !== n.unit) return false;
  const eps = f.step * 1e-9;
  return n.value >= f.value - f.step / 2 - eps && n.value < f.value + f.step - eps;
}

/**
 * 解説の数字・日付が資料にあるか。
 *
 * - 表記の違いを除いて同じ値・日付が index（その議案の資料）にあればよい
 * - 「約」付きの数は、index ではなく near（資料の該当箇所。解説ではその項目の抜き出し）の数のうち、
 *   表示した桁で丸めると一致し、単位が食い違わないものがあればよい
 *   （資料の別の表にある、たまたま近い数では通さない）
 */
export function figureInMaterial(
  f: Figure,
  index: MaterialFigureIndex,
  near: MaterialFigureIndex = index
): boolean {
  if (isIgnorableFigure(f)) return true;
  // 「約」付きの数は丸い数なので、資料の別の箇所にたまたま同じ値があっても通さない
  if (f.approx) {
    return (
      near.keys.has(f.key) || near.numbers.some((n) => approxFigureMatches(f, n))
    );
  }
  return index.keys.has(f.key);
}
