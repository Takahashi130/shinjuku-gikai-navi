"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
  resolveScrollAffordance,
  resolveScrollStep,
} from "../utils/scroll-affordance";

/**
 * 横スクロールの列（トップの「審議中の議案」などの列）。
 *
 * 矢印はスクロールできる向きにだけ出す。常に出すと、端まで見えているのに
 * まだ続きがあるように見える。スクロール操作と矢印のどちらでも動かせる。
 *
 * 矢印を出すのは広い画面だけ。狭い画面は指で送るので、矢印がタイルを覆うだけになる。
 * 列は白いパネルの上に置くので、端のぼかしは白に向かわせる。
 */
export function HorizontalScroller({
  label,
  children,
}: {
  /** 矢印の読み上げに使う、列の名前（例：「審議中の議案」）。 */
  label: string;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sync = useCallback(() => {
    const el = viewport.current;
    if (!el) return;

    const affordance = resolveScrollAffordance(el);
    setCanScrollLeft(affordance.canScrollLeft);
    setCanScrollRight(affordance.canScrollRight);
  }, []);

  useEffect(() => {
    const el = viewport.current;
    const inner = content.current;
    if (!el || !inner) return;

    sync();

    // 画面幅とタブの並び幅の両方で判定が変わる。フォントの読み込みや
    // タブの件数の変化で中身の幅だけが動くこともあるので、両方を見る。
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [sync]);

  const scrollTo = (direction: 1 | -1) => {
    const el = viewport.current;
    if (!el) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    el.scrollBy({
      left: resolveScrollStep(el.clientWidth, direction),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <div className="relative">
      {/*
        スクロールする箱は中身を上下にも切り取るので、タイルのフォーカスの枠
        （外側に4px）が欠けないよう、箱の内側に余白を取り、負のマージンで打ち消す。
      */}
      <div
        ref={viewport}
        onScroll={sync}
        className="scrollbar-hide -m-1 overflow-x-auto p-1"
      >
        <div ref={content} className="w-max">
          {children}
        </div>
      </div>

      {/*
        送れない向きでも要素は残して disabled にする。押し切った瞬間にボタンが
        DOM から消えると、キーボード操作のフォーカスが body に落ちて位置を失う。
      */}
      <ScrollEdge
        side="left"
        label={label}
        disabled={!canScrollLeft}
        onClick={() => scrollTo(-1)}
      />
      <ScrollEdge
        side="right"
        label={label}
        disabled={!canScrollRight}
        onClick={() => scrollTo(1)}
      />
    </div>
  );
}

/**
 * 端に重ねる矢印。背景と同じ色へ向かうグラデーションを敷いて、タイルが
 * 矢印の下で切れて見えるようにする。
 */
function ScrollEdge({
  side,
  label,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const isLeft = side === "left";

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 hidden w-20 items-center md:flex ${
        isLeft
          ? "left-0 justify-start bg-gradient-to-l from-transparent to-white"
          : "right-0 justify-end bg-gradient-to-r from-transparent to-white"
      } ${disabled ? "opacity-0" : ""}`}
    >
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={isLeft ? `${label}を左に送る` : `${label}を右に送る`}
        className="pointer-events-auto size-11 shadow-md"
      >
        {isLeft ? (
          <ChevronLeft className="size-5 text-mirai-text" strokeWidth={2.5} />
        ) : (
          <ChevronRight className="size-5 text-mirai-text" strokeWidth={2.5} />
        )}
      </Button>
    </div>
  );
}
