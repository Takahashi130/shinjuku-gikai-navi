import type { MemberPosition } from "../types";

/**
 * 役職（区の議長・副議長のページ、委員会名簿、会派構成ページ）を画面用に分ける。
 * 役職の名前は区のページの表記のまま使う。
 */

export const COMMITTEE_KIND_LABELS: Record<string, string> = {
  standing_committee: "常任委員会",
  steering_committee: "議会運営委員会",
  special_committee: "特別委員会",
};

/** 常任委員会 → 議会運営委員会 → 特別委員会 の順に出す。 */
const COMMITTEE_KIND_ORDER = [
  "standing_committee",
  "steering_committee",
  "special_committee",
] as const;

export type CommitteeSeat = {
  kind: string;
  name: string;
  role: string;
  /** 委員長・副委員長など、ただの「委員」でない役か */
  isLeader: boolean;
};

export type GroupedPositions = {
  /** 議長・副議長 */
  councilRoles: string[];
  committees: CommitteeSeat[];
  /** 会派の役職（幹事長など）。会派構成ページに書かれているものだけ */
  factionRoles: { factionName: string; role: string }[];
};

export function groupMemberPositions(
  positions: readonly MemberPosition[]
): GroupedPositions {
  const sorted = [...positions].sort((a, b) => a.sort_order - b.sort_order);

  const committees = COMMITTEE_KIND_ORDER.flatMap((kind) =>
    sorted
      .filter((p) => p.body_kind === kind)
      .map((p) => ({
        kind,
        name: p.body_name,
        role: p.role,
        isLeader: p.role !== "委員",
      }))
  );

  return {
    councilRoles: sorted
      .filter((p) => p.body_kind === "council")
      .map((p) => p.role),
    committees,
    factionRoles: sorted
      .filter((p) => p.body_kind === "faction")
      .map((p) => ({ factionName: p.body_name, role: p.role })),
  };
}

/** 「総務区民委員会（委員長）」のように、委員でない役だけ括弧で添える。 */
export function formatCommitteeSeat(seat: CommitteeSeat): string {
  return seat.isLeader ? `${seat.name}（${seat.role}）` : seat.name;
}
