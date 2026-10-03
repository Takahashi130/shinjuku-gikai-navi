import type { Faction } from "./parse-results-pdf";
import { type MatchedBill, normalizeName } from "./match-bills";
import type { SessionBill, SessionPage } from "./parse-session-page";

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

export function billSlug(session: SessionPage, bill: SessionBill): string {
  const prefix = {
    mayor: "gian",
    approval: "shonin",
    consent: "doi",
    accounts: "nintei",
    inquiry: "shimon",
    member: "giin",
  }[bill.kind];
  return `${sessionSlug(session)}-${prefix}-${bill.number}`;
}

/**
 * 同じ会期に同名の議案があるとき（「公の施設の指定管理者の指定について」など）に
 * 見分けがつく名前にする。PDF 側の名前に号数などが付いていればそれを使い、
 * なければ概要の先頭（施設名など）を添える。
 */
export function billDisplayName(bill: MatchedBill, isDuplicate: boolean): string {
  if (!isDuplicate) return bill.name;
  if (normalizeName(bill.result.name) !== normalizeName(bill.name)) return bill.result.name;
  const subject = bill.result.summary.split(/[（(\s]|・・・/)[0];
  return `${bill.name}（${subject || bill.label}）`;
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
    factions
      .filter((f) => bill.result.votes[f.abbr] === vote)
      .map((f) => {
        const note = bill.result.voteNotes[f.abbr];
        return note ? `${f.name}（${note}）` : f.name;
      });
  const forList = byVote("for");
  const againstList = byVote("against");
  const summary = bill.result.summary
    .split("\n")
    .map((l) => (l.startsWith("・") ? `- ${l.slice(1)}` : l))
    .join("\n");

  return [
    "## 概要",
    "",
    summary || "（概要を読み取れませんでした。出典の資料をご確認ください）",
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

/**
 * 賛成と反対に会派が分かれた議案か。bills.is_featured に入れ、公開サイトでは
 * 「賛否が分かれた」の目印と絞り込みに使う。
 */
export function isSplitVote(bill: MatchedBill): boolean {
  const votes = Object.values(bill.result.votes);
  return votes.includes("for") && votes.includes("against");
}

/** 審議結果がまだ公開されていない（会期中の）議案の本文 */
export function buildPendingContent(session: SessionPage, sessionUrl: string, bill: SessionBill): string {
  return [
    "## 審議の状況",
    "",
    `${session.title}で審議中です（${bill.label}）。議決の結果と会派ごとの賛否は、新宿区議会が審議結果を公開したあとに掲載します。`,
    "",
    "## 出典",
    "",
    `- [新宿区議会「${session.title}」](${sessionUrl})`,
    "",
    "※この内容は新宿区議会の公開資料をもとに自動で作成しています。",
  ].join("\n");
}

/** 会期中かどうか（日付は YYYY-MM-DD の文字列で比べる） */
export function isSessionActive(session: SessionPage, today: string): boolean {
  return session.startDate <= today && today <= session.endDate;
}
