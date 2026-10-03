import "server-only";

import { Users } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
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
import { MembersPageNote } from "./members-page-note";

/**
 * 議員の一覧（/members）。議案一覧と同じ Amazon の検索結果ページの作り。
 *
 * - 上部: 会派ごとの人数（押すとその会派で絞り込む）
 * - 結果の見出し: 件数と並び順（議席番号順・五十音順）
 * - カード: 頭文字のアイコン・名前・会派・委員会・本会議の質問の回数
 *
 * 絞り込みと並び順は URL に載せ、リンクだけで切り替える（Server Component のまま）。
 * 質問の多い順などのランキングは出さない（2027年4月ごろに区議選があるため）。
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
    : "新宿区議会の議員";

  return (
    /*
      条件が変わるたびに一覧の領域を作り直す。ふりがな表示が ON のとき
      Rubyful が li・p などの中身を差し替えるので、作り直さないと React の
      持つ要素が画面から外れ、リンクや件数が更新されない（議案一覧と同じ）。
    */
    <div
      key={`members-list${membersListHref(params)}`}
      className="mx-auto w-full max-w-[1500px] px-3 py-4 md:px-5"
    >
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議員をさがす" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-md bg-white px-4 py-3">
          <h1 className="text-lg font-bold text-mirai-text md:text-xl">
            新宿区議会の議員
          </h1>
          <p className="text-[13px] text-mirai-text-secondary">
            {directory.term
              ? `${directory.members.length}人・第${directory.term.termNumber}期（${formatDate(directory.term.termStart)}〜${formatDate(directory.term.termEnd)}）`
              : `${directory.members.length}人`}
          </p>
          <p className="mt-1 text-xs text-mirai-text-muted">
            区の公開資料をもとに作成。ランキングはしていません。
          </p>
        </div>

        <FactionCompositionPanel
          composition={view.composition}
          params={params}
        />

        <section
          aria-labelledby="members-results-title"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-white px-4 py-3">
            <div className="min-w-0">
              <h2
                id="members-results-title"
                className="text-base font-bold text-mirai-text md:text-lg"
              >
                {heading}
              </h2>
              <p className="text-[13px] font-bold text-mirai-text-secondary">
                {`${view.members.length}人・${MEMBER_SORT_LABELS[params.sort]}`}
              </p>
              {view.selectedFaction?.note && (
                <p className="text-xs text-mirai-text-muted">
                  {view.selectedFaction.note}
                </p>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              {view.selectedFaction && (
                <Link
                  href={membersListHref(params, { faction: null })}
                  className="inline-flex min-h-11 items-center text-[13px] font-bold text-brand-link hover:text-brand-link-hover hover:underline"
                >
                  すべての会派を見る
                </Link>
              )}
              <SortSwitch params={params} />
            </div>
          </div>

          {view.members.length === 0 ? (
            <p className="rounded-md bg-white px-4 py-10 text-center text-sm text-mirai-text-secondary">
              該当する議員がいません
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 pcl:grid-cols-4">
              {view.members.map((member) => (
                <li key={member.id}>
                  <MemberCard
                    member={member}
                    factionName={
                      member.factionId
                        ? (factionNames.get(member.factionId) ?? null)
                        : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <MembersPageNote
          questionsSince={directory.questionsSince}
          sources={directory.sources}
        />
      </div>
    </div>
  );
}

/**
 * 会派ごとの人数。押すとその会派で絞り込む（もう一度押すと解除はしない。
 * 「すべての会派」で戻す）。
 *
 * 広い画面は帯つきの行を格子に並べ、狭い画面は横にスクロールするチップに
 * まとめる（行を縦に積むと、カードが画面の下へ押し出される）。並びは区の
 * 会派構成ページの順のまま。
 */
function FactionCompositionPanel({
  composition,
  params,
}: {
  composition: FactionComposition;
  params: MembersListParams;
}) {
  const allActive =
    params.faction === null ||
    !composition.rows.some((row) => row.faction.slug === params.faction);

  return (
    <section
      aria-labelledby="faction-composition-title"
      className="rounded-md bg-white p-4"
    >
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="faction-composition-title"
          className="flex items-center gap-1.5 text-base font-bold text-mirai-text md:text-lg"
        >
          <Users className="size-5 text-brand-link" aria-hidden />
          会派ごとの人数
        </h2>
        <span className="text-xs text-mirai-text-muted">
          {`合計${composition.total}人・会派を選ぶと、その会派の議員だけを表示します`}
        </span>
      </div>

      {/* 狭い画面：割合の帯と、横にスクロールするチップ */}
      <div className="flex flex-col gap-3 md:hidden">
        <div
          aria-hidden
          className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
        >
          {composition.rows.map((row) => (
            <div
              key={row.faction.id}
              className={cn(
                "h-full",
                row.faction.slug === params.faction
                  ? "bg-brand-link"
                  : "bg-brand-accent"
              )}
              style={{ width: `${row.percent}%` }}
            />
          ))}
        </div>
        <nav
          aria-label="会派で絞り込む"
          className="scrollbar-hide -mx-4 -my-1 overflow-x-auto px-4 py-1"
        >
          <ul className="flex w-max items-center gap-1.5">
            <li>
              <FactionChip
                href={membersListHref(params, { faction: null })}
                active={allActive}
                label="すべての会派"
                count={composition.total}
              />
            </li>
            {composition.rows.map((row) => (
              <li key={row.faction.id}>
                <FactionChip
                  href={membersListHref(params, { faction: row.faction.slug })}
                  active={params.faction === row.faction.slug}
                  label={row.faction.name}
                  count={row.count}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 広い画面：帯つきの行 */}
      <nav aria-label="会派で絞り込む" className="hidden md:block">
        <ul className="grid gap-x-6 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
          <li>
            <FactionRow
              href={membersListHref(params, { faction: null })}
              active={allActive}
              label="すべての会派"
              count={composition.total}
              percent={100}
            />
          </li>
          {composition.rows.map((row) => (
            <li key={row.faction.id}>
              <FactionRow
                href={membersListHref(params, { faction: row.faction.slug })}
                active={params.faction === row.faction.slug}
                label={row.faction.name}
                count={row.count}
                percent={row.percent}
              />
            </li>
          ))}
        </ul>
      </nav>

      {composition.unaffiliatedCount > 0 && (
        <p className="mt-2 text-xs text-mirai-text-muted">
          {`会派に属していない議員：${composition.unaffiliatedCount}人`}
        </p>
      )}
    </section>
  );
}

function FactionRow({
  href,
  active,
  label,
  count,
  percent,
}: {
  href: Route;
  active: boolean;
  label: string;
  count: number;
  percent: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group flex min-h-11 flex-col justify-center gap-1 rounded-sm px-2 py-1.5",
        active ? "bg-brand-accent-tint" : "hover:bg-mirai-surface"
      )}
    >
      <span className="flex items-baseline justify-between gap-2 text-[13px]">
        <span
          className={cn(
            "min-w-0",
            active
              ? "font-bold text-brand-link"
              : "text-mirai-text group-hover:text-brand-link"
          )}
        >
          {label}
        </span>
        <span className="shrink-0 font-bold text-mirai-text">{count}人</span>
      </span>
      <span
        aria-hidden
        className="block h-1.5 w-full overflow-hidden rounded-full bg-mirai-surface-muted"
      >
        <span
          className={cn(
            "block h-full rounded-full",
            active ? "bg-brand-link" : "bg-brand-accent"
          )}
          style={{ width: `${percent}%` }}
        />
      </span>
    </Link>
  );
}

function FactionChip({
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
        "flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-bold",
        active
          ? "border-brand-link bg-brand-accent-tint text-brand-link"
          : "border-mirai-border bg-white text-mirai-text"
      )}
    >
      {label}
      <span className="text-xs font-bold text-mirai-text-muted">{count}人</span>
    </Link>
  );
}

/** 並び順の切り替え（議席番号順・五十音順）。リンクで切り替える。 */
function SortSwitch({ params }: { params: MembersListParams }) {
  return (
    <nav aria-label="並び順" className="flex items-center gap-2">
      <span className="text-[13px] text-mirai-text-secondary">並び順：</span>
      <ul className="flex overflow-hidden rounded-md border border-mirai-border">
        {MEMBER_SORT_ORDERS.map((order) => {
          const active = params.sort === order;
          return (
            <li
              key={order}
              className="border-mirai-border border-l first:border-l-0"
            >
              <Link
                href={membersListHref(params, { sort: order })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-9 items-center px-3 text-[13px] font-bold",
                  active
                    ? "bg-brand-accent-tint text-brand-link"
                    : "bg-white text-mirai-text hover:bg-mirai-surface"
                )}
              >
                {MEMBER_SORT_LABELS[order]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
