/**
 * 新宿区議会「委員会名簿」と「議長と副議長」ページのパーサー
 * - 委員会名簿: https://www.city.shinjuku.lg.jp/kusei/file08_01_00013.html
 * - 議長と副議長: https://www.city.shinjuku.lg.jp/kusei/gikai01_000116.html
 */
import { cleanFactionName, cleanMemberName } from "./normalize-member-name";
import { mainContentLines } from "./page-content";

export type CommitteeKind = "standing_committee" | "special_committee" | "steering_committee";

export type CommitteeMember = {
  name: string;
  /** 委員長・副委員長・委員 */
  role: string;
  /** 名簿に添えられた会派の略称（自参ク など） */
  factionAbbr: string | null;
};

export type Committee = {
  name: string;
  kind: CommitteeKind;
  capacity: number | null;
  members: CommitteeMember[];
};

export type CommitteeRoster = {
  /** 会派の略称 → 正式名称 */
  factionAbbreviations: Map<string, string>;
  committees: Committee[];
};

const COMMITTEE_HEADING = /^(.+委員会)\s*【定数[:：]\s*(\d+)\s*名】$/;
const MEMBER_LINE = /^(?:(委員長|副委員長)[:：])?\s*(.+?)\s*[（(]([^（()）]+)[）)]$/;
// 「自参ク…自民・参政クラブ」「公明……新宿区議会公明党」
const ABBR_LINE = /^([^…]+)…+(.+)$/;

function committeeKind(name: string): CommitteeKind {
  if (name.endsWith("特別委員会")) return "special_committee";
  if (name === "議会運営委員会") return "steering_committee";
  return "standing_committee";
}

export function parseCommitteeRoster(html: string): CommitteeRoster {
  const lines = mainContentLines(html);
  const factionAbbreviations = new Map<string, string>();
  const committees: Committee[] = [];
  let current: Committee | null = null;
  for (const line of lines) {
    const heading = line.match(COMMITTEE_HEADING);
    if (heading) {
      current = {
        name: heading[1].trim(),
        kind: committeeKind(heading[1].trim()),
        capacity: Number(heading[2]),
        members: [],
      };
      committees.push(current);
      continue;
    }
    if (!current) {
      const abbr = line.match(ABBR_LINE);
      if (abbr) factionAbbreviations.set(abbr[1].trim(), cleanFactionName(abbr[2]));
      continue;
    }
    const member = line.match(MEMBER_LINE);
    if (!member) continue;
    current.members.push({
      name: cleanMemberName(member[2]),
      role: member[1] ?? "委員",
      factionAbbr: member[3].trim(),
    });
  }
  if (committees.length === 0) throw new Error("委員会の見出し（◯◯委員会【定数：n名】）が見つかりません");
  return { factionAbbreviations, committees };
}

export type CouncilOfficer = {
  /** 議長・副議長 */
  role: string;
  name: string;
  factionName: string | null;
};

// 「議長 渡辺 清人（わたなべ きよと） 3期」
const OFFICER_LINE = /^(議長|副議長)\s+(.+?)\s*[（(][^（()）]+[）)]/;

export function parseCouncilOfficers(html: string): CouncilOfficer[] {
  const lines = mainContentLines(html);
  const officers: CouncilOfficer[] = [];
  for (const [i, line] of lines.entries()) {
    const m = line.match(OFFICER_LINE);
    if (!m) continue;
    const next = lines[i + 1];
    officers.push({
      role: m[1],
      name: cleanMemberName(m[2]),
      factionName: next && !OFFICER_LINE.test(next) ? cleanFactionName(next) : null,
    });
  }
  if (officers.length === 0) throw new Error("議長・副議長の行が見つかりません");
  return officers;
}
