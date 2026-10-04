import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { LabelPill } from "@/components/ui/label-pill";
import { RoundCard } from "@/components/ui/round-card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface LegalPageLayoutProps {
  title: string;
  /** 見出しの上の英字のラベル（例: "Terms of Service"） */
  enLabel?: string;
  description?: string;
  /**
   * パンくずのうち、トップとこのページの間に入る親のページ
   * （例：開発者向けのページから入る規約なら「開発者向け」）。
   */
  parents?: BreadcrumbItem[];
  className?: string;
  children: ReactNode;
}

/**
 * 利用規約・プライバシーポリシーなどの文書のページ。
 *
 * ほかのページとそろえて、薄いグレーの地に白い角丸のカード（RoundCard）を1枚
 * 置き、その中に見出しと本文を入れる。本文は読みやすい幅（max-w-4xl）にする。
 */
export function LegalPageLayout({
  title,
  enLabel,
  description,
  parents = [],
  className,
  children,
}: LegalPageLayoutProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:py-10",
        className
      )}
    >
      <Breadcrumb
        items={[
          { label: "トップ", href: routes.home() },
          ...parents,
          { label: title },
        ]}
      />

      <RoundCard padding="lg" className="flex flex-col gap-8">
        <header className="flex flex-col gap-3 border-line-soft border-b pb-6">
          {enLabel ? (
            <LabelPill tone="accent" size="md" className="font-lexend">
              <FileText aria-hidden />
              {enLabel}
            </LabelPill>
          ) : null}
          <h1 className="break-phrase text-2xl font-extrabold leading-snug tracking-tight text-mirai-text md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-sm leading-relaxed text-mirai-text-secondary md:text-base">
              {description}
            </p>
          ) : null}
        </header>

        <div className="flex flex-col gap-8 text-mirai-text">{children}</div>
      </RoundCard>
    </div>
  );
}

interface LegalSectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function LegalSectionTitle({
  children,
  className,
}: LegalSectionTitleProps) {
  return (
    <h2
      className={cn(
        "text-lg font-extrabold tracking-[0.02em] text-mirai-text sm:text-xl",
        className
      )}
    >
      {children}
    </h2>
  );
}

interface LegalSubSectionTitleProps {
  children: ReactNode;
  className?: string;
}

export function LegalSubSectionTitle({
  children,
  className,
}: LegalSubSectionTitleProps) {
  return (
    <h3
      className={cn(
        "text-base font-bold tracking-[0.04em] text-mirai-text",
        className
      )}
    >
      {children}
    </h3>
  );
}

interface LegalParagraphProps {
  children: ReactNode;
  className?: string;
}

export function LegalParagraph({ children, className }: LegalParagraphProps) {
  return (
    <p
      className={cn(
        "text-sm leading-[1.8] tracking-[0.04em] text-mirai-text sm:text-[15px]",
        className
      )}
    >
      {children}
    </p>
  );
}

type LegalListItem = string | { id: string; content: ReactNode };

interface LegalListProps {
  items: LegalListItem[];
  ordered?: boolean;
  className?: string;
}

export function LegalList({ items, ordered, className }: LegalListProps) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag
      className={cn(
        "space-y-1 text-sm leading-[1.8] tracking-[0.04em] text-mirai-text sm:text-[15px]",
        ordered ? "list-decimal pl-5" : "list-disc pl-5",
        className
      )}
    >
      {items.map((item) => {
        const key = typeof item === "string" ? item : item.id;
        const content = typeof item === "string" ? item : item.content;

        return <li key={key}>{content}</li>;
      })}
    </ListTag>
  );
}
