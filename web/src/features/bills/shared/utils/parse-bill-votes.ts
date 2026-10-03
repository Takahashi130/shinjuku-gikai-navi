/**
 * 議案の解説（Markdown）から、議決結果と会派ごとの賛否を読み取る。
 *
 * 新宿区議会の取り込み（packages/shinjuku-importer の buildContent）は、
 * 解説を次の形で書く。
 *
 * ```
 * ## 議決結果
 *
 * **可決**（第1号議案）
 *
 * ## 会派ごとの賛否
 *
 * - **賛成**：会派A、会派B（1人反対）
 * - **反対**：なし
 * ```
 *
 * 管理画面で書かれた解説など、この形でないものは読み取れないので null を返し、
 * 呼び出し側は解説をそのまま出す。
 */

/** 会派1つ分の賛否。note は「1人反対」のような添え書き。 */
export type FactionVote = {
  name: string;
  note: string | null;
};

export type BillVotes = {
  /** 議決結果の語（可決・否決・承認・同意・認定・採択など）。読めなければ null。 */
  result: string | null;
  /** 議決結果の添え書き（「第1号議案」など）。 */
  resultNote: string | null;
  /** 会派ごとの賛否が読めたか。読めなければ for / against は空。 */
  hasFactionVotes: boolean;
  for: FactionVote[];
  against: FactionVote[];
};

/** 議決結果の見出し。構造化して出すときは解説から取り除く。 */
export const RESULT_HEADING = "議決結果";
/** 会派ごとの賛否の見出し。構造化して出すときは解説から取り除く。 */
export const FACTION_VOTES_HEADING = "会派ごとの賛否";

export function parseBillVotes(
  markdown: string | null | undefined
): BillVotes | null {
  if (!markdown) return null;

  const resultSection = extractSection(markdown, RESULT_HEADING);
  const votesSection = extractSection(markdown, FACTION_VOTES_HEADING);
  if (resultSection === null && votesSection === null) return null;

  const { result, resultNote } = parseResult(resultSection ?? "");
  const forLine = findVoteLine(votesSection ?? "", "賛成");
  const againstLine = findVoteLine(votesSection ?? "", "反対");
  const hasFactionVotes = forLine !== null || againstLine !== null;

  return {
    result,
    resultNote,
    hasFactionVotes,
    for: parseFactionList(forLine ?? ""),
    against: parseFactionList(againstLine ?? ""),
  };
}

/**
 * 指定した h2 の節を取り除いた Markdown を返す。
 * 構造化して画面に出した節を、解説の本文で二重に出さないために使う。
 */
export function removeMarkdownSections(
  markdown: string,
  headings: readonly string[]
): string {
  const lines = markdown.split("\n");
  const kept: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const heading = matchH2(line);
    if (heading !== null) {
      skipping = headings.includes(heading);
    }
    if (!skipping) kept.push(line);
  }

  // 取り除いた跡に空行が重なるので、3行以上の空行を1つにまとめる。
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** `## 見出し` なら見出しの文字を、そうでなければ null を返す。 */
function matchH2(line: string): string | null {
  const matched = /^##\s+(.+?)\s*#*\s*$/.exec(line);
  return matched ? matched[1] : null;
}

/** h2 の節の本文（次の h2 の手前まで）。見出しが無ければ null。 */
function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => matchH2(line) === heading);
  if (start === -1) return null;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (matchH2(line) !== null) break;
    body.push(line);
  }
  return body.join("\n");
}

/** `**可決**（第1号議案）` → 可決 / 第1号議案 */
function parseResult(section: string): {
  result: string | null;
  resultNote: string | null;
} {
  const line = section
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return { result: null, resultNote: null };

  const matched = /^\*\*(.+?)\*\*\s*(?:[（(](.+)[）)])?\s*$/.exec(line);
  if (matched) {
    return {
      result: matched[1].trim(),
      resultNote: matched[2]?.trim() ?? null,
    };
  }
  return { result: stripEmphasis(line), resultNote: null };
}

/** `- **賛成**：A、B` の「：」より後ろ。行が無ければ null。 */
function findVoteLine(section: string, label: "賛成" | "反対"): string | null {
  for (const raw of section.split("\n")) {
    const line = raw.trim().replace(/^[-*]\s*/, "");
    const matched = new RegExp(
      `^\\*{0,2}${label}\\*{0,2}\\s*[：:]\\s*(.*)$`
    ).exec(line);
    if (matched) return matched[1].trim();
  }
  return null;
}

/**
 * `A、B（1人反対）、C` を会派の並びにする。
 * 添え書きの括弧の中に「、」があっても区切らない。「なし」は空にする。
 */
function parseFactionList(text: string): FactionVote[] {
  const trimmed = stripEmphasis(text).trim();
  if (trimmed === "" || trimmed === "なし") return [];

  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of trimmed) {
    if (char === "（" || char === "(") depth += 1;
    if (char === "）" || char === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && (char === "、" || char === ",")) {
      items.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  items.push(current);

  return items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const matched = /^(.+?)[（(]([^（()）]+)[）)]$/.exec(item);
      return matched
        ? { name: matched[1].trim(), note: matched[2].trim() }
        : { name: item, note: null };
    });
}

function stripEmphasis(text: string): string {
  return text.replace(/\*\*/g, "");
}

/** 賛否の会派数と、賛成の割合（0〜100の整数）。会派が0なら割合は null。 */
export type VoteTally = {
  forCount: number;
  againstCount: number;
  forPercent: number | null;
};

/** 会派の数で賛否を数える。議員の人数ではない点に注意（画面にもそう書く）。 */
export function tallyFactionVotes(
  votes: Pick<BillVotes, "for" | "against">
): VoteTally {
  const forCount = votes.for.length;
  const againstCount = votes.against.length;
  const total = forCount + againstCount;
  return {
    forCount,
    againstCount,
    forPercent: total === 0 ? null : Math.round((forCount / total) * 100),
  };
}

/**
 * 会派の並びを1行の文にする（`A、B（1人反対）、C`）。会派が無ければ「なし」。
 * 解説の書き方（parseFactionList が読む形）と同じ区切りに戻す。
 */
export function formatFactionNames(factions: readonly FactionVote[]): string {
  if (factions.length === 0) return "なし";
  return factions
    .map((faction) =>
      faction.note ? `${faction.name}（${faction.note}）` : faction.name
    )
    .join("、");
}
