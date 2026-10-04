import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelPill } from "@/components/ui/label-pill";
import { cn } from "@/lib/utils";
import type { ExplainerSlide, SlideItem } from "../../shared/types";
import type { SourceSheetTarget } from "./explainer-source-sheet";

interface ExplainerSlideCardProps {
  slide: ExplainerSlide;
  index: number;
  total: number;
  onOpenSources: (target: SourceSheetTarget) => void;
  className?: string;
}

function SourceButton({
  heading,
  item,
  onOpenSources,
}: {
  heading: string;
  item: SlideItem;
  onOpenSources: (target: SourceSheetTarget) => void;
}) {
  if (item.sources.length === 0 && item.evidence.length === 0) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      // 見た目は 32px のまま、押せる範囲だけ上下に広げる（44px）
      className="relative h-8 self-start border-line-soft px-3 text-xs text-brand-link shadow-none after:absolute after:inset-x-0 after:-inset-y-1.5 hover:bg-brand-accent-tint"
      onClick={() =>
        onOpenSources({
          heading,
          text: item.text,
          sources: item.sources,
          evidence: item.evidence,
        })
      }
    >
      <FileText className="size-3.5" aria-hidden />
      出典と根拠
    </Button>
  );
}

/**
 * 解説スライドの1枚（「一覧で読む」でも同じ見た目を使う）。
 * 議案ページの白いカードの中に置くので、1段沈んだ面（mirai-surface）にし、
 * 項目は白い小さな面に載せる。
 */
export function ExplainerSlideCard({
  slide,
  index,
  total,
  onOpenSources,
  className,
}: ExplainerSlideCardProps) {
  return (
    <article
      aria-label={`${index + 1}枚目（全${total}枚）：${slide.heading}`}
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-mirai-surface p-4 sm:p-5",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <LabelPill tone="dark" className="font-lexend">
          {index + 1} / {total}
        </LabelPill>
        <h3 className="text-lg font-extrabold leading-snug text-mirai-text">
          {slide.heading}
        </h3>
        {"lead" in slide && (
          <p className="text-xs leading-relaxed text-mirai-text-muted">
            {slide.lead}
          </p>
        )}
      </div>

      {slide.kind === "cover" && (
        <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
          <p className="text-xl font-extrabold leading-snug text-mirai-text md:text-2xl">
            {slide.title}
          </p>
          <p className="leading-relaxed text-mirai-text-secondary">
            {slide.oneLiner}
          </p>
        </div>
      )}

      {slide.kind === "items" &&
        (slide.items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {slide.items.map((item) => (
              <li
                key={item.text}
                className="flex flex-col gap-2 rounded-xl bg-white p-3.5"
              >
                <p className="leading-relaxed text-mirai-text">{item.text}</p>
                <SourceButton
                  heading={slide.heading}
                  item={item}
                  onOpenSources={onOpenSources}
                />
              </li>
            ))}
          </ul>
        ) : (
          slide.emptyMessage && (
            <p className="rounded-xl bg-white p-3.5 text-sm leading-relaxed text-mirai-text-secondary">
              {slide.emptyMessage}
            </p>
          )
        ))}

      {slide.kind === "facts" && (
        <dl className="flex flex-col divide-y divide-line-soft rounded-xl bg-white px-3.5">
          {slide.facts.map((fact) => (
            <div
              key={`${fact.label}-${fact.text}`}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-3"
            >
              <dt className="text-xs font-bold text-mirai-text-muted sm:w-28 sm:shrink-0 sm:pt-0.5">
                {fact.label}
              </dt>
              <dd className="flex flex-1 flex-col gap-1.5">
                <p className="font-bold leading-relaxed text-mirai-text">
                  {fact.text}
                </p>
                <SourceButton
                  heading={`${slide.heading}（${fact.label}）`}
                  item={fact}
                  onOpenSources={onOpenSources}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {slide.kind === "notes" && (
        <div className="flex flex-col gap-3">
          <ul className="flex list-disc flex-col gap-1.5 rounded-xl bg-white py-3 pr-3.5 pl-8 leading-relaxed text-mirai-text">
            {slide.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="flex flex-col gap-1.5">
            <h4 className="text-sm font-bold text-mirai-text">
              この解説の出典
            </h4>
            <ul className="flex flex-col gap-1.5 text-sm">
              {slide.sources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-link underline hover:text-brand-link-hover"
                  >
                    {source.title}
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    <span className="sr-only">（新しいタブで開きます）</span>
                  </a>
                  <span className="ml-1 text-xs text-mirai-text-muted">
                    {source.kindLabel}
                    {source.pagesLabel && `・${source.pagesLabel}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}
