"use client";

import { useEffect } from "react";

/** 利用者が自分で動かしたとみなす操作（これがあったら追いかけるのをやめる） */
const INTERACTION_EVENTS = [
  "wheel",
  "touchstart",
  "keydown",
  "pointerdown",
] as const;

/** 追いかける長さ（ミリ秒）。読み込みが遅くても、それ以上は動かさない */
const FOLLOW_MS = 10_000;

let interacted = false;
let listening = false;

function listenForInteraction() {
  if (listening) return;
  listening = true;
  for (const type of INTERACTION_EVENTS) {
    window.addEventListener(
      type,
      () => {
        interacted = true;
      },
      { once: true, passive: true }
    );
  }
}

/**
 * ページを `#id` つきで開いたとき（新しいタブ・再読み込み・共有されたリンク）、
 * 行き先が画面の上に来るよう、読み込みが終わるまで追いかける。
 *
 * 議案ページは事前解説や区民投票を Suspense の中で後から読み込むので、ブラウザ
 * が最初に行き先へ移動したあとで、その上の部分が伸びて行き先が下へずれる
 * （読み込み中の骨組みが入れ替わるので、ブラウザのスクロールの補正も効かない）。
 * ページの高さが変わるたびに行き先へ移し直す。利用者が自分でスクロール・
 * タップ・キー操作をしたら、そこでやめる。
 */
export function useKeepHashTargetInView(id: string) {
  useEffect(() => {
    if (window.location.hash !== `#${id}`) return;
    listenForInteraction();
    if (interacted) return;

    const scroll = () => {
      if (interacted) return;
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    scroll();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scroll);
    observer?.observe(document.body);
    const timer = window.setTimeout(() => observer?.disconnect(), FOLLOW_MS);
    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [id]);
}
