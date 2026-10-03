/**
 * 議員名簿・会派構成・委員会名簿・議長と副議長の4つのページを突き合わせ、議員ごとの登録内容を作る
 *
 * 議員名簿を正とし、ほかのページに名簿に無い名前や、会派の食い違いがあれば警告にする。
 */
import { factionNameKey, memberNameKey } from "./normalize-member-name";
import type { CommitteeKind, CommitteeRoster, CouncilOfficer } from "./parse-committee-roster";
import type { FactionPageEntry } from "./parse-faction-page";
import type { MemberList } from "./parse-member-list";

export type PositionKind = "council" | CommitteeKind | "faction";

export type MemberPosition = {
  bodyKind: PositionKind;
  bodyName: string;
  role: string;
  sortOrder: number;
};

export type MemberRecord = {
  nameKey: string;
  name: string;
  nameKana: string | null;
  seatNumber: number;
  electedCount: number | null;
  factionName: string;
  positions: MemberPosition[];
};

const COUNCIL_NAME = "新宿区議会";

export function buildMemberRecords(
  list: MemberList,
  factions: FactionPageEntry[],
  roster: CommitteeRoster,
  officers: CouncilOfficer[]
): { members: MemberRecord[]; warnings: string[] } {
  const warnings: string[] = [];
  const listed = new Set(list.members.map((m) => memberNameKey(m.name)));
  const factionOf = new Map<string, FactionPageEntry>();
  for (const f of factions) {
    for (const m of f.members) {
      const key = memberNameKey(m.name);
      if (!listed.has(key)) warnings.push(`会派構成ページの「${m.name}」（${f.name}）が議員名簿にありません`);
      factionOf.set(key, f);
    }
    if (f.members.length !== f.memberCount) {
      warnings.push(`${f.name} の人数（${f.memberCount}人）と、載っている議員の数（${f.members.length}人）が違います`);
    }
  }
  for (const o of officers) {
    if (!listed.has(memberNameKey(o.name))) warnings.push(`${o.role}「${o.name}」が議員名簿にありません`);
  }
  for (const c of roster.committees) {
    for (const m of c.members) {
      if (!listed.has(memberNameKey(m.name))) warnings.push(`${c.name}の「${m.name}」が議員名簿にありません`);
    }
  }

  const members = list.members.map((m): MemberRecord => {
    const key = memberNameKey(m.name);
    const positions: MemberPosition[] = [];
    for (const o of officers) {
      if (memberNameKey(o.name) === key) {
        positions.push({ bodyKind: "council", bodyName: COUNCIL_NAME, role: o.role, sortOrder: positions.length });
      }
    }
    for (const c of roster.committees) {
      for (const cm of c.members) {
        if (memberNameKey(cm.name) !== key) continue;
        positions.push({ bodyKind: c.kind, bodyName: c.name, role: cm.role, sortOrder: positions.length });
        const abbrName = cm.factionAbbr ? roster.factionAbbreviations.get(cm.factionAbbr) : undefined;
        if (abbrName && factionNameKey(abbrName) !== factionNameKey(m.factionName)) {
          warnings.push(`${m.name}: 委員会名簿の会派（${abbrName}）と議員名簿の会派（${m.factionName}）が違います`);
        }
      }
    }
    const faction = factionOf.get(key);
    if (!faction) {
      warnings.push(`${m.name} が会派構成ページにありません`);
    } else {
      if (factionNameKey(faction.name) !== factionNameKey(m.factionName)) {
        warnings.push(`${m.name}: 会派構成ページの会派（${faction.name}）と議員名簿の会派（${m.factionName}）が違います`);
      }
      const role = faction.members.find((fm) => memberNameKey(fm.name) === key)?.role;
      if (role) positions.push({ bodyKind: "faction", bodyName: faction.name, role, sortOrder: positions.length });
    }
    return {
      nameKey: key,
      name: m.name,
      nameKana: m.nameKana,
      seatNumber: m.seatNumber,
      electedCount: m.electedCount,
      factionName: m.factionName,
      positions,
    };
  });
  return { members, warnings };
}
