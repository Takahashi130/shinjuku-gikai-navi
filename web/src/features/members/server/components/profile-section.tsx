import type { ReactNode } from "react";

/**
 * 議員のページの1つの節。見出しは議案ページの節（会派ごとの賛否など）と
 * 同じ形にする。id はページ上部の数字のタイルから飛ぶ先。
 */
export function ProfileSection({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  /** 見出しのすぐ下の説明（数え方など） */
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-4 flex-col gap-3"
    >
      <h2
        id={`${id}-title`}
        className="border-mirai-border border-b pb-2 text-xl font-bold text-mirai-text"
      >
        {title}
      </h2>
      {lead && (
        <div className="text-[13px] leading-relaxed text-mirai-text-secondary">
          {lead}
        </div>
      )}
      {children}
    </section>
  );
}

/** 何も無いときの一言。 */
export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-mirai-surface px-3 py-3 text-sm text-mirai-text-secondary">
      {children}
    </p>
  );
}

/** 外部（区のページ）へのリンク。新しいタブで開く。 */
export function ExternalTextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-link underline-offset-2 hover:text-brand-link-hover hover:underline"
    >
      {children}
      <span className="sr-only">（新しいタブで開きます）</span>
    </a>
  );
}
