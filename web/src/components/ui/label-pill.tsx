import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type LabelPillTone =
  | "neutral"
  | "outline"
  | "accent"
  | "solid"
  | "dark"
  | "on-dark"
  | "for"
  | "against"
  | "split"
  | "alert";

/**
 * 色の組み合わせ。どれも文字と地で 4.5:1 以上になる組み合わせにしている。
 * アクセント（brand-accent）を地にするときの文字は brand-on-accent。
 */
const TONE_CLASS: Record<LabelPillTone, string> = {
  neutral: "bg-mirai-surface text-mirai-text-secondary",
  outline: "border border-line-soft bg-white text-mirai-text-secondary",
  accent: "bg-brand-accent-tint text-brand-link",
  solid: "bg-brand-accent text-brand-on-accent",
  dark: "bg-brand-header text-brand-on-header",
  // 濃色の帯の上に置くピル
  "on-dark": "bg-brand-header-hover text-brand-on-header",
  // 賛成・可決（緑系）／反対・否決（赤系）。会派の賛否と同じ系統の色
  for: "border border-emerald-200 bg-stance-for-bg text-stance-for-strong",
  against: "border border-rose-200 bg-stance-against-bg text-stance-against",
  // 目を引く赤の塗り（開会中・ズレなど、注意を向けたいところだけ）
  alert: "bg-stance-against text-white",
  // 「会派の賛否が分かれた」。賛成・反対のどちらにも見えない中立の色
  split: "bg-stance-neutral-badge-bg text-vote-split",
};

type LabelPillProps = ComponentProps<"span"> & {
  tone?: LabelPillTone;
  size?: "sm" | "md";
};

/**
 * 小さなラベルのピル（会期・議案番号・議決の結果・「準備中」など）。
 *
 * 押せるものには使わない。リンクにするときは Link の中に置き、Link 側で
 * 押せることが分かる見た目（下線・矢印）を付ける。
 */
export function LabelPill({
  tone = "neutral",
  size = "sm",
  className,
  ...props
}: LabelPillProps) {
  return (
    <span
      data-slot="label-pill"
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-full font-bold leading-none [&>svg]:size-3.5 [&>svg]:shrink-0",
        // 文字は 12px 以上にする（高齢の区民も読む）
        size === "sm" ? "h-6 px-2.5 text-xs" : "h-7 px-3 text-xs",
        TONE_CLASS[tone],
        className
      )}
      {...props}
    />
  );
}
