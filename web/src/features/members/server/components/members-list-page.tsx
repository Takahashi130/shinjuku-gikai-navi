import "server-only";

import { IdCard, Info, Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { MemberCard } from "../../client/components/member-card";
import {
  buildMembersListView,
  type FactionComposition,
} from "../../shared/utils/build-members-list-view";
import {
  type MembersListParams,
  type MembersListSearchParams,
  membersListHref,
  parseMembersListParams,
} from "../../shared/utils/members-list-params";
import {
  MEMBER_SORT_LABELS,
  MEMBER_SORT_ORDERS,
} from "../../shared/utils/sort-members";
import { getMembersDirectory } from "../loaders/get-members-directory";
import { MembersPageNote, RANKING_NOTE } from "./members-page-note";

/**
 * 議員の一覧（/members）。「議員カルテ」の入口。
 *
 * - 見出しのカード：今の議員の人数、会派ごとの人数のピル（押すとその会派で
 *   絞り込む）、議席番号順・五十音順の切り替え、「ランキングはしていません」の注記
 * - 議員のカード：頭文字のアイコン・名前・会派・委員会と、本会議の質問の回数・
 *   所属会派の政務活動費の1人あたりの目安
 *
 * 絞り込みと並び順は URL に載せ、リンクだけで切り替える（Server Component の
 * まま。JavaScript が無くても動く）。質問の多い順などのランキングは出さない
 * （2027年4月ごろに区議選があるため）。
 */
export async function MembersListPage({
  searchParams,
}: {
  searchParams: MembersListSearchParams;
}) {
  const params = parseMembersListParams(searchParams);
  const directory = await getMembersDirectory();
  const view = buildMembersListView(
    directory.members,
    directory.factions,
    params
  );
  const factionNames = new Map(
    directory.factions.map((faction) => [faction.id, faction.name])
  );
  const heading = view.selectedFaction
    ? `${view.selectedFaction.name}の議員`
    : "すべての議員";

  return (
    /*
      条件が変わるたびに一覧の領域を作り直す。ふりがな表示が ON のとき
      Rubyful が li・p などの中身を差し替えるので、作り直さないと React の
      持つ要素が画面から外れ、リンクや件数が更新されない（議案一覧と同じ）。
    */
    <div
      key={`members-list${membersListHref(params)}`}
      className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:py-8"
    >
      <Breadcrumb
        items={[
          { label: "トップ", href: routes.home() },
          { label: "議員カルテ" },
        ]}
      />

      <RoundCard asChild padding="lg" className="flex flex-col gap-6">
        <section aria-labelledby="members-title">
          <div className="flex flex-col gap-4 border-line-soft border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-3">
              <LabelPill tone="accent" size="md">
                <IdCard aria-hidden />
                議員カルテ・政務活動費
              </LabelPill>
              <h1
                id="members-title"
                className="break-phrase text-[28px] font-extrabold leading-tight tracking-tight text-mirai-text md:text-4xl"
              >
                新宿区議会の議員
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-mirai-text-secondary md:text-base">
                会派・委員会、本会議での質問、所属会派の議案への賛否と政務活動費を、議員ごとにまとめています。
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1 md:items-end md:text-right">
              <p className="flex items-baseline gap-1 text-mirai-text">
                <span className="text-xs font-bold text-mirai-text-secondary">
                  今の議員
                </span>
                <span className="font-lexend text-4xl font-bold leading-none tracking-tight md:text-5xl">
                  {directory.members.length}
                </span>
                <span className="text-sm font-bold text-mirai-text-secondary">
                  人
                </span>
              </p>
              {directory.term && (
                <p className="text-xs text-mirai-text-muted">
                  {`第${directory.term.termNumber}期（任期は${formatDate(directory.term.termEnd)}まで）`}
                </p>
              )}
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-2xl bg-mirai-surface px-4 py-3 text-sm font-bold leading-relaxed text-mirai-text">
            <Info
              className="mt-0.5 size-4 shrink-0 text-mirai-text-muted"
              aria-hidden
            />
            <span className="break-phrase">{RANKING_NOTE}</span>
          </p>

          <FactionFilter composition={view.composition} params={params} />

          <SortSwitch params={params} />
        </section>
      </RoundCard>

      <section
        aria-labelledby="members-results-title"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="members-results-title"
              className="text-xl font-extrabold tracking-tight text-mirai-text md:text-2xl"
            >
              {heading}
            </h2>
            <p className="text-sm font-bold text-mirai-text-secondary">
              {`${view.members.length}人・${MEMBER_SORT_LABELS[params.sort]}`}
            </p>
            {view.selectedFaction?.note && (
              <p className="text-xs text-mirai-text-muted">
                {view.selectedFaction.note}
              </p>
            )}
          </div>
          {view.selectedFaction && (
            <Link
              href={membersListHref(params, { faction: null })}
              className="inline-flex min-h-11 items-center text-sm font-bold text-brand-link hover:text-brand-link-hover hover:underline"
            >
              すべての会派の議員を見る
            </Link>
          )}
        </div>

        {view.members.length === 0 ? (
          <RoundCard className="px-6 py-12 text-center text-sm text-mirai-text-secondary">
            該当する議員がいません
          </RoundCard>
        ) : (
          /*
            列は minmax(0,1fr) にして、長い会派名のピルでも列が画面より広がらない
            ようにする（既定の auto だと、ピルの文字の幅まで列が広がり、狭い画面で
            カードの右の余白が無くなる）
          */
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {view.members.map((member) => (
              <li key={member.id} className="min-w-0">
                <MemberCard
                  member={member}
                  factionName={
                    member.factionId
                      ? (factionNames.get(member.factionId) ?? null)
                      : null
                  }
                  termStart={directory.term?.termStart ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <MembersPageNote term={directory.term} sources={directory.sources} />
    </div>
  );
}

/**
 * 会派ごとの人数のピル。押すとその会派で絞り込む（「すべての会派」で戻す）。
 * 並びは区の会派構成ページの順のまま（人数で並べ替えない）。
 *
 * 上の帯は人数の割合（飾り。人数はピルに文字で書く）。狭い画面ではピルを
 * 横にスクロールさせる（会派名が長く、折り返すとカードが画面の下へ押し出される）。
 */
function FactionFilter({
  composition,
  params,
}: {
  composition: FactionComposition;
  params: MembersListParams;
}) {
  const selected = composition.rows.some(
    (row) => row.faction.slug === params.faction
  )
    ? params.faction
    : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-mirai-text">
          <Users className="size-4 text-mirai-text-muted" aria-hidden />
          会派ごとの人数
        </h2>
        <p className="text-xs text-mirai-text-muted">
          押すと、その会派の議員だけを表示します
        </p>
      </div>

      <div aria-hidden className="flex h-2.5 w-full gap-0.5">
        {composition.rows.map((row) => (
          <span
            key={row.faction.id}
            className={cn(
              "h-full rounded-full",
              row.faction.slug === selected
                ? "bg-brand-header"
                : "bg-brand-accent"
            )}
            style={{ width: `${row.percent}%` }}
          />
        ))}
      </div>

      <nav aria-label="会派で絞り込む">
        <div className="scrollbar-hide scroll-fade-right -mx-6 overflow-x-auto px-6 py-1 md:mx-0 md:overflow-visible md:px-0 md:[-webkit-mask-image:none] md:[mask-image:none]">
          <ul className="flex w-max items-center gap-2 pr-6 md:w-auto md:flex-wrap md:pr-0">
            <li>
              <FactionPill
                href={membersListHref(params, { faction: null })}
                active={selected === null}
                label="すべての会派"
                count={composition.total}
              />
            </li>
            {composition.rows.map((row) => (
              <li key={row.faction.id}>
                <FactionPill
                  href={membersListHref(params, { faction: row.faction.slug })}
                  active={row.faction.slug === selected}
                  label={row.faction.name}
                  count={row.count}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {composition.unaffiliatedCount > 0 && (
        <p className="text-xs text-mirai-text-muted">
          {`会派に属していない議員：${composition.unaffiliatedCount}人`}
        </p>
      )}
    </div>
  );
}

/** 会派のピル。選択中は塗りの角丸ピル（議案一覧のステータスのピルと同じ形）。 */
function FactionPill({
  href,
  active,
  label,
  count,
}: {
  href: Route;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-bold",
        active
          ? "border-brand-header bg-brand-header text-brand-on-header"
          : "border-line-soft bg-white text-mirai-text hover:border-brand-link/40 hover:text-brand-link"
      )}
    >
      {label}
      <span
        className={cn(
          "text-xs",
          active ? "text-brand-on-header-muted" : "text-mirai-text-muted"
        )}
      >
        <span className="font-lexend">{count}</span>人
      </span>
    </Link>
  );
}

/** 並び順の切り替え（議席番号順・五十音順だけ）。リンクで切り替える。 */
function SortSwitch({ params }: { params: MembersListParams }) {
  return (
    <nav
      aria-label="並び順"
      className="flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <span className="text-sm font-bold text-mirai-text">並び順</span>
      <ul className="flex items-center gap-1 rounded-full bg-mirai-surface p-1">
        {MEMBER_SORT_ORDERS.map((order) => {
          const active = params.sort === order;
          return (
            <li key={order}>
              {/* 見た目は 36px のまま、押せる範囲だけ上下に広げる（44px） */}
              <Link
                href={membersListHref(params, { sort: order })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "relative flex h-9 items-center rounded-full px-4 text-sm font-bold after:absolute after:inset-x-0 after:-inset-y-1",
                  active
                    ? "bg-white text-mirai-text shadow-xs"
                    : "text-mirai-text-secondary hover:text-brand-link"
                )}
              >
                {MEMBER_SORT_LABELS[order]}
              </Link>
            </li>
          );
        })}
      </ul>
      <span className="text-xs text-mirai-text-muted">
        質問の回数などの多い順には並べません
      </span>
    </nav>
  );
}
