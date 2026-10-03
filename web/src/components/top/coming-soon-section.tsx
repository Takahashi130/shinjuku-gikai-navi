import { ExternalLink } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import type { ComingSoonBill } from "@/features/bills/shared/types";

interface ComingSoonSectionProps {
  bills: ComingSoonBill[];
}

/**
 * これから掲載される議案。0件なら何も出さない（見出しだけが残ると、
 * 何かあるように見えてしまう）。
 */
export function ComingSoonSection({ bills }: ComingSoonSectionProps) {
  if (bills.length === 0) return null;

  return (
    <section
      aria-labelledby="coming-soon-title"
      className="flex flex-col gap-3 rounded-md bg-white p-4 md:p-5"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          id="coming-soon-title"
          className="text-lg font-bold text-mirai-text md:text-xl"
        >
          これから掲載される議案
        </h2>
        <span className="text-xs text-mirai-text-muted">
          {SITE.NAME}は、順次更新されていきます
        </span>
      </div>
      <ul className="flex flex-col divide-y divide-mirai-border">
        {bills.map((bill) => (
          <li key={bill.id}>
            <ComingSoonBillItem bill={bill} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ComingSoonBillItem({ bill }: { bill: ComingSoonBill }) {
  // タイトルがあればそれを表示、なければ正式名称を表示
  const displayTitle = bill.title || bill.name;
  // 正式名称（タイトルがある場合のみ別途表示）
  const officialName = bill.title ? bill.name : null;

  const content = (
    <span className="flex flex-col gap-0.5 py-2.5">
      <span className="flex items-center gap-1 text-sm font-bold text-mirai-text">
        {displayTitle}
        {bill.shugiin_url && (
          <ExternalLink
            className="size-3.5 shrink-0 text-mirai-text-muted"
            aria-hidden
          />
        )}
      </span>
      {officialName && (
        <span className="text-xs text-mirai-text-muted">{officialName}</span>
      )}
    </span>
  );

  // shugiin_url がある場合は外部リンク
  if (bill.shugiin_url) {
    return (
      <Link
        href={bill.shugiin_url as Route}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:text-brand-link hover:underline"
      >
        {content}
        <span className="sr-only">（新しいタブで開きます）</span>
      </Link>
    );
  }

  return content;
}
