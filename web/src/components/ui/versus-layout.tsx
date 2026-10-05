import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface VersusLayoutProps {
  /** 左（狭い画面では上）。区民の意思の側。 */
  left: ReactNode;
  /** 右（狭い画面では下）。議会の議決の側。 */
  right: ReactNode;
  /** 真ん中の丸い印の文字。 */
  label?: string;
  /**
   * 広い画面で、左右の面の高さをそろえるか。片方だけが長くなる場所（議案
   * ページの会派の一覧など）では false にし、短い方を伸ばして空の箱にしない。
   */
  stretch?: boolean;
  className?: string;
}

/**
 * 2つの面を左右に並べ、間に「VS」の丸い印を置く。区民の意思と議会の議決を
 * 見比べるところ（トップの比較カード、議案ページの賛否）で使う。
 * 狭い画面（md 未満）では上下に積むので、説明文では「左」「右」と書かない。
 *
 * 印は飾りなので読み上げない。左右の面の見出しで何と何の比較かが分かるように
 * すること。
 */
export function VersusLayout({
  left,
  right,
  label = "VS",
  stretch = true,
  className,
}: VersusLayoutProps) {
  return (
    <div
      className={cn(
        "grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
        stretch ? "items-stretch" : "items-start",
        className
      )}
    >
      <div className="min-w-0">{left}</div>
      <div
        className="flex items-center justify-center self-stretch"
        aria-hidden
      >
        <span className="flex h-9 items-center justify-center rounded-full border-4 border-white bg-gradient-to-r from-orange-500 to-rose-600 px-4 font-lexend text-xs font-bold text-white shadow-md">
          {label}
        </span>
      </div>
      <div className="min-w-0">{right}</div>
    </div>
  );
}
