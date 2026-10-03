"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RoundCard } from "@/components/ui/round-card";
import { BillCard } from "@/features/bills/client/components/bill-list/bill-card";
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
    <div className="flex flex-col gap-4">
      {/* 絞り込み。選択中は塗りの角丸ピル */}
      <div
        role="group"
        aria-label="ステータスで絞り込む"
        className="flex flex-wrap gap-2"
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
                "h-10 gap-1.5 rounded-full border px-4 text-sm font-bold shadow-none",
                active
                  ? "border-brand-header bg-brand-header text-brand-on-header hover:bg-brand-header hover:text-brand-on-header"
                  : "border-line-soft bg-white text-mirai-text hover:bg-white hover:text-brand-link"
              )}
            >
              {filter.label}
              <span
                className={cn(
                  "font-lexend text-xs",
                  active
                    ? "text-brand-on-header-muted"
                    : "text-mirai-text-muted"
                )}
              >
                {filter.count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* 議案リスト。見出し（h1）と各議案（h3）の間を埋める */}
      <h2 className="sr-only">議案の一覧</h2>
      {filteredBills.length === 0 ? (
        <RoundCard className="py-12 text-center text-mirai-text-muted">
          該当する議案がありません
        </RoundCard>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {filteredBills.map((bill) => (
            <li key={bill.id}>
              <BillCard bill={bill} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
