import type { Faction } from "./parse-results-pdf";
import type { MatchedBill } from "./match-bills";
import type { SessionPage } from "./parse-session-page";

type BillStatus = "enacted" | "rejected";

const PASSED = /^(可決|承認|同意|認定|採択|原案可決|修正可決)$/;

export function toBillStatus(result: string): BillStatus | null {
  if (PASSED.test(result)) return "enacted";
  if (/^(否決|不承認|不同意|不認定|不採択)$/.test(result)) return "rejected";
  return null;
}

export function sessionSlug(session: SessionPage): string {
  const kind = session.type === "regular" ? "teirei" : "rinji";
  return `r${session.reiwaYear}-${kind}-${session.ordinal}`;
}

export function billSlug(session: SessionPage, bill: MatchedBill): string {
  const prefix = { mayor: "gian", approval: "shonin", member: "giin" }[bill.kind];
  return `${sessionSlug(session)}-${prefix}-${bill.number}`;
}

/** 一覧カード用の短い要約（最初の文、長ければ切り詰め） */
export function shortSummary(summary: string, max = 120): string {
  const first = summary.split("\n")[0];
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

export function buildContent(
  session: SessionPage,
  sessionUrl: string,
  bill: MatchedBill,
  factions: Faction[]
): string {
  const byVote = (vote: "for" | "against") =>
    factions.filter((f) => bill.result.votes[f.abbr] === vote).map((f) => f.name);
  const forList = byVote("for");
  const againstList = byVote("against");
  const summary = bill.result.summary
    .split("\n")
    .map((l) => (l.startsWith("・") ? `- ${l.slice(1)}` : l))
    .join("\n");

  return [
    "## 概要",
    "",
    summary || "（概要の記載はありません）",
    "",
    "## 議決結果",
    "",
    `**${bill.result.result}**（${bill.label}）`,
    "",
    "## 会派ごとの賛否",
    "",
    `- **賛成**：${forList.length ? forList.join("、") : "なし"}`,
    `- **反対**：${againstList.length ? againstList.join("、") : "なし"}`,
    "",
    "## 出典",
    "",
    `- [新宿区議会「${session.title}」](${sessionUrl})`,
    "",
    "※この内容は新宿区議会の公開資料をもとに自動で作成しています。",
  ].join("\n");
}
