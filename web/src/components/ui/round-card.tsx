import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type RoundCardTone = "white" | "muted" | "dark";
export type RoundCardPadding = "none" | "sm" | "md" | "lg";

const TONE_CLASS: Record<RoundCardTone, string> = {
  // 地（ごく薄いグレー）の上に置く白いカード。淡い枠と小さな影で浮かせる
  white: "border border-line-soft bg-white text-mirai-text shadow-xs",
  // 白いカードの中に置く、ひとつ沈んだ面
  muted: "bg-mirai-surface text-mirai-text",
  // 濃色（チャコール）の面。強調したい数字や帯に使う
  dark: "bg-brand-header text-brand-on-header",
};

const PADDING_CLASS: Record<RoundCardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

type RoundCardProps = ComponentProps<"div"> & {
  tone?: RoundCardTone;
  padding?: RoundCardPadding;
  /**
   * 角の丸み。lg はページに直接置くカード（rounded-3xl）、md はカードの中に
   * 入れ子にする面（rounded-2xl）。入れ子の角を外より小さくすると線が揃って見える。
   */
  radius?: "lg" | "md";
  /** section・article・Link などに見た目だけを移す。 */
  asChild?: boolean;
};

/**
 * 角の大きな丸いカード。サイト全体の「白いカード」の見た目をここに集める。
 *
 * 投票・解説・議員のページなど、あとから組み込む画面でも同じカードを使い、
 * 見た目をそろえる。
 */
export function RoundCard({
  tone = "white",
  padding = "md",
  radius = "lg",
  asChild = false,
  className,
  ...props
}: RoundCardProps) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      data-slot="round-card"
      // 濃色の面の上では、フォーカスの枠をアクセント色にする（globals.css）
      data-surface={tone === "dark" ? "dark" : undefined}
      className={cn(
        radius === "lg" ? "rounded-3xl" : "rounded-2xl",
        TONE_CLASS[tone],
        PADDING_CLASS[padding],
        className
      )}
      {...props}
    />
  );
}
