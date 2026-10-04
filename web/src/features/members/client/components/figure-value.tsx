import { cn } from "@/lib/utils";
import type { FigureParts } from "../../shared/utils/faction-expenses";

const SIZES = {
  sm: { value: "text-2xl", fallback: "text-lg" },
  lg: { value: "text-3xl md:text-4xl", fallback: "text-xl md:text-2xl" },
} as const;

/**
 * 数字だけを大きく出す（「約」「万円」「回」は小さく）。数字が出せないときは
 * fallback（「—」「非公表」）を出す。
 */
export function FigureValue({
  figure,
  fallback = "—",
  size = "sm",
}: {
  figure: FigureParts | null;
  fallback?: string;
  size?: keyof typeof SIZES;
}) {
  if (!figure) {
    return (
      <span className={cn("font-bold leading-none", SIZES[size].fallback)}>
        {fallback}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-0.5">
      {figure.prefix && (
        <span className="text-xs font-bold">{figure.prefix}</span>
      )}
      <span
        className={cn(
          "font-lexend font-bold leading-none tracking-tight",
          SIZES[size].value
        )}
      >
        {figure.value}
      </span>
      <span className="text-xs font-bold">{figure.unit}</span>
    </span>
  );
}
