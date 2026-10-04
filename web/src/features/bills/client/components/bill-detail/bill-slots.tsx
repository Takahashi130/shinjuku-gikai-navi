import { BookOpenCheck, MessagesSquare, Users, Vote } from "lucide-react";
import type { ReactNode } from "react";
import { ComingSoonCard } from "@/components/ui/coming-soon-card";
import { FeatureSlot } from "@/components/ui/feature-slot";

/**
 * 議案ページの「あとから組み込む機能」の差し込み口。
 *
 * children を渡せばそれを、渡さなければ準備中の説明を出す。いまは事前解説・
 * 区民投票の結果・投票の帯に本物の機能を渡している（bill-detail-layout.tsx・
 * bill-vote-sections.tsx）。区民のコメントだけがまだ準備中。
 *
 * ```tsx
 * <BillExplainerSlot><BillExplainerSection billId={bill.id} /></BillExplainerSlot>
 * <CitizenVoteSlot><CitizenVoteResultPanel /></CitizenVoteSlot>
 * <CastVoteSlot><CastVoteBand /></CastVoteSlot>
 * ```
 *
 * 差し込む部品は自分の中身だけを描けばよい（位置・前後の余白はページ側が
 * 持つ）。見た目は RoundCard・LabelPill・StatCard・ComingSoonCard などの
 * 共通の部品（components/ui）を使うとそろう。
 *
 * 見出しの階層：議案ページは h1（議案名）の下に節を並べている。
 * BillExplainerSlot・CastVoteSlot・BillCommentsSlot に差し込む部品は、それぞれ
 * 独立した節なので見出しを h2 から始める。CitizenVoteSlot は「区民の意思 vs
 * 議会の議決」（h2）の中の面なので h3 にする（隣の議会の議決の面も h3）。
 */
type SlotProps = { children?: ReactNode };

/** 事前解説（要点の箇条書き）。議案の概要のすぐ下。 */
export function BillExplainerSlot({ children }: SlotProps) {
  return (
    <FeatureSlot
      fallback={
        <ComingSoonCard
          icon={BookOpenCheck}
          radius="md"
          headingLevel="h2"
          title="事前解説"
          description="投票の前に読めるよう、議案の要点をまとめた解説を載せる予定です。"
          points={[
            "議案のねらいと中身を短くまとめる",
            "よいところ・気になるところを並べる",
          ]}
        />
      }
    >
      {children}
    </FeatureSlot>
  );
}

/** 区民投票の結果。議会の議決と並べる面（広い画面では左、狭い画面では上）。 */
export function CitizenVoteSlot({ children }: SlotProps) {
  return (
    <FeatureSlot fallback={<CitizenVotePlaceholder />}>{children}</FeatureSlot>
  );
}

/** 「あなたの意思を投じる」の濃色の帯。 */
export function CastVoteSlot({ children }: SlotProps) {
  return (
    <FeatureSlot
      fallback={
        <ComingSoonCard
          icon={Vote}
          tone="dark"
          radius="md"
          headingLevel="h2"
          title="あなたの意思を投じる"
          description="区民投票が始まると、この議案に賛成・反対の意思を示せるようになります。"
        />
      }
    >
      {children}
    </FeatureSlot>
  );
}

/** 区民のコメント欄。 */
export function BillCommentsSlot({ children }: SlotProps) {
  return (
    <FeatureSlot
      fallback={
        <ComingSoonCard
          icon={MessagesSquare}
          radius="md"
          headingLevel="h2"
          title="区民のコメント"
          description="議案への意見や、ほかの案を書き込めるようにする予定です。"
        />
      }
    >
      {children}
    </FeatureSlot>
  );
}

/**
 * 区民投票の面（準備中）。議会の議決の面と並べる。
 * まだ票が無いので、割合の帯（0% に見えるもの）も含めて数字は出さない。
 *
 * h-full は、VersusLayout で両面の高さをそろえるとき（stretch）だけ効く。
 */
export function CitizenVotePlaceholder({
  description = "区民投票が始まると、この議案への区民の賛成・反対の割合をここに出し、議会の議決と見比べられるようにします。",
}: {
  description?: string;
}) {
  return (
    <ComingSoonCard
      icon={Users}
      radius="md"
      title="区民の意思（区民投票）"
      description={description}
      className="h-full"
    />
  );
}
