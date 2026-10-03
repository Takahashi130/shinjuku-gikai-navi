import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      className="h-7 rounded-full border-border px-2.5 text-xs font-normal"
      onClick={() =>
        onOpenSources({
          heading,
          text: item.text,
          sources: item.sources,
          evidence: item.evidence,
        })
      }
    >
      <FileText className="size-3.5" aria-hidden="true" />
      出典と根拠
    </Button>
  );
}

/** 解説スライドの1枚（「一覧で読む」でも同じ見た目を使う） */
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
        "flex h-full flex-col gap-3 rounded-xl border bg-card p-5",
        className
      )}
    >
      <p className="text-xs font-bold text-primary">
        {index + 1} / {total}
      </p>
      <h3 className="text-lg font-bold">{slide.heading}</h3>
      {"lead" in slide && (
        <p className="-mt-2 text-xs text-muted-foreground">{slide.lead}</p>
      )}

      {slide.kind === "cover" && (
        <div className="space-y-3">
          <p className="text-xl leading-relaxed font-bold">{slide.title}</p>
          <p className="leading-relaxed">{slide.oneLiner}</p>
        </div>
      )}

      {slide.kind === "items" &&
        (slide.items.length > 0 ? (
          <ul className="space-y-3">
            {slide.items.map((item) => (
              <li key={item.text} className="space-y-2 rounded-lg bg-muted p-3">
                <p className="leading-relaxed">{item.text}</p>
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
            <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
              {slide.emptyMessage}
            </p>
          )
        ))}

      {slide.kind === "facts" && (
        <dl className="divide-y">
          {slide.facts.map((fact) => (
            <div
              key={`${fact.label}-${fact.text}`}
              className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-3"
            >
              <dt className="text-xs text-muted-foreground sm:w-28 sm:shrink-0 sm:pt-0.5">
                {fact.label}
              </dt>
              <dd className="flex-1 space-y-1.5">
                <p className="font-bold leading-relaxed">{fact.text}</p>
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
        <div className="space-y-4">
          <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
            {slide.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <div className="space-y-1.5 border-t pt-3">
            <h4 className="text-sm font-bold">この解説の出典</h4>
            <ul className="space-y-1.5 text-sm">
              {slide.sources.map((source) => (
                <li key={source.id}>
                  <a
                    href={source.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 underline"
                  >
                    {source.title}
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">（新しいタブで開きます）</span>
                  </a>
                  <span className="ml-1 text-xs text-muted-foreground">
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
