import { EXTERNAL_LINKS } from "@/config/external-links";
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
import { Container } from "@/components/layouts/container";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { routes } from "@/lib/routes";
import { BillSearchCard } from "../../client/components/bill-list/bill-search-card";
import { BillsPagination } from "../../client/components/bill-list/bills-pagination";
import { BillsSortSelect } from "../../client/components/bill-list/bills-sort-select";
import type { BillStatusGroup } from "../../shared/utils/bill-status-group";
import {
  BILL_STATUS_GROUP_LABELS,
  BILL_STATUS_GROUPS,
} from "../../shared/utils/bill-status-group";
import { buildBillsListView } from "../../shared/utils/build-bills-list-view";
import {
  BILLS_RESULTS_ID,
  type BillsListParams,
  type BillsListSearchParams,
  billsListHref,
  billsListPageHref,
  parseBillsListParams,
} from "../../shared/utils/parse-bills-list-params";
import { splitIntoRows } from "../../shared/utils/split-into-rows";
import { tagChipRowCount } from "../../shared/utils/tag-chip-row-count";
import { getBillsWithReportCounts } from "../loaders/get-bills-with-report-counts";
import { getFeaturedTags } from "../loaders/get-featured-tags";

/**
 * 議案一覧（/bills）。見出しは「議案を検索する」。
 *
 * 絞り込みの状態はすべて URL に載せる。並び替え以外はリンクで完結するので、
 * ページ全体を Server Component のまま保てる。
 *
 * カードは1ページ BILLS_PER_PAGE 件ずつ出す。議案は1000件近くあり、全件を
 * 描画すると HTML が十数MBになって初回表示が極端に遅くなる。件数のタブと
 * チップは、ページ分割の前の全体から数える。
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
  // typedRoutes はクエリ付きのテンプレート文字列を推論できないため、
  // リンク生成をここに集約してキャストも1箇所に閉じる。
  // 絞り込みのリンクは page を渡さないので1ページ目に戻る。ページ送りは
  // 一覧の先頭に着地させるため billsListPageHref で作る。
  const href = (patch: Partial<BillsListParams>) =>
    billsListHref(params, patch);

  return (
    <Container className="pt-24 pb-8 md:pt-8">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議案を検索する" },
          ]}
        />
      </div>

      <h1 className="mb-4 text-3xl font-bold">議案を検索する</h1>

      <form action={routes.billsList()} className="mb-5">
        <div className="flex h-12 items-center gap-2.5 rounded-full border border-mirai-border bg-white pr-4 pl-5">
          <Search
            className="h-[18px] w-[18px] shrink-0 text-mirai-text-muted"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            aria-label="議案を検索"
            defaultValue={params.query}
            placeholder="議案名やキーワードで探す"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        {/*
          検索しても他の絞り込みを落とさない。既定値を出さない規則は
          buildBillsListQuery が持っているので、そこから導出する。
          q はテキスト入力が持つので取り除く。
        */}
        {[
          ...new URLSearchParams(
            billsListHref(params, { query: "" }).split("?")[1] ?? ""
          ),
        ].map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>

      <FilterGroup label="ステータス">
        {BILL_STATUS_GROUPS.map((group) => (
          <Chip
            key={group}
            href={href({ status: group })}
            active={params.status === group}
            icon={STATUS_GROUP_ICONS[group]}
            label={BILL_STATUS_GROUP_LABELS[group]}
            count={statusCounts[group]}
          />
        ))}
      </FilterGroup>

      <section className="mb-4">
        <h2 className="mb-2 text-[13px] font-bold text-mirai-text-secondary">
          カテゴリ
        </h2>
        {/*
          タグは本番で18件あり、折り返すと縦に伸びて一覧が押し下がる。
          多いときは2行に詰めて横スクロールさせる。grid で流すと列幅が最長の
          チップに揃って短いチップの右に空白が残るので、行ごとに独立した
          flex にする。

          少ないときは1行にする。絞り込みでチップが数個に減ったときに2行へ
          割ると、横に余白があるのに縦に並んでしまう。
        */}
        <div className="scrollbar-hide overflow-x-auto">
          <div className="flex w-max flex-col gap-1.5">
            {splitIntoRows(tagChips, tagChipRowCount(tagChips.length)).map(
              (row, rowIndex) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: 行は固定順で再並びしない
                  key={rowIndex}
                  className="flex items-center gap-1.5"
                >
                  {row.map((chip) => (
                    <Chip
                      key={chip.id}
                      href={href({ tagId: chip.tagId })}
                      active={params.tagId === chip.tagId}
                      label={chip.label}
                      count={chip.count}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/*
        リンクで絞り込むのでフォーム部品ではないが、見た目はチェックボックスなので
        状態が支援技術にも伝わるようにする。

        inline-flex にすると行ボックスのベースライン計算に参加し、チェックの
        アイコンが入った瞬間に行の高さが変わって下の一覧が数px動く。block に
        してベースラインへの依存を切る。
      */}
      <Link
        href={href({ interviewOnly: !params.interviewOnly })}
        role="checkbox"
        aria-checked={params.interviewOnly}
        className="mb-4 flex w-fit items-center gap-2 text-[13px] font-bold"
      >
        {/*
          枠線の有無で寸法が変わらないよう、選択時も border を残して色だけ
          透明にする。太さが変わると行の高さが動いて一覧がずれる。
        */}
        <span
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${
            params.interviewOnly
              ? "border-transparent bg-mirai-gradient"
              : "border-mirai-border-light bg-white"
          }`}
          aria-hidden
        >
          {params.interviewOnly && (
            <Check className="h-3 w-3 text-black" strokeWidth={3.5} />
          )}
        </span>
        AIインタビュー受付中のみ表示
      </Link>

      <div className="mb-3 flex items-center gap-3">
        {/*
          ページ送りの着地点。リンクのハッシュでここまでスクロールし、focus も
          移す（tabIndex={-1}）。scroll-mt-24 は固定ヘッダー（top-4 + h-16）の分。
          読み上げが「N件の議案」から始まるよう、行ではなく件数に付ける。

          ページが複数あるときは表示中の範囲を添える。件数だけだとどのページも
          同じ文言で、ページを移ったことが分からない。狭い画面では範囲が2行目に
          送られる。
        */}
        <p
          id={BILLS_RESULTS_ID}
          tabIndex={-1}
          className="min-w-0 scroll-mt-24 text-[13px] font-bold text-mirai-text-secondary outline-none"
        >
          <span className="whitespace-nowrap">
            {pageInfo.totalCount}件の議案
          </span>
          {pageInfo.totalPages > 1 && (
            <span className="whitespace-nowrap font-normal text-mirai-text-muted">
              （{pageInfo.startIndex + 1}〜{pageInfo.endIndex}件目）
            </span>
          )}
        </p>
        <BillsSortSelect params={params} />
      </div>

      {pageInfo.totalCount === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-mirai-border bg-white px-6 py-16 text-center">
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
          <ul className="flex flex-col gap-3">
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
      <div className="mt-8 text-sm text-mirai-text-secondary">
        <Link
          href={EXTERNAL_LINKS.SHINJUKU_GIKAI}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:opacity-80"
        >
          新宿区議会に提出されているすべての議案は{" "}
          <span className="underline">新宿区議会の公式ページへ</span>
          <ExternalLink className="h-3 w-3" aria-hidden />
        </Link>
      </div>
    </Container>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <h2 className="mb-2 text-[13px] font-bold text-mirai-text-secondary">
        {label}
      </h2>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </section>
  );
}

/** ステータスごとの目印。ラベルだけの列より状態が見分けやすくなる。 */
const STATUS_GROUP_ICONS: Record<BillStatusGroup, LucideIcon> = {
  all: AlignLeft,
  deliberating: MessageSquare,
  waiting: Clock,
  enacted: Check,
  rejected: X,
};

/**
 * 絞り込みのチップ。
 *
 * ステータスとカテゴリで同じ描画にする。片方だけラベルに数字を混ぜると、
 * 数字のフォントや色が並びの中で食い違う。
 */
function Chip({
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
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-bold whitespace-nowrap ${
        active
          ? "border-transparent bg-mirai-gradient text-mirai-text"
          : "border-mirai-border bg-white text-mirai-text"
      }`}
    >
      {Icon && <Icon className="h-[15px] w-[15px] shrink-0" aria-hidden />}
      {label}
      {/*
        選択中だけ濃くする。全部同じ濃さだとラベルと数字の区別が付かず、
        どれが選ばれているのかも読み取りにくい。色はトップのタグチップ
        （TagChipLink）に揃えている。
      */}
      <span
        className={`font-lexend text-xs font-bold ${
          active ? "text-mirai-text" : "text-mirai-text-muted"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
