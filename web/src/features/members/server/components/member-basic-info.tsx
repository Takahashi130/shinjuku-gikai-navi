import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/utils/date";
import type { MemberProfile } from "../loaders/get-member-profile";
import {
  COMMITTEE_KIND_LABELS,
  type GroupedPositions,
} from "../../shared/utils/member-positions";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "../../shared/utils/members-list-params";
import { ProfileSection } from "./profile-section";

/** 基本情報（会派・役職・委員会・当選回数・任期・会派の所属の履歴）。 */
export function MemberBasicInfo({
  profile,
  positions,
}: {
  profile: MemberProfile;
  positions: GroupedPositions;
}) {
  const { member, faction, term, memberships } = profile;

  return (
    <ProfileSection id="basic" title="基本情報">
      <dl className="divide-y divide-mirai-border rounded-md border border-mirai-border">
        <InfoRow label="会派">
          {faction ? (
            <span className="flex flex-col gap-0.5">
              <Link
                href={membersListHref(DEFAULT_MEMBERS_LIST_PARAMS, {
                  faction: faction.slug,
                })}
                className="w-fit font-bold text-brand-link hover:text-brand-link-hover hover:underline"
              >
                {faction.name}
              </Link>
              {positions.factionRoles.length > 0 && (
                <span className="text-xs text-mirai-text-secondary">
                  {`会派での役職：${positions.factionRoles.map((r) => r.role).join("・")}`}
                </span>
              )}
            </span>
          ) : (
            "会派に属していません"
          )}
        </InfoRow>

        {positions.councilRoles.length > 0 && (
          <InfoRow label="議会の役職">
            <span className="font-bold">
              {positions.councilRoles.join("・")}
            </span>
          </InfoRow>
        )}

        <InfoRow label="委員会">
          {positions.committees.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {positions.committees.map((seat) => (
                <li
                  key={`${seat.kind}-${seat.name}`}
                  className="flex flex-wrap items-baseline gap-x-2"
                >
                  <span className="text-xs text-mirai-text-muted">
                    {COMMITTEE_KIND_LABELS[seat.kind] ?? "委員会"}
                  </span>
                  <span>{seat.name}</span>
                  <span
                    className={
                      seat.isLeader
                        ? "text-xs font-bold text-brand-link"
                        : "text-xs text-mirai-text-secondary"
                    }
                  >
                    {seat.role}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            "区の委員会名簿に記載がありません"
          )}
        </InfoRow>

        {member.electedCount !== null && (
          <InfoRow label="当選回数">{`${member.electedCount}回`}</InfoRow>
        )}

        {member.seatNumber !== null && (
          <InfoRow label="議席番号">{`${member.seatNumber}番`}</InfoRow>
        )}

        {term && (
          <InfoRow label="任期">
            {`第${term.termNumber}期（${formatDate(term.termStart)}〜${formatDate(term.termEnd)}）`}
            {term.electionDate && (
              <span className="block text-xs text-mirai-text-secondary">
                {`${formatDate(term.electionDate)}の一般選挙`}
              </span>
            )}
          </InfoRow>
        )}

        {memberships.length > 0 && (
          <InfoRow label="会派の所属の履歴">
            <ul className="flex flex-col gap-1.5">
              {memberships.map((period) => (
                <li key={`${period.faction_id}-${period.first_seen_on}`}>
                  <span className={period.is_current ? "font-bold" : ""}>
                    {period.factionName}
                  </span>
                  <span className="block text-xs text-mirai-text-secondary">
                    {period.is_current
                      ? `${formatDate(period.first_seen_on)}〜（今の会派）`
                      : `${formatDate(period.first_seen_on)}〜${formatDate(period.last_seen_on)}`}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs leading-relaxed text-mirai-text-muted">
              区は会派に入った日・抜けた日を公表していないため、本会議の質問者一覧と会派構成のページで、その会派への所属を確認できた最初と最後の日を示しています。
            </p>
          </InfoRow>
        )}
      </dl>
    </ProfileSection>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2.5 text-sm text-mirai-text sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-[13px] font-bold text-mirai-text-secondary sm:w-36">
        {label}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
