import Link from "next/link";
import { routes } from "@/lib/routes";
import { BillThumbnail } from "../../../client/components/bill-list/bill-thumbnail";
import type { BillTileData } from "../../../client/components/bill-list/bill-tile";
import type { ThemeShelf } from "../../../shared/utils/build-home-view";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { HomePanel } from "./home-panel";

/**
 * テーマ別のカード（Amazon のカテゴリカード）。
 * 見出しと、そのテーマの新しい議案4件を2×2のサムネイルで並べる。
 */
export function ThemeShelfCard({ shelf }: { shelf: ThemeShelf<BillTileData> }) {
  const { theme, count, bills } = shelf;

  return (
    <HomePanel
      title={theme.label}
      titleId={`theme-${theme.id}-title`}
      subtitle={`${count}件`}
      className="h-full"
    >
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
        {bills.map((bill) => (
          <li key={bill.id}>
            <Link
              href={routes.billDetail(bill.id)}
              className="group flex flex-col gap-1.5"
            >
              <BillThumbnail
                src={bill.thumbnail_url}
                sizes="(min-width: 1000px) 160px, (min-width: 500px) 45vw, 40vw"
                className="aspect-[4/3] w-full rounded-sm"
              />
              <span className="line-clamp-2 text-xs leading-snug text-mirai-text group-hover:text-brand-link group-hover:underline">
                {bill.bill_content?.title || bill.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={billsListHref(DEFAULT_BILLS_LIST_PARAMS, { tagId: theme.id })}
        className="-mb-3 mt-auto pt-4 pb-3 text-[13px] font-bold text-brand-link hover:text-brand-link-hover hover:underline"
      >
        「{theme.label}」の議案をすべて見る
      </Link>
    </HomePanel>
  );
}
