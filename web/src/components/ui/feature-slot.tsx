import type { ReactNode } from "react";

interface FeatureSlotProps {
  /** 差し込む本物の機能。まだ無いときは渡さない。 */
  children?: ReactNode;
  /** 差し込むものが無いときに出すもの（ふつうは ComingSoonCard）。 */
  fallback: ReactNode;
}

/**
 * あとから組み込む機能の差し込み口。
 *
 * いまは fallback（準備中の説明）を出し、機能ができたら children に渡すだけで
 * 差し替わる。位置と前後の余白は呼び出し側が決めるので、差し込む部品は
 * 自分の中身だけを描けばよい。
 *
 * ```tsx
 * <FeatureSlot fallback={<ComingSoonCard … />}>
 *   {citizenVote}
 * </FeatureSlot>
 * ```
 *
 * children が null / undefined / false のときだけ fallback を出す。差し込んだ
 * 部品が実行時に何も描かない（データが無いなど）ときの扱いは、その部品の側で
 * 決めること。
 */
export function FeatureSlot({ children, fallback }: FeatureSlotProps) {
  const isEmpty =
    children === null || children === undefined || children === false;
  return <>{isEmpty ? fallback : children}</>;
}
