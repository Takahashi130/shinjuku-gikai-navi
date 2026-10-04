"use client";

import { useEffect, useState } from "react";
import type { CarouselApi } from "@/components/ui/carousel";

/**
 * いま表示しているスライドの高さ（px）を返す。カルーセルの高さをそれに合わせる。
 *
 * 解説のスライドは枚によって長さが大きく違う（狭い画面で 400〜1400px ほど）。
 * いちばん長いスライドに高さをそろえると、短いスライドの下が大きく空き、
 * 前後のボタンが遠くなる。文字の読み込みや画面幅の変化で高さが変わっても
 * 追いかけるよう、スライドの大きさの変化も見る。
 *
 * api が無い間（描画の直後）は null（高さを決めない）。
 */
export function useCarouselSlideHeight(api: CarouselApi): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      const node = api.slideNodes()[api.selectedScrollSnap()];
      setHeight(node ? node.offsetHeight : null);
    };
    update();
    api.on("select", update);
    api.on("reInit", update);

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    for (const node of api.slideNodes()) observer?.observe(node);

    return () => {
      api.off("select", update);
      api.off("reInit", update);
      observer?.disconnect();
    };
  }, [api]);

  return height;
}
