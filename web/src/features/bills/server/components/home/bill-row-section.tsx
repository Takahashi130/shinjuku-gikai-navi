import type { Route } from "next";
import type { ReactNode } from "react";
import {
  BillTile,
  type BillTileData,
} from "../../../client/components/bill-list/bill-tile";
import { HorizontalScroller } from "../../../client/components/horizontal-scroller";
import { HomePanel } from "./home-panel";

/**
 * 横スクロールする議案の列（Amazon のトップの商品の列）。
 * 0件なら見出しごと出さない。見出しだけ残ると、何かあるように見えてしまう。
 */
export function BillRowSection({
  id,
  title,
  subtitle,
  moreHref,
  bills,
}: {
  id: string;
  title: string;
  subtitle?: ReactNode;
  moreHref?: Route;
  bills: BillTileData[];
}) {
  if (bills.length === 0) return null;

  return (
    <HomePanel
      title={title}
      titleId={`${id}-title`}
      subtitle={subtitle}
      more={moreHref ? { href: moreHref, label: "もっと見る" } : undefined}
    >
      <HorizontalScroller label={title}>
        <ul className="flex gap-4 pb-1">
          {bills.map((bill) => (
            <li key={bill.id} className="w-40 shrink-0 md:w-48">
              <BillTile bill={bill} />
            </li>
          ))}
        </ul>
      </HorizontalScroller>
    </HomePanel>
  );
}
