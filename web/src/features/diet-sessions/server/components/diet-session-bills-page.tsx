import "server-only";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getBillsByDietSession } from "@/features/bills/server/loaders/get-bills-by-diet-session";
import { routes } from "@/lib/routes";
import { DietSessionBillList } from "../../client/components/diet-session-bill-list";
import type { DietSession } from "../../shared/types";

/** 会期ごとの議案一覧（/kokkai/[slug]/bills）。議案一覧と同じ作りにする。 */
export async function DietSessionBillsPage({
  session,
}: {
  session: DietSession;
}) {
  const bills = await getBillsByDietSession(session.id);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-3 py-4 md:px-5">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: "トップ", href: routes.home() },
            { label: "議案をさがす", href: routes.billsList() },
            { label: session.name },
          ]}
        />
      </div>
      <DietSessionBillList session={session} bills={bills} />
    </div>
  );
}
