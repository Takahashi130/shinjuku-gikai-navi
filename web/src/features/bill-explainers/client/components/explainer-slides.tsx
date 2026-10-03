"use client";

import {
  BadgeCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontal,
  List,
  PencilLine,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { ExplainerFooterInfo, ExplainerSlide } from "../../shared/types";
import { markExplainerRead } from "../utils/explainer-read-flag";
import { ExplainerSlideCard } from "./explainer-slide-card";
import {
  ExplainerSourceSheet,
  type SourceSheetTarget,
} from "./explainer-source-sheet";

interface ExplainerSlidesProps {
  billId: string;
  slides: ExplainerSlide[];
  footer: ExplainerFooterInfo;
  className?: string;
}

type ViewMode = "slides" | "list";

/**
 * 議案の解説。7枚のスライド（スワイプ・前後のボタン・矢印キー）と、
 * 全部を縦に並べる「一覧で読む」を切り替えられる。各項目から出典のパネルを開ける。
 */
export function ExplainerSlides({
  billId,
  slides,
  footer,
  className,
}: ExplainerSlidesProps) {
  const [mode, setMode] = useState<ViewMode>("slides");
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [sheetTarget, setSheetTarget] = useState<SourceSheetTarget | null>(
    null
  );
  const total = slides.length;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const selected = api.selectedScrollSnap();
      setIndex(selected);
      if (selected > 0) markExplainerRead(billId);
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, billId]);

  const changeMode = (next: ViewMode) => {
    setMode(next);
    if (next === "list") markExplainerRead(billId);
  };

  return (
    <section
      aria-labelledby="bill-explainer-heading"
      className={cn("min-w-0 space-y-4", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="bill-explainer-heading"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <BookOpen className="size-5 text-primary" aria-hidden="true" />
          この議案の解説
        </h2>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold",
            footer.isDraft
              ? "border-muted-foreground text-muted-foreground"
              : "border-primary text-primary"
          )}
        >
          {footer.isDraft ? (
            <PencilLine className="size-3.5" aria-hidden="true" />
          ) : (
            <BadgeCheck className="size-3.5" aria-hidden="true" />
          )}
          {footer.badge}
        </span>
      </header>

      <fieldset className="inline-flex rounded-full border bg-card p-1">
        <legend className="sr-only">解説の表示のしかた</legend>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === "slides"}
          onClick={() => changeMode("slides")}
          className={cn(
            "rounded-full",
            mode === "slides" &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          <GalleryHorizontal aria-hidden="true" />
          スライドで読む
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={mode === "list"}
          onClick={() => changeMode("list")}
          className={cn(
            "rounded-full",
            mode === "list" &&
              "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          )}
        >
          <List aria-hidden="true" />
          一覧で読む
        </Button>
      </fieldset>

      {mode === "slides" ? (
        <div className="space-y-3">
          <Carousel
            setApi={setApi}
            opts={{ align: "start" }}
            className="w-full min-w-0"
            aria-label="議案の解説のスライド"
          >
            <CarouselContent>
              {slides.map((slide, i) => (
                <CarouselItem key={slide.id} className="min-h-[22rem]">
                  <ExplainerSlideCard
                    slide={slide}
                    index={i}
                    total={total}
                    onOpenSources={setSheetTarget}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => api?.scrollPrev()}
              disabled={index === 0}
              aria-label="前のスライド"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {slides.map((slide, i) => (
                  <span
                    key={slide.id}
                    className={cn(
                      "size-2 rounded-full transition-colors",
                      i === index ? "bg-primary" : "bg-muted-foreground/40"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {index + 1} / {total}：{slides[index]?.heading}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={() => api?.scrollNext()}
              disabled={index >= total - 1}
              aria-label="次のスライド"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, i) => (
            <ExplainerSlideCard
              key={slide.id}
              slide={slide}
              index={i}
              total={total}
              onOpenSources={setSheetTarget}
            />
          ))}
        </div>
      )}

      <footer className="space-y-1 rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        <p>
          {footer.attributionText}
          {!footer.isDraft && (
            <>
              {footer.correction.before}
              <a
                href={footer.correction.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {footer.correction.linkText}
              </a>
              {footer.correction.after}
            </>
          )}
        </p>
        <p>
          {footer.versionLabel}
          {footer.sourceFileUrl && (
            <>
              {"・"}
              <a
                href={footer.sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                解説の元ファイル（GitHub）
              </a>
            </>
          )}
        </p>
      </footer>

      <ExplainerSourceSheet
        target={sheetTarget}
        onClose={() => setSheetTarget(null)}
      />
    </section>
  );
}
