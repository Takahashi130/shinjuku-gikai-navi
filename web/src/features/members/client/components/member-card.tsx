import Link from "next/link";
import type { ReactNode } from "react";
import { LabelPill } from "@/components/ui/label-pill";
import { routes } from "@/lib/routes";
import type { MemberListItem } from "../../shared/types";
import { buildMemberCardView } from "../../shared/utils/member-card-view";
import { FigureValue } from "./figure-value";
import { MemberInitialIcon } from "./member-initial-icon";

/**
 * 議員の一覧（/members）の1人分のカード。
 *
 * 上から 頭文字のアイコン・よみ・名前・会派のピル → 期数と議席番号・委員会
 * → 小さな数字（今の任期の本会議の質問の回数、所属会派の政務活動費の
 * 1人あたりの目安）。質問の回数は全員同じ期間で数え、その期間を書く。
 *
 * 名前のリンクを疑似要素（after:inset-0）でカード全体に広げる。カード全体を
 * 1つの a にすると、中の文字がすべてリンク名として読み上げられて長くなる。
 *
 * 数は並べるだけで、並べ替えや強調には使わない（ランキングにしない）。
 * 全員を同じ形・同じ色で出す。
 */
export function MemberCard({
  member,
  factionName,
  termStart,
}: {
  member: MemberListItem;
  /** 今の会派の名前。会派に属していなければ null */
  factionName: string | null;
  /** 今の任期の始まり（質問の回数を数え始めた日） */
  termStart: string | null;
}) {
  const view = buildMemberCardView(member, termStart);

  return (
    <article className="group relative flex h-full flex-col gap-4 rounded-3xl border border-line-soft bg-white p-5 shadow-xs transition-shadow hover:border-brand-link/40 hover:shadow-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-primary has-[a:focus-visible]:outline-offset-2">
      <div className="flex items-start gap-3">
        <MemberInitialIcon name={member.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {member.nameKana && (
            <p className="text-xs text-mirai-text-muted">{member.nameKana}</p>
          )}
          <h3 className="text-lg font-extrabold leading-snug text-mirai-text">
            <Link
              href={routes.memberProfile(member.id)}
              className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none group-hover:text-brand-link group-hover:underline"
            >
              {member.name}
            </Link>
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <LabelPill tone="outline" className="max-w-full">
              <span className="min-w-0 truncate">
                {factionName ?? "会派なし"}
              </span>
            </LabelPill>
            {view.councilRoles.map((role) => (
              <LabelPill key={role} tone="dark">
                {role}
              </LabelPill>
            ))}
          </div>
        </div>
      </div>

      {(view.meta || view.committees.length > 0) && (
        <div className="flex flex-col gap-1 text-xs leading-relaxed text-mirai-text-secondary">
          {view.meta && (
            <p className="font-bold text-mirai-text">{view.meta}</p>
          )}
          {view.committees.length > 0 && (
            <ul aria-label="委員会" className="flex flex-col">
              {view.committees.map((committee) => (
                <li key={committee}>{committee}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-2">
        <SmallFigure
          label="本会議の質問"
          value={
            <FigureValue
              figure={{
                prefix: "",
                value: String(view.questionCount),
                unit: "回",
              }}
            />
          }
          note={view.questionNote}
        />
        <SmallFigure
          label="会派の政務活動費・1人あたり（目安）"
          value={<FigureValue figure={view.expense.figure} />}
          note={view.expense.note}
        />
      </dl>
    </article>
  );
}

function SmallFigure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-mirai-surface px-3 py-2.5">
      <dt className="text-xs font-bold text-mirai-text-secondary">{label}</dt>
      <dd className="text-mirai-text">{value}</dd>
      <dd className="break-phrase text-xs leading-snug text-mirai-text-muted">
        {note}
      </dd>
    </div>
  );
}
