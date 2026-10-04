import "server-only";

import {
  Check,
  ExternalLink,
  FileText,
  MessageSquareText,
  Search,
  Split,
  X,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { RoundCard } from "@/components/ui/round-card";
import { EXTERNAL_LINKS } from "@/config/external-links";
import { getBillParticipationBadges } from "@/features/bill-participation/server/loaders/get-bill-participation-badges";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { BillCard } from "../../client/components/bill-list/bill-card";
import { BillsFilterForm } from "../../client/components/bill-list/bills-filter-form";
import { BillsPagination } from "../../client/components/bill-list/bills-pagination";
import {
  type ActiveFilter,
  buildActiveFilters,
  clearFiltersHref,
} from "../../shared/utils/active-filters";
import {
  BILL_STATUS_GROUP_LABELS,
  BILL_STATUS_GROUPS,
} from "../../shared/utils/bill-status-group";
import { buildBillsListView } from "../../shared/utils/build-bills-list-view";
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
 * 議案一覧（/bills）。
 *
 * 上に白い角丸のカードで絞り込み（検索欄・ステータスのピル・テーマと並び替えの
 * 選択）をまとめ、その下に大きめのカードで結果を並べる。ヘッダーの検索
 * アイコンは、この検索欄（BILLS_SEARCH_INPUT_ID）へ送る。
 *
 * 絞り込みの状態はすべて URL に載せる。ステータスと切り替えはリンク、検索語・
 * テーマ・並び替えはフォームの送信（BillsFilterForm）で反映する。どちらも
 * JavaScript が無くても動く。
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
  // 解説・区民投票の印は、このページに出す議案の分だけまとめて取る
  const participationBadges = await getBillParticipationBadges(
    pageBills.map((bill) => bill.id)
  );
  const activeFilters = buildActiveFilters(params, featuredTags);
  // 「審議待ち」など0件のステータスは選んでも何も出ないので並べない。
  // ただし選択中のものは、何で絞っているのか分かるよう残す。
  const statusGroups = BILL_STATUS_GROUPS.filter(
    (group) =>
      group === "all" || statusCounts[group] > 0 || params.status === group
  );
  // AIインタビューを受け付けている議案が無いあいだは、その絞り込みを出さない
  // （選んでも0件になるだけ）。URL で指定されたときは外せるよう残す。
  const showInterviewToggle =
    params.interviewOnly || allBills.some((bill) => bill.hasPublicInterview);
  const href = (patch: Partial<BillsListParams>) =>
    billsListHref(params, patch);

  return (
    /*
      key を URL の条件ごとに変えて、条件が変わるたびに一覧の領域を作り直す。

      ふりがな表示が ON のとき、Rubyful が main の中の li・p・h1 などの innerHTML を
      丸ごと差し替える。React が持っているリンクや文字はその時点で画面から外れた
      複製になり、条件を変えても href・件数・選択中の表示が更新されない。条件で
      増減する子要素があると、React が外れたノードを取り除こうとしてページごと
      落ちる（NotFoundError: removeChild）。作り直せば、新しい要素を Rubyful が
      改めて処理する。検索欄の初期値（defaultValue）も、作り直すことで新しい
      検索語に入れ替わる。
    */
    <div
      key={`bills-list${buildBillsListQuery(params, { page: params.page })}`}
      className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 md:py-8"
    >
      <Breadcrumb
        items={[
          { label: "トップ", href: routes.home() },
          { label: "議案をさがす" },
        ]}
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-mirai-text md:text-3xl">
          {params.query ? `「${params.query}」の検索結果` : "議案をさがす"}
        </h1>
        {/*
          ページ送りの着地点。リンクのハッシュでここまでスクロールし、focus も
          移す（tabIndex={-1}）。読み上げが「N件の議案」から始まるよう、件数に付ける。

          中身は1つの文字列にする。ページ数で出し入れする子要素を置くと、
          ふりがな表示が ON のとき Rubyful が差し替えた後の p から React が
          子要素を取り除こうとして落ちる（initializer.tsx の注意書き）。
        */}
        <p
          id={BILLS_RESULTS_ID}
          tabIndex={-1}
          className="scroll-mt-4 text-sm font-bold text-mirai-text-secondary outline-none"
        >
          {formatBillsResultCount(pageInfo)}
        </p>
      </div>

      <RoundCard asChild>
        <section aria-label="絞り込み">
          <BillsFilterForm params={params} tagChips={tagChips}>
            {/*
              狭い画面でも全部が見えるよう、横にスクロールさせずに折り返す。
              ステータスと切り替え（賛否が分かれた・AIインタビュー）は、狭い
              画面では行を分け、広い画面では区切り線をはさんで1行に並べる。
            */}
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
              <nav aria-label="ステータス">
                <ul className="flex flex-wrap items-center gap-2">
                  {statusGroups.map((group) => (
                    <li key={group}>
                      <FilterPill
                        href={href({ status: group })}
                        active={params.status === group}
                        label={BILL_STATUS_GROUP_LABELS[group]}
                        count={statusCounts[group]}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
              <ul
                aria-label="ほかの絞り込み"
                className="flex flex-wrap items-center gap-2 md:border-line-soft md:border-l md:pl-3"
              >
                <li>
                  <TogglePill
                    href={href({ splitOnly: !params.splitOnly })}
                    checked={params.splitOnly}
                    icon={<Split className="size-4" aria-hidden />}
                    label="賛否が分かれた議案のみ"
                  />
                </li>
                <li>
                  <TogglePill
                    href={href({
                      memberSubmittedOnly: !params.memberSubmittedOnly,
                    })}
                    checked={params.memberSubmittedOnly}
                    icon={<FileText className="size-4" aria-hidden />}
                    label="議員提出議案のみ"
                  />
                </li>
                {showInterviewToggle && (
                  <li>
                    <TogglePill
                      href={href({ interviewOnly: !params.interviewOnly })}
                      checked={params.interviewOnly}
                      icon={
                        <MessageSquareText className="size-4" aria-hidden />
                      }
                      label="AIインタビュー受付中のみ"
                    />
                  </li>
                )}
              </ul>
            </div>
          </BillsFilterForm>
        </section>
      </RoundCard>

      {activeFilters.length > 0 && (
        <ActiveFilterChips
          filters={activeFilters}
          clearHref={clearFiltersHref(params)}
        />
      )}

      <h2 className="sr-only">検索結果</h2>
      {pageInfo.totalCount === 0 ? (
        <RoundCard className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <Search className="size-10 text-mirai-text-placeholder" aria-hidden />
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-bold">
              該当する議案が見つかりませんでした
            </p>
            <p className="text-sm text-mirai-text-muted">
              キーワードを変えるか、絞り込み条件を解除してお試しください
            </p>
          </div>
        </RoundCard>
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {pageBills.map((bill) => (
              <li key={bill.id}>
                <BillCard
                  bill={bill}
                  participation={participationBadges[bill.id]}
                />
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
      <div className="text-sm text-mirai-text-secondary">
        <Link
          href={EXTERNAL_LINKS.SHINJUKU_GIKAI}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 flex-wrap items-center gap-1 hover:text-brand-link"
        >
          新宿区議会に提出されているすべての議案は{" "}
          <span className="underline">新宿区議会の公式ページへ</span>
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">（新しいタブで開きます）</span>
        </Link>
      </div>
    </div>
  );
}

/** ステータスのピル。選択中は塗りの角丸ピル。 */
function FilterPill({
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
          "font-lexend text-xs",
          active ? "text-brand-on-header-muted" : "text-mirai-text-muted"
        )}
      >
        {count}
      </span>
    </Link>
  );
}

/**
 * 「賛否が分かれた議案のみ」「AIインタビュー受付中のみ」。
 *
 * 押すと条件を切り替えたページへ移動するリンク。選択中かどうかは見た目
 * （チェックの印と塗り）と、読み上げ用の文字で添える。role="checkbox" には
 * しない（リンクは Space で切り替わらないので、チェックボックスと伝えると
 * 操作が食い違う）。
 */
function TogglePill({
  href,
  checked,
  icon,
  label,
}: {
  href: Route;
  checked: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-bold",
        checked
          ? "border-brand-link bg-brand-accent-tint text-brand-link"
          : "border-line-soft bg-white text-mirai-text hover:border-brand-link/40 hover:text-brand-link"
      )}
    >
      {checked ? (
        <Check className="size-4" strokeWidth={3} aria-hidden />
      ) : (
        icon
      )}
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
      <span className="text-sm text-mirai-text-secondary">絞り込み中：</span>
      <ul className="flex flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <li key={filter.key}>
            <Link
              href={filter.removeHref}
              aria-label={`${filter.label}の条件を外す`}
              // 見た目は 36px のまま、押せる範囲だけ上下に広げる（44px）
              className="relative flex h-9 items-center gap-1 rounded-full border border-line-soft bg-white px-3 text-xs font-bold text-mirai-text after:absolute after:inset-x-0 after:-inset-y-1 hover:border-brand-link hover:text-brand-link"
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
