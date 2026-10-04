import { ChevronDown, ExternalLink, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { RoundCard } from "@/components/ui/round-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

/**
 * 議員のページの1つの節。白い角丸のカードに、アイコンつきの見出しと説明を
 * 置く。id はページ上部の数字のタイルから飛ぶ先。
 */
export function ProfileSection({
  id,
  title,
  icon,
  description,
  children,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  /** 見出しのすぐ下の1〜2行（数え方など）。段落を分けたいときは children に書く */
  description?: string;
  children: ReactNode;
}) {
  return (
    <RoundCard asChild className="flex scroll-mt-4 flex-col gap-5">
      <section id={id} aria-labelledby={`${id}-title`}>
        <SectionHeading
          id={`${id}-title`}
          title={title}
          icon={icon}
          description={description}
        />
        {children}
      </section>
    </RoundCard>
  );
}

/** 何も無いときの一言。 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl bg-mirai-surface px-4 py-3 text-sm leading-relaxed text-mirai-text-secondary">
      {children}
    </p>
  );
}

/** 数え方・範囲などの補足（小さめの文字）。 */
export function SectionNote({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs leading-relaxed text-mirai-text-muted">{children}</p>
  );
}

/**
 * 折りたたみ（「残りのN件を見る」など）。summary を押すと開く。
 * ボタンではなく details / summary を使い、JavaScript が無くても開ける。
 */
export function MoreDetails({
  summary,
  children,
}: {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-line-soft">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-sm font-bold text-brand-link hover:underline [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-line-soft border-t px-4 py-3">{children}</div>
    </details>
  );
}

/** 外部（区のページ）へのリンク。新しいタブで開く。 */
export function ExternalTextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-brand-link underline-offset-2 hover:text-brand-link-hover hover:underline",
        className
      )}
    >
      {children}
      <ExternalLink className="size-3 shrink-0" aria-hidden />
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
