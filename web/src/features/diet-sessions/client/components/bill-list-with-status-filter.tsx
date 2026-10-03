"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BillSearchCard } from "@/features/bills/client/components/bill-list/bill-search-card";
import type { BillWithContent } from "@/features/bills/shared/types";
import { cn } from "@/lib/utils";

type FilterType = "all" | "enacted" | "rejected" | "other";

type Props = {
  bills: BillWithContent[];
};

function getFilterCounts(bills: BillWithContent[]) {
  const enacted = bills.filter((b) => b.status === "enacted").length;
  const rejected = bills.filter((b) => b.status === "rejected").length;
  const other = bills.length - enacted - rejected;

  return { all: bills.length, enacted, rejected, other };
}

function filterBills(
  bills: BillWithContent[],
  filter: FilterType
): BillWithContent[] {
  switch (filter) {
    case "enacted":
      return bills.filter((b) => b.status === "enacted");
    case "rejected":
      return bills.filter((b) => b.status === "rejected");
    case "other":
      return bills.filter(
        (b) => b.status !== "enacted" && b.status !== "rejected"
      );
    default:
      return bills;
  }
}

export function BillListWithStatusFilter({ bills }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const counts = getFilterCounts(bills);
  const filteredBills = filterBills(bills, activeFilter);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "すべて", count: counts.all },
    { key: "enacted", label: "可決", count: counts.enacted },
    { key: "rejected", label: "否決", count: counts.rejected },
    { key: "other", label: "審議中など", count: counts.other },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* フィルターボタン */}
      <div
        role="group"
        aria-label="ステータスで絞り込む"
        className="flex flex-wrap gap-1.5 rounded-md bg-white p-3"
      >
        {filters.map((filter) => {
          const active = activeFilter === filter.key;
          return (
            <Button
              key={filter.key}
              variant="ghost"
              aria-pressed={active}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                "h-8 gap-1.5 rounded-full border px-3 text-[13px] font-bold shadow-none",
                active
                  ? "border-brand-link bg-brand-accent-tint text-brand-link hover:bg-brand-accent-tint hover:text-brand-link"
                  : "border-mirai-border bg-white text-mirai-text hover:bg-mirai-surface"
              )}
            >
              {filter.label}
              <span className="font-lexend text-xs text-mirai-text-muted">
                {filter.count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* 議案リスト。見出し（h1）と各議案（h3）の間を埋める */}
      <h2 className="sr-only">議案の一覧</h2>
      {filteredBills.length === 0 ? (
        <p className="rounded-md bg-white py-12 text-center text-mirai-text-muted">
          該当する議案がありません
        </p>
      ) : (
        <ul className="divide-y divide-mirai-border rounded-md bg-white px-4">
          {filteredBills.map((bill) => (
            <li key={bill.id}>
              <BillSearchCard bill={bill} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
