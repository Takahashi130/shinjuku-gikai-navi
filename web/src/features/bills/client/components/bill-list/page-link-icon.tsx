"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";

/**
 * ページ送りのリンクの矢印。移動中は回る印に差し替える。
 *
 * /bills は searchParams を読む動的なページで先読みが効かず、押してから画面が
 * 変わるまで間がある。何も変わらないと反応が無いと思って2度押しされやすい
 * ので、押したことを見せる。矢印と同じ大きさの印にして、ボタンの幅は変えない。
 *
 * useLinkStatus は Link の子孫でしか働かないので、Link の中に置くこと。
 */
export function PageLinkIcon({ direction }: { direction: "prev" | "next" }) {
  const { pending } = useLinkStatus();

  if (pending) {
    return <LoaderCircle aria-hidden className="animate-spin" />;
  }
  return direction === "prev" ? (
    <ChevronLeft aria-hidden />
  ) : (
    <ChevronRight aria-hidden />
  );
}
