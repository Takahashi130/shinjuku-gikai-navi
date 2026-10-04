import { ParticipationBadges } from "@/features/bill-participation/client/components/participation-badges";
import { BillParticipationPanel } from "@/features/bill-participation/server/components/bill-participation-panel";
import { getBillParticipationBadges } from "@/features/bill-participation/server/loaders/get-bill-participation-badges";
import { getBillsByDietSession } from "@/features/bills/server/loaders/get-bills-by-diet-session";
import { getActiveDietSession } from "@/features/diet-sessions/server/loaders/get-active-diet-session";
import { isUuid } from "@/features/open-data/shared/utils/uuid";

interface LivePreviewProps {
  searchParams: Promise<{ billId?: string }>;
}

/**
 * 開発用：つながっている DB（.env）の実データで、区民参加の入口と一覧の印を確かめる。
 * 本番では /dev 配下は表示されない（middleware が 404 にする）。
 * 投票ボタンを押すと、その DB に匿名ユーザーと票が実際に作られる。
 */
export default async function ParticipationLivePreview({
  searchParams,
}: LivePreviewProps) {
  const { billId } = await searchParams;
  const session = await getActiveDietSession();
  const bills = session ? await getBillsByDietSession(session.id) : [];
  const badges = await getBillParticipationBadges(bills.map((b) => b.id));
  const selected = billId && isUuid(billId) ? billId : null;

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">区民参加（実データ）</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        いまの会期：{session?.name ?? "（なし）"}
        。議案を選ぶと、解説と区民投票を1か所に並べた &lt;BillParticipationPanel
        /&gt; を表示します（議案ページでは、それぞれを差し込み口に分けて置いて
        います）。投票すると DB に票が入ります（取り消しで消せます）。
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <ul className="min-w-0 space-y-2">
          {bills.map((bill) => (
            <li key={bill.id}>
              <a
                href={`/dev/features/participation/live?billId=${bill.id}`}
                className={`block rounded-lg border p-3 text-sm hover:bg-muted ${
                  bill.id === selected ? "border-primary" : ""
                }`}
              >
                <span className="font-bold">
                  {bill.bill_content?.title ?? bill.name}
                </span>
                <ParticipationBadges
                  badges={badges[bill.id]}
                  className="mt-1.5"
                />
              </a>
            </li>
          ))}
        </ul>
        <div className="min-w-0">
          {selected ? (
            <BillParticipationPanel billId={selected} />
          ) : (
            <p className="text-sm text-muted-foreground">
              左の一覧から議案を選んでください。
            </p>
          )}
        </div>
      </div>
    </>
  );
}
