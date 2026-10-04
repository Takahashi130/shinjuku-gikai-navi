import { UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LabelPill } from "@/components/ui/label-pill";
import { formatDate } from "@/lib/utils/date";
import {
  COMMITTEE_KIND_LABELS,
  type GroupedPositions,
} from "../../shared/utils/member-positions";
import {
  DEFAULT_MEMBERS_LIST_PARAMS,
  membersListHref,
} from "../../shared/utils/members-list-params";
import { formatElectedTerms } from "../../shared/utils/term-label";
import type { MemberProfile } from "../loaders/get-member-profile";
import { ProfileSection, SectionNote } from "./profile-section";

/** 基本情報（会派・役職・委員会・期数・議席・任期・会派の所属の履歴）。 */
export function MemberBasicInfo({
  profile,
  positions,
}: {
  profile: MemberProfile;
  positions: GroupedPositions;
}) {
  const { member, faction, term, memberships } = profile;

  return (
    <ProfileSection id="basic" title="基本情報" icon={UserRound}>
      <dl className="flex flex-col divide-y divide-line-soft rounded-2xl border border-line-soft">
        <InfoRow label="会派">
          {faction ? (
            <span className="flex flex-col gap-1">
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
              {faction.note && (
                <span className="text-xs text-mirai-text-muted">
                  {faction.note}
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
            <ul className="flex flex-col gap-1.5">
              {positions.committees.map((seat) => (
                <li
                  key={`${seat.kind}-${seat.name}`}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1"
                >
                  {/* 議会運営委員会は、種類の名前と委員会の名前が同じなので1回だけ出す */}
                  {COMMITTEE_KIND_LABELS[seat.kind] !== seat.name && (
                    <span className="text-xs text-mirai-text-muted">
                      {COMMITTEE_KIND_LABELS[seat.kind] ?? "委員会"}
                    </span>
                  )}
                  <span>{seat.name}</span>
                  {seat.isLeader ? (
                    <LabelPill tone="dark">{seat.role}</LabelPill>
                  ) : (
                    <span className="text-xs text-mirai-text-secondary">
                      {seat.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            "区の委員会名簿に記載がありません"
          )}
        </InfoRow>

        {member.electedCount !== null && (
          <InfoRow label="当選期数">
            {formatElectedTerms(member.electedCount)}
          </InfoRow>
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
            <ul className="flex flex-col gap-2">
              {memberships.map((period) => (
                <li key={`${period.faction_id}-${period.first_seen_on}`}>
                  <span className={period.is_current ? "font-bold" : ""}>
                    {period.factionName}
                  </span>
                  {/*
                    入った日ではなく、区の資料で確認できた日であることを書く
                    （前の任期から同じ会派でも、質問の無い年は確認できない）
                  */}
                  <span className="block text-xs text-mirai-text-secondary">
                    {period.is_current
                      ? `区の資料で最初に確認できた日：${formatDate(period.first_seen_on)}（今の会派）`
                      : `区の資料で確認できた期間：${formatDate(period.first_seen_on)}〜${formatDate(period.last_seen_on)}`}
                  </span>
                  {/* 今の名前で昔の期間を書くと、当時からその名前だったように読める */}
                  {period.formerNames.length > 0 && (
                    <span className="block text-xs text-mirai-text-muted">
                      {`当時の会派名：${period.formerNames
                        .map((former) =>
                          former.validTo
                            ? `${former.name}（${formatDate(former.validTo)}まで）`
                            : former.name
                        )
                        .join("、")}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </InfoRow>
        )}
      </dl>

      {memberships.length > 0 && (
        <SectionNote>
          区は会派に入った日・抜けた日を公表していないため、本会議の質問者一覧と会派構成のページで、その会派への所属を確認できた最初と最後の日を示しています。
        </SectionNote>
      )}
    </ProfileSection>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 text-sm text-mirai-text sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-xs font-bold text-mirai-text-secondary sm:w-36 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 leading-relaxed">{children}</dd>
    </div>
  );
}
