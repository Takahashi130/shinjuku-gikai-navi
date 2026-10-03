import Link from "next/link";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import type { BillListItem } from "../../../shared/types";
import { BillStatusBadge } from "./bill-status-badge";
import { BillThumbnail } from "./bill-thumbnail";
import { SplitVoteMark } from "./split-vote-mark";

/** タイルに要る最小限。一覧用の軽い議案でも、本文つきの議案でも渡せる。 */
export type BillTileData = Pick<
  BillListItem,
  "id" | "name" | "status" | "submitted_date" | "thumbnail_url"
> & {
  is_featured?: boolean;
  bill_content?: { title?: string | null } | null;
};

/**
 * 横スクロールの列に並べる縦長のカード（Amazon の商品タイル）。
 * サムネイルの上にステータス、下にタイトルと提出日を出す。
 */
export function BillTile({ bill }: { bill: BillTileData }) {
  const title = bill.bill_content?.title || bill.name;

  return (
    <Link
      href={routes.billDetail(bill.id)}
      className="group flex h-full flex-col gap-2 rounded-md"
    >
      <div className="relative">
        <BillThumbnail
          src={bill.thumbnail_url}
          sizes="(min-width: 700px) 192px, 160px"
          className="aspect-[4/3] w-full"
        />
        <BillStatusBadge
          status={bill.status}
          className="absolute top-2 left-2 shadow-xs"
        />
      </div>
      <h3 className="line-clamp-3 text-[13px] font-bold leading-snug text-mirai-text group-hover:text-brand-link group-hover:underline">
        {title}
      </h3>
      <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
        {bill.is_featured && <SplitVoteMark />}
        {bill.submitted_date && (
          <span className="text-xs text-mirai-text-muted">
            {formatDateWithDots(bill.submitted_date)} 提出
          </span>
        )}
      </div>
    </Link>
  );
}
