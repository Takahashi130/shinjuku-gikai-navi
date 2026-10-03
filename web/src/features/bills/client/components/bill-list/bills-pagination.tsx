import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "../../../shared/utils/pagination";
import { PageLinkIcon } from "./page-link-icon";

type Props = {
  pageInfo: PageInfo;
  /** 前のページへのリンク。1ページ目では null。 */
  prevHref: Route | null;
  /** 次のページへのリンク。最終ページでは null。 */
  nextHref: Route | null;
};

/**
 * 議案一覧の下に置くページ送り。
 *
 * 前へ／次へと「現在 / 総ページ数」だけにする。番号を並べると狭い画面で
 * 折り返し、押し間違えやすくなる。ボタンは Button の既定の高さ（52px）の
 * ままにして、指でも押しやすい大きさを保つ。
 *
 * リンクの生成は呼び出し側に任せる。絞り込みの状態を URL に載せる規則は
 * billsListPageHref が持っており、ここで組み立てると二重になる。
 *
 * 1ページに収まるときは何も出さない。
 */
export function BillsPagination({ pageInfo, prevHref, nextHref }: Props) {
  if (pageInfo.totalPages <= 1) return null;

  const { page, totalPages, totalCount, startIndex, endIndex } = pageInfo;

  return (
    <nav
      aria-label="ページ送り"
      className="flex flex-col items-center gap-3 rounded-3xl border border-line-soft bg-white px-4 py-5 shadow-xs"
    >
      {/*
        「全N件中」だと、絞り込み中でも全議案の件数に読める。上の「N件の議案」
        と同じく、絞り込んだ結果の件数として書く。
      */}
      <p className="text-[13px] font-bold text-mirai-text-secondary">
        {totalCount}件中 {startIndex + 1}〜{endIndex}件目を表示
      </p>
      {/*
        ボタンは中身の幅（min-w-fit）から w-28 までの間で、空いた幅に合わせて
        伸び縮みさせる。中央の文字はページ数の桁が増えるとボタンより先に縮み、
        「ページ」を2行目に送る。ボタンを固定幅にすると、360px 以下の画面で
        横にはみ出す。
      */}
      <div className="flex w-full max-w-md items-center justify-between gap-2 sm:gap-3">
        <PageButton href={prevHref} direction="prev" />
        <p className="min-w-0 text-center text-sm leading-tight font-bold text-mirai-text">
          {/* 「3 スラッシュ 32」と読まれて意味が取りにくいので、読み上げには文で渡す */}
          <span aria-hidden>
            <span className="whitespace-nowrap">
              <span className="font-lexend">{page}</span>
              <span className="text-mirai-text-muted">
                {" / "}
                <span className="font-lexend">{totalPages}</span>
              </span>
            </span>{" "}
            <span className="whitespace-nowrap text-mirai-text-muted">
              ページ
            </span>
          </span>
          <span className="sr-only">{`${totalPages}ページ中 ${page}ページ目`}</span>
        </p>
        <PageButton href={nextHref} direction="next" />
      </div>
    </nav>
  );
}

/**
 * 見た目の文言と、読み上げの名前。
 *
 * 見た目は幅を取らないよう短くする。読み上げはリンクの一覧から単独で
 * 選ばれても何の前後か分かるよう、「ページ」まで言う。
 */
const PAGE_BUTTON_LABELS = {
  prev: { text: "前へ", name: "前のページへ" },
  next: { text: "次へ", name: "次のページへ" },
} as const;

/**
 * 中身の幅を下限、w-28 を上限に伸び縮みさせる。Button は shrink-0 だが、
 * flex-basis を 0 にして余った幅を grow で分け合うので、縮む向きは
 * min-w-fit で止まる。
 */
const PAGE_BUTTON_CLASS = "min-w-fit max-w-28 flex-1";

/**
 * 前へ／次へのボタン。
 *
 * 端のページでも消さずに押せない状態で残す。消すと中央の表示と反対側の
 * ボタンが横にずれ、続けて押したときに別のボタンを押してしまう。
 */
function PageButton({
  href,
  direction,
}: {
  href: Route | null;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  const { text, name } = PAGE_BUTTON_LABELS[direction];

  if (!href) {
    const Icon = isPrev ? ChevronLeft : ChevronRight;
    return (
      <Button
        variant="outline"
        disabled
        aria-label={name}
        className={PAGE_BUTTON_CLASS}
      >
        {isPrev && <Icon aria-hidden />}
        {text}
        {!isPrev && <Icon aria-hidden />}
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" className={PAGE_BUTTON_CLASS}>
      <Link href={href} rel={isPrev ? "prev" : "next"} aria-label={name}>
        {isPrev && <PageLinkIcon direction="prev" />}
        {text}
        {!isPrev && <PageLinkIcon direction="next" />}
      </Link>
    </Button>
  );
}
