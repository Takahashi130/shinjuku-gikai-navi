import Link from "next/link";
import { routes } from "@/lib/routes";
import type { MemberListItem } from "../../shared/types";
import {
  formatCommitteeSeat,
  groupMemberPositions,
} from "../../shared/utils/member-positions";
import { MemberInitialIcon } from "./member-initial-icon";

/**
 * 議員の一覧（/members）の1人分のカード。
 *
 * 頭文字のアイコン・名前・会派・委員会・本会議の質問の回数を並べる。カード
 * 全体を押せるように、名前のリンクを広げる（after:inset-0）。カード全体を
 * 1つの a にすると、中の文字がすべてリンク名として読み上げられて長くなる。
 *
 * 数は並べ替えや強調に使わない（ランキングにしない）。全員を同じ形で出す。
 */
export function MemberCard({
  member,
  factionName,
}: {
  member: MemberListItem;
  factionName: string | null;
}) {
  const { councilRoles, committees } = groupMemberPositions(member.positions);

  return (
    <article className="relative flex h-full gap-3 rounded-md border border-mirai-border bg-white p-4 hover:border-brand-link focus-within:border-brand-link">
      <MemberInitialIcon name={member.name} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {member.nameKana && (
          <p className="text-[11px] text-mirai-text-muted">{member.nameKana}</p>
        )}
        <h3 className="text-base font-bold leading-snug">
          <Link
            href={routes.memberDetail(member.id)}
            className="text-mirai-text after:absolute after:inset-0 after:content-[''] hover:text-brand-link hover:underline"
          >
            {member.name}
          </Link>
        </h3>
        <p className="text-[13px] text-mirai-text-secondary">
          {factionName ?? "会派なし"}
        </p>

        {councilRoles.length > 0 && (
          <p className="w-fit rounded-sm bg-brand-accent-tint px-1.5 py-0.5 text-xs font-bold text-brand-link">
            {councilRoles.join("・")}
          </p>
        )}

        {committees.length > 0 && (
          <ul className="flex flex-col gap-0.5 pt-0.5 text-xs leading-relaxed text-mirai-text-secondary">
            {committees.map((seat) => (
              <li key={`${seat.kind}-${seat.name}`}>
                {formatCommitteeSeat(seat)}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-0.5 border-mirai-border border-t pt-2 text-xs text-mirai-text-secondary">
          <div className="flex gap-1">
            <dt>本会議の質問</dt>
            <dd className="font-bold text-mirai-text">
              {member.questions.count}回
            </dd>
          </div>
          {member.electedCount !== null && (
            <div className="flex gap-1">
              <dt>当選</dt>
              <dd className="font-bold text-mirai-text">
                {member.electedCount}回
              </dd>
            </div>
          )}
          {member.seatNumber !== null && (
            <div className="flex gap-1">
              <dt>議席</dt>
              <dd className="font-bold text-mirai-text">
                {member.seatNumber}番
              </dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}
