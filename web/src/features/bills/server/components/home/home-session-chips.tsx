import type { Route } from "next";
import { LabelPill } from "@/components/ui/label-pill";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import { routes } from "@/lib/routes";
import { HomeChipSection } from "./home-chip-section";

/**
 * 「会期から探す」。直近の会期ごとの議案一覧（/kokkai/[slug]/bills）へ送る
 * チップを、新しい会期から並べる。開会中の会期には印を付ける。
 *
 * 過去の会期の一覧へは、ここが入口になる（お知らせ帯は、開会中か直近に
 * 閉会した会期にしか送らない）。
 */
export function HomeSessionChips({
  sessions,
  currentSessionId,
}: {
  sessions: DietSession[];
  currentSessionId: string | null;
}) {
  const chips = sessions.flatMap((session) =>
    session.slug
      ? [
          {
            key: session.id,
            label: session.name,
            href: routes.kokkaiSessionBills(session.slug) as Route,
            meta:
              session.id === currentSessionId ? (
                <LabelPill tone="solid">開会中</LabelPill>
              ) : undefined,
          },
        ]
      : []
  );

  return (
    <HomeChipSection id="sessions-title" title="会期から探す" chips={chips} />
  );
}
