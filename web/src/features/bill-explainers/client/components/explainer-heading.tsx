import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ExplainerHeadingProps {
  icon: LucideIcon;
  /** 見出しの下の1行の説明 */
  description?: ReactNode;
  /** 右端に添える印（AI作成・照合済みなど） */
  badge?: ReactNode;
}

/**
 * 議案ページの「事前解説」の見出し（h2）。解説があるときも無いときも同じ見出しに
 * して、議案ページのほかの節（区民の意思 vs 議会の議決など）と大きさをそろえる。
 */
export function ExplainerHeading({
  icon: Icon,
  description,
  badge,
}: ExplainerHeadingProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent-tint text-brand-link">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="bill-explainer-heading"
            className="text-lg font-extrabold leading-snug text-mirai-text md:text-xl"
          >
            事前解説
          </h2>
          {description && (
            <p className="text-sm leading-relaxed text-mirai-text-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {badge}
    </div>
  );
}
