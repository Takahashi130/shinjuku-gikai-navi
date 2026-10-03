import "server-only";

import {
  AlignLeft,
  Check,
  Clock,
  ExternalLink,
  type LucideIcon,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { BillSearchCard } from "../../client/components/bill-list/bill-search-card";
import { BillsPagination } from "../../client/components/bill-list/bills-pagination";
import { BillsSortSelect } from "../../client/components/bill-list/bills-sort-select";
import {
  type ActiveFilter,
  buildActiveFilters,
  clearFiltersHref,
} from "../../shared/utils/active-filters";
import type { BillStatusGroup } from "../../shared/utils/bill-status-group";
import {
  BILL_STATUS_GROUP_LABELS,
  BILL_STATUS_GROUPS,
} from "../../shared/utils/bill-status-group";
import {
  type BillsListTagChip,
  buildBillsListView,
} from "../../shared/utils/build-bills-list-view";
import { formatBillsResultCount } from "../../shared/utils/format-bills-result-count";
import {
  BILLS_RESULTS_ID,
  type BillsListParams,
  type BillsListSearchParams,
  billsListHref,
  billsListPageHref,
  buildBillsListQuery,
  parseBillsListParams,
} from "../../shared/utils/parse-bills-list-params";
import { getBillsWithReportCounts } from "../loaders/get-bills-with-report-counts";
import { getFeaturedTags } from "../loaders/get-featured-tags";

/**
 * 議案一覧（/bills）。Amazon の検索結果ページの作り。
 *
 * - 広い画面: 左に絞り込みのサイドバー（ステータス・テーマ・こだわり条件）、
 *   右に結果のリスト。並び替えは結果の右上
 * - 狭い画面: 絞り込みは結果の上に、横にスクロールするチップの列でまとめる
 *
 * 絞り込みの状態はすべて URL に載せる。並び替え以外はリンクで完結するので、
 * ページ全体を Server Component のまま保てる。検索語はヘッダーの検索バーが持つ。
 *
 * カードは1ページ BILLS_PER_PAGE 件ずつ出す。議案は1000件近くあり、全件を
 * 描画すると HTML が十数MBになって初回表示が極端に遅くなる。件数は、ページ
 * 分割の前の全体から数える。
 */
export async function BillsListPage({
  searchParams,
}: {
  searchParams: BillsListSearchParams;
}) {
  const params = parseBillsListParams(searchParams);
  const [allBills, featuredTags] = await Promise.all([
    getBillsWithReportCounts(),
    getFeaturedTags(),
  ]);

  // 件数はページ分割の前の全体から数える。順序の約束は buildBillsListView が
  // 持っている（範囲外のページ番号の丸めも含む）。
  const { statusCounts, tagChips, pageBills, pageInfo } = buildBillsListView(
    allBills,
    featuredTags,
    params
  );
  const activeFilters = buildActiveFilters(params, featuredTags);
  // 「審議待ち」など0件のステータスは選んでも何も出ないので並べない。
  // ただし選択中のものは、何で絞っているのか分かるよう残す。
  const statusGroups = BILL_STATUS_GROUPS.filter(
    (group) =>
      group === "all" || statusCounts[group] > 0 || params.status === group
  );
  const filters: FilterProps = {
    params,
    statusGroups,
    statusCounts,
    tagChips,
  };

  return (
    /*
      key を URL の条件ごとに変えて、条件が変わるたびに一覧の領域を作り直す。

      ふりがな表示が ON のとき、Rubyful が main の中の li・p・h1 などの innerHTML を
      丸ごと差し替える。React が持っているリンクや文字はその時点で画面から外れた
      複製になり、条件を変えても href・件数・選択中の表示が更新されない。条件で
      増減する子要素があると、React が外れたノードを取り除こうとしてページごと
      落ちる（NotFoundError: removeChild）。作り直せば、新しい要素を Rubyful が
      改めて処理する。
    */
    <div
      key={`bills-list${buildBillsListQuery(params, { page: params.page })}`}
      className="mx-auto w-full max-w-[1500px] px-3 py-4 md:px-5"
    >
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議案をさがす" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/*
          読み上げやキーボードでは見出し（h1）と結果を先に届けたいので、DOM では
          結果の列を先に置き、絞り込みのサイドバーは lg:order-first で左に出す。
        */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* 結果の見出し。件数と並び替え */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md bg-white px-4 py-3">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-mirai-text md:text-xl">
                {params.query
                  ? `「${params.query}」の検索結果`
                  : "議案をさがす"}
              </h1>
              {/*
                ページ送りの着地点。リンクのハッシュでここまでスクロールし、focus も
                移す（tabIndex={-1}）。読み上げが「N件の議案」から始まるよう、
                件数に付ける。

                中身は1つの文字列にする。ページ数で出し入れする子要素を置くと、
                ふりがな表示が ON のとき Rubyful が差し替えた後の p から React が
                子要素を取り除こうとして落ちる（initializer.tsx の注意書き）。
              */}
              <p
                id={BILLS_RESULTS_ID}
                tabIndex={-1}
                className="scroll-mt-4 text-[13px] font-bold text-mirai-text-secondary outline-none"
              >
                {formatBillsResultCount(pageInfo)}
              </p>
            </div>
            <div className="ml-auto">
              <BillsSortSelect params={params} />
            </div>
          </div>

          <MobileFilters {...filters} />

          {activeFilters.length > 0 && (
            <ActiveFilterChips
              filters={activeFilters}
              clearHref={clearFiltersHref(params)}
            />
          )}

          <h2 className="sr-only">検索結果</h2>
          {pageInfo.totalCount === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-md bg-white px-6 py-16 text-center">
              <Search
                className="h-10 w-10 text-mirai-text-placeholder"
                aria-hidden
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-base font-bold">
                  該当する議案が見つかりませんでした
                </p>
                <p className="text-[13px] text-mirai-text-muted">
                  キーワードを変えるか、絞り込み条件を解除してお試しください
                </p>
              </div>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-mirai-border rounded-md bg-white px-4">
                {pageBills.map((bill) => (
                  <li key={bill.id}>
                    <BillSearchCard bill={bill} />
                  </li>
                ))}
              </ul>
              <BillsPagination
                pageInfo={pageInfo}
                prevHref={
                  pageInfo.prevPage
                    ? billsListPageHref(params, pageInfo.prevPage)
                    : null
                }
                nextHref={
                  pageInfo.nextPage
                    ? billsListPageHref(params, pageInfo.nextPage)
                    : null
                }
              />
            </>
          )}

          {/* 掲載外の議案は本家の一覧に送る */}
          <div className="mt-2 text-sm text-mirai-text-secondary">
            <Link
              href={EXTERNAL_LINKS.SHINJUKU_GIKAI}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 flex-wrap items-center gap-1 hover:text-brand-link"
            >
              新宿区議会に提出されているすべての議案は{" "}
              <span className="underline">新宿区議会の公式ページへ</span>
              <ExternalLink className="h-3 w-3" aria-hidden />
              <span className="sr-only">（新しいタブで開きます）</span>
            </Link>
          </div>
        </div>

        <FilterSidebar
          {...filters}
          hasActiveFilters={activeFilters.length > 0}
        />
      </div>
    </div>
  );
}

type FilterProps = {
  params: BillsListParams;
  statusGroups: readonly BillStatusGroup[];
  statusCounts: Record<BillStatusGroup, number>;
  tagChips: BillsListTagChip[];
};

/** ステータスごとの目印。ラベルだけの列より状態が見分けやすくなる。 */
const STATUS_GROUP_ICONS: Record<BillStatusGroup, LucideIcon> = {
  all: AlignLeft,
  deliberating: MessageSquare,
  waiting: Clock,
  enacted: Check,
  rejected: X,
};

/** 広い画面の左の絞り込み（Amazon の検索結果の左のサイドバー）。 */
function FilterSidebar({
  params,
  statusGroups,
  statusCounts,
  tagChips,
  hasActiveFilters,
}: FilterProps & { hasActiveFilters: boolean }) {
  const href = (patch: Partial<BillsListParams>) =>
    billsListHref(params, patch);

  return (
    <aside
      aria-label="絞り込み"
      className="hidden w-60 shrink-0 flex-col gap-5 rounded-md bg-white p-4 lg:order-first lg:flex"
    >
      <SidebarSection title="ステータス">
        {statusGroups.map((group) => (
          <SidebarLink
            key={group}
            href={href({ status: group })}
            active={params.status === group}
            icon={STATUS_GROUP_ICONS[group]}
            label={BILL_STATUS_GROUP_LABELS[group]}
            count={statusCounts[group]}
          />
        ))}
      </SidebarSection>

      <SidebarSection title="テーマ">
        {tagChips.map((chip) => (
          <SidebarLink
            key={chip.id}
            href={href({ tagId: chip.tagId })}
            active={params.tagId === chip.tagId}
            label={chip.tagId ? chip.label : "すべてのテーマ"}
            count={chip.count}
          />
        ))}
      </SidebarSection>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-mirai-text">こだわり条件</h2>
        <div className="flex flex-col">
          <FilterCheckboxes params={params} />
        </div>
      </section>

      {hasActiveFilters && (
        <Link
          href={clearFiltersHref(params)}
          className="flex min-h-11 items-center text-[13px] font-bold text-brand-link hover:text-brand-link-hover hover:underline"
        >
          すべての条件を解除
        </Link>
      )}
    </aside>
  );
}

function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="mb-1 text-sm font-bold text-mirai-text">{title}</h2>
      <ul className="flex flex-col">{children}</ul>
    </section>
  );
}

function SidebarLink({
  href,
  active,
  label,
  count,
  icon: Icon,
}: {
  href: Route;
  active: boolean;
  label: string;
  count: number;
  icon?: LucideIcon;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex min-h-9 items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px]",
          active
            ? "bg-brand-accent-tint font-bold text-brand-link"
            : "text-mirai-text hover:bg-mirai-surface hover:text-brand-link"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
          {label}
        </span>
        <span className="font-lexend text-xs text-mirai-text-muted">
          {count}
        </span>
      </Link>
    </li>
  );
}

/**
 * 狭い画面の絞り込み。結果の上に、横にスクロールするチップの列でまとめる。
 * サイドバーをそのまま上に積むと、結果が画面の下へ押し出される。
 */
function MobileFilters({
  params,
  statusGroups,
  statusCounts,
  tagChips,
}: FilterProps) {
  const href = (patch: Partial<BillsListParams>) =>
    billsListHref(params, patch);

  return (
    <div className="flex flex-col gap-2.5 rounded-md bg-white p-3 lg:hidden">
      <ChipRow label="ステータス">
        {statusGroups.map((group) => (
          <Chip
            key={group}
            href={href({ status: group })}
            active={params.status === group}
            label={BILL_STATUS_GROUP_LABELS[group]}
            count={statusCounts[group]}
          />
        ))}
      </ChipRow>
      <ChipRow label="テーマ">
        {tagChips.map((chip) => (
          <Chip
            key={chip.id}
            href={href({ tagId: chip.tagId })}
            active={params.tagId === chip.tagId}
            label={chip.tagId ? chip.label : "すべてのテーマ"}
            count={chip.count}
          />
        ))}
      </ChipRow>
      <div className="flex flex-wrap gap-x-5">
        <FilterCheckboxes params={params} />
      </div>
    </div>
  );
}

/**
 * 横にスクロールするチップの列。
 *
 * スクロールする箱は中身を上下にも切り取るので、フォーカスの枠（外側に4px）が
 * 欠けないよう、箱の内側に上下の余白を取り、その分を負のマージンで打ち消す。
 */
function ChipRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav
      aria-label={label}
      className="scrollbar-hide -mx-3 -my-1 overflow-x-auto px-3 py-1"
    >
      <ul className="flex w-max items-center gap-1.5">{children}</ul>
    </nav>
  );
}

function Chip({
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
    <li>
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
        <span className="font-lexend text-xs font-bold text-mirai-text-muted">
          {count}
        </span>
      </Link>
    </li>
  );
}

/**
 * 「賛否が分かれた議案のみ」「AIインタビュー受付中のみ」。
 *
 * 押すと条件を切り替えたページへ移動するリンク。見た目はチェックボックスだが、
 * role="checkbox" にすると読み上げでチェックボックスと伝わり、Space で切り替え
 * ようとしても（リンクは Enter でしか動かないので）ページがスクロールするだけに
 * なる。リンクのまま、選択中かどうかは読み上げ用の文字で添える。
 */
function FilterCheckboxes({ params }: { params: BillsListParams }) {
  return (
    <>
      <FilterCheckbox
        href={billsListHref(params, { splitOnly: !params.splitOnly })}
        checked={params.splitOnly}
        label="賛否が分かれた議案のみ"
      />
      <FilterCheckbox
        href={billsListHref(params, { interviewOnly: !params.interviewOnly })}
        checked={params.interviewOnly}
        label="AIインタビュー受付中のみ"
      />
    </>
  );
}

function FilterCheckbox({
  href,
  checked,
  label,
}: {
  href: Route;
  checked: boolean;
  label: string;
}) {
  return (
    /*
      inline-flex にすると行ボックスのベースライン計算に参加し、チェックの
      アイコンが入った瞬間に行の高さが変わる。flex にしてベースラインへの
      依存を切る。押しやすいよう高さは 44px 取る。
    */
    <Link
      href={href}
      className="flex min-h-11 w-fit items-center gap-2 text-[13px] text-mirai-text hover:text-brand-link"
    >
      {/* 枠線の有無で寸法が変わらないよう、選択時も border を残して色だけ変える */}
      <span
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border",
          checked
            ? "border-brand-link bg-brand-link"
            : "border-mirai-text-muted bg-white"
        )}
        aria-hidden
      >
        {checked && <Check className="size-3 text-white" strokeWidth={3.5} />}
      </span>
      {label}
      <span className="sr-only">{checked ? "（選択中）" : "（未選択）"}</span>
    </Link>
  );
}

/** いま効いている絞り込み。押すとその条件だけ外す。 */
function ActiveFilterChips({
  filters,
  clearHref,
}: {
  filters: ActiveFilter[];
  clearHref: Route;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] text-mirai-text-secondary">
        絞り込み中：
      </span>
      <ul className="flex flex-wrap items-center gap-1.5">
        {filters.map((filter) => (
          <li key={filter.key}>
            <Link
              href={filter.removeHref}
              aria-label={`${filter.label}の条件を外す`}
              className="flex h-9 items-center gap-1 rounded-full border border-mirai-border bg-white px-3 text-xs font-bold text-mirai-text hover:border-brand-link hover:text-brand-link"
            >
              {filter.label}
              <X className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={clearHref}
        className="inline-flex min-h-11 items-center px-1 text-xs font-bold text-brand-link hover:text-brand-link-hover hover:underline"
      >
        すべて解除
      </Link>
    </div>
  );
}
