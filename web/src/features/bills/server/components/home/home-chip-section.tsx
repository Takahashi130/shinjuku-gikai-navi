import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";

/** 「〜で探す」のチップ1つ分。 */
export type HomeChip = {
  key: string;
  label: string;
  href: Route;
  /** ラベルの右に添える小さな文字（件数など）。 */
  meta?: ReactNode;
};

/**
 * トップの「テーマで探す」「会期から探す」。行き先の一覧へ送る小さなチップを
 * 折り返して並べる。チップが無ければ何も出さない。
 */
export function HomeChipSection({
  id,
  title,
  chips,
}: {
  /** 見出しの id（section の aria-labelledby）。 */
  id: string;
  title: string;
  chips: HomeChip[];
}) {
  if (chips.length === 0) return null;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <SectionHeading id={id} title={title} />
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="flex min-h-11 items-center gap-2 rounded-full border border-line-soft bg-white px-4 py-1.5 text-sm font-bold text-mirai-text shadow-xs hover:border-brand-link/40 hover:text-brand-link"
            >
              {chip.label}
              {chip.meta}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
