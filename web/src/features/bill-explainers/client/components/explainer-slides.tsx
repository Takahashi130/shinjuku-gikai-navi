"use client";

import {
  BadgeCheck,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
import { LabelPill } from "@/components/ui/label-pill";
import { cn } from "@/lib/utils";
import type { ExplainerFooterInfo, ExplainerSlide } from "../../shared/types";
import { useCarouselSlideHeight } from "../hooks/use-carousel-slide-height";
import { markExplainerRead } from "../utils/explainer-read-flag";
import { ExplainerHeading } from "./explainer-heading";
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

const MODES: {
  mode: ViewMode;
  label: string;
  /** 狭い画面（2つを1行に並べると入らない幅）で出す短い名前 */
  shortLabel: string;
  icon: typeof List;
}[] = [
  {
    mode: "slides",
    label: "スライドで読む",
    shortLabel: "スライド",
    icon: GalleryHorizontal,
  },
  { mode: "list", label: "一覧で読む", shortLabel: "一覧", icon: List },
];

/**
 * 議案の「事前解説」。7枚のスライド（スワイプ・前後のボタン・矢印キー）と、
 * 全部を縦に並べる「一覧で読む」を切り替えられる。各項目から出典のパネルを開ける。
 *
 * 見出しのすぐ下に、AI が作成し別の AI が資料と照合したこと（下書きなら照合前で
 * あること）を出す。誤りの知らせ方・版・元のファイルは末尾にまとめる。
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
  const slideHeight = useCarouselSlideHeight(api);

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
      className={cn("flex min-w-0 flex-col gap-4", className)}
    >
      <ExplainerHeading
        icon={BookOpenCheck}
        description="議案のねらい・背景・よいところ・気になるところを、区の公開資料から7枚にまとめました。"
        badge={
          <LabelPill tone={footer.isDraft ? "neutral" : "accent"} size="md">
            {footer.isDraft ? (
              <PencilLine aria-hidden />
            ) : (
              <BadgeCheck aria-hidden />
            )}
            {footer.badge}
          </LabelPill>
        }
      />

      {/* 作成と照合の表示。解説を読む前に分かるよう、見出しのすぐ下に置く */}
      <p
        className={cn(
          "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm leading-relaxed",
          footer.isDraft
            ? "bg-mirai-surface text-mirai-text-secondary"
            : "bg-brand-accent-tint text-mirai-text"
        )}
      >
        {footer.isDraft ? (
          <PencilLine
            className="mt-1 size-4 shrink-0 text-mirai-text-muted"
            aria-hidden
          />
        ) : (
          <BadgeCheck
            className="mt-1 size-4 shrink-0 text-brand-link"
            aria-hidden
          />
        )}
        {footer.attributionText}
      </p>

      {/*
        狭い画面では2つを同じ幅で1行に並べる（カプセルの中で折り返すと崩れる）。
        見た目の高さは 36px のまま、押せる範囲だけ上下に広げる（44px）
      */}
      <fieldset className="grid w-full grid-cols-2 gap-1 rounded-full border border-line-soft bg-mirai-surface p-1 sm:flex sm:w-fit">
        <legend className="sr-only">解説の表示のしかた</legend>
        {MODES.map(({ mode: value, label, shortLabel, icon: Icon }) => {
          const active = mode === value;
          return (
            <Button
              key={value}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={active}
              onClick={() => changeMode(value)}
              className={cn(
                "relative h-9 rounded-full px-3.5 after:absolute after:inset-x-0 after:-inset-y-1",
                active
                  ? "bg-brand-header text-brand-on-header hover:bg-brand-header hover:text-brand-on-header"
                  : "text-mirai-text-secondary hover:bg-white hover:text-brand-link"
              )}
            >
              <Icon aria-hidden />
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </Button>
          );
        })}
      </fieldset>

      {mode === "slides" ? (
        <div className="flex flex-col gap-3">
          <Carousel
            setApi={setApi}
            opts={{ align: "start" }}
            className="w-full min-w-0"
            aria-label="事前解説のスライド"
          >
            {/*
              高さはいま表示しているスライドに合わせる（いちばん長いスライドに
              そろえると、短いスライドの下が大きく空き、前後のボタンが遠くなる）
            */}
            <CarouselContent
              className="items-start transition-[height] duration-300 motion-reduce:transition-none"
              style={slideHeight ? { height: slideHeight } : undefined}
            >
              {slides.map((slide, i) => (
                <CarouselItem
                  key={slide.id}
                  // 見えていないスライドの「出典と根拠」に、Tab や読み上げで入らない
                  inert={i !== index}
                  className={cn(
                    // 高さが決まるまで（描画の直後・JS の読み込み前）は、2枚目
                    // 以降を畳んで1枚目の高さにする。いちばん長いスライドの高さで
                    // 描いてから縮むと、下の「区民の意思 vs 議会の議決」と投票の帯が
                    // 数百 px 跳ね上がる
                    slideHeight === null && i > 0 && "max-h-0 overflow-hidden"
                  )}
                >
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
              className="size-11 shadow-none"
              onClick={() => api?.scrollPrev()}
              disabled={index === 0}
              aria-label="前のスライド"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </Button>
            <div className="flex min-w-0 flex-col items-center gap-1.5">
              <div className="flex items-center gap-1.5" aria-hidden>
                {slides.map((slide, i) => (
                  <span
                    key={slide.id}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i === index
                        ? "w-5 bg-brand-header"
                        : "w-2 bg-mirai-border"
                    )}
                  />
                ))}
              </div>
              {/*
                スライドを送るたびに p を key で作り直す。ふりがな表示
                （Rubyful）が ON だと p・span の中身が差し替えられ、作り直さない
                と番号と見出しが「1 / 7」のまま変わらない。読み上げの領域
                （aria-live）は作り直さない外側の div に置く
              */}
              <div aria-live="polite">
                <p
                  key={index}
                  className="text-center text-xs font-bold text-mirai-text-secondary"
                >
                  <span className="font-lexend">{`${index + 1} / ${total}`}</span>
                  {`：${slides[index]?.heading ?? ""}`}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 shadow-none"
              onClick={() => api?.scrollNext()}
              disabled={index >= total - 1}
              aria-label="次のスライド"
            >
              <ChevronRight className="size-5" aria-hidden />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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

      <footer className="flex flex-col gap-1 border-line-soft border-t pt-3 text-xs leading-relaxed text-mirai-text-muted">
        {!footer.isDraft && (
          <p>
            {footer.correction.before}
            <a
              href={footer.correction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-bold text-brand-link underline hover:text-brand-link-hover"
            >
              {footer.correction.linkText}
              <ExternalLink className="size-3" aria-hidden />
              <span className="sr-only">（新しいタブで開きます）</span>
            </a>
            {footer.correction.after}
          </p>
        )}
        <p>
          {footer.versionLabel}
          {footer.sourceFileUrl && (
            <>
              {"・"}
              <a
                href={footer.sourceFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-brand-link underline hover:text-brand-link-hover"
              >
                解説の元ファイル（GitHub）
                <ExternalLink className="size-3" aria-hidden />
                <span className="sr-only">（新しいタブで開きます）</span>
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
