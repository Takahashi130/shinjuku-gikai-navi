import type { Route } from "next";
import Link from "next/link";
import type { DietSession } from "@/features/diet-sessions/shared/types";
import { routes } from "@/lib/routes";
import { formatDateWithDots } from "@/lib/utils/date";
import { HomePanel } from "./home-panel";

/** カードに並べる会期の数。テーマのカードと高さが揃う程度に抑える。 */
const VISIBLE_SESSIONS = 6;

/** 会期から探すカード。新しい会期から順に、会期ごとの議案一覧へ送る。 */
export function SessionsCard({
  sessions,
  currentSessionId,
}: {
  sessions: DietSession[];
  /** 開会中の会期。印を付ける。 */
  currentSessionId: string | null;
}) {
  const visible = sessions
    .filter(
      (session): session is DietSession & { slug: string } =>
        session.slug !== null
    )
    .slice(0, VISIBLE_SESSIONS);
  if (visible.length === 0) return null;

  return (
    <HomePanel title="会期から探す" titleId="sessions-title" className="h-full">
      <ul className="flex flex-col divide-y divide-mirai-border">
        {visible.map((session) => (
          <li key={session.id}>
            <Link
              href={routes.kokkaiSessionBills(session.slug) as Route}
              className="group flex flex-col gap-0.5 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-mirai-text group-hover:text-brand-link group-hover:underline">
                {session.name}
                {session.id === currentSessionId && (
                  <span className="rounded-full bg-brand-accent px-2 py-px text-[11px] font-bold text-brand-on-accent no-underline">
                    開会中
                  </span>
                )}
              </span>
              <span className="text-xs text-mirai-text-muted">
                {formatDateWithDots(session.start_date)} 〜{" "}
                {formatDateWithDots(session.end_date)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HomePanel>
  );
}
