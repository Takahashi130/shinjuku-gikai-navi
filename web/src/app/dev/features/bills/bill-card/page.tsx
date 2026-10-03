import { BillSearchCard } from "@/features/bills/client/components/bill-list/bill-search-card";
import { BillTile } from "@/features/bills/client/components/bill-list/bill-tile";
import { ComponentShowcase } from "../../../_components/component-showcase";
import { PreviewSection } from "../../../_components/preview-section";
import { allBillStatuses, createMockBill } from "../../../_lib/mock-data";

const SAMPLE_THUMBNAIL = "/img/thumbnails/budget.png";

export default function BillCardPreview() {
  const defaultBill = createMockBill({
    thumbnail_url: SAMPLE_THUMBNAIL,
  });

  const featuredBill = createMockBill({
    id: "mock-featured",
    is_featured: true,
    thumbnail_url: SAMPLE_THUMBNAIL,
    bill_content: {
      id: "mock-content-featured",
      bill_id: "mock-featured",
      title: "会派の賛否が分かれた議案のタイトル",
      summary:
        "is_featured が立っている議案のカード表示。「賛否が分かれた」の目印が表示されます。",
      content: "",
      difficulty_level: "normal",
      created_at: "2026-02-15T00:00:00Z",
      updated_at: "2026-02-15T00:00:00Z",
    },
    tags: [
      { id: "tag-1", label: "経済" },
      { id: "tag-2", label: "デジタル" },
      { id: "tag-3", label: "行政改革" },
    ],
  });

  const longTitleBill = createMockBill({
    id: "mock-long-title",
    thumbnail_url: SAMPLE_THUMBNAIL,
    bill_content: {
      id: "mock-content-long-title",
      bill_id: "mock-long-title",
      title:
        "デジタル社会の形成を図るための関係法律の整備に関する法律の一部を改正する法律案についての補足的な検討事項を含む修正案",
      summary:
        "この議案は開発プレビュー用のサンプルデータです。議案の要約文がここに表示されます。",
      content: "",
      difficulty_level: "normal",
      created_at: "2026-02-15T00:00:00Z",
      updated_at: "2026-02-15T00:00:00Z",
    },
  });

  const longDescriptionBill = createMockBill({
    id: "mock-long-desc",
    thumbnail_url: SAMPLE_THUMBNAIL,
    bill_content: {
      id: "mock-content-long-desc",
      bill_id: "mock-long-desc",
      title: "サンプル議案のタイトル",
      summary:
        "この議案はデジタル社会の形成を推進するため、行政手続のオンライン化、マイナンバーカードの利活用促進、データの標準化・連携基盤の整備、サイバーセキュリティ対策の強化、個人情報保護制度の見直し、AI技術の適正利用に関するガイドラインの策定、地方自治体のDX推進支援、デジタルデバイド解消のための施策等について、関係する複数の法律を一括して改正するものです。特に高齢者や障害者を含む全ての国民がデジタル化の恩恵を享受できる社会の実現を目指しています。",
      content: "",
      difficulty_level: "normal",
      created_at: "2026-02-15T00:00:00Z",
      updated_at: "2026-02-15T00:00:00Z",
    },
  });

  const samples = [
    defaultBill,
    featuredBill,
    longTitleBill,
    longDescriptionBill,
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-mirai-text mb-4">
        BillTile / BillSearchCard
      </h1>
      {/*
        BillTile と BillSearchCard は自分で議案詳細へのリンクになる。ここの議案は
        プレビュー用の架空のもの（id: mock-*）なので、押しても存在しない議案の
        ページになり、トップへ戻される。
      */}
      <p className="mb-8 rounded-md border border-mirai-border bg-white px-4 py-3 text-sm text-mirai-text-secondary">
        ※
        ここに並べている議案はプレビュー用の架空のものです。カードは議案詳細へのリンクですが、押しても存在しない議案のページ（トップへ戻されます）になります。
      </p>

      <ComponentShowcase
        title="BillTile"
        description="トップの横スクロールの列に並べる縦長のカード"
      >
        <ul className="flex flex-wrap gap-4">
          {samples.map((bill) => (
            <li key={bill.id} className="w-48">
              <BillTile bill={bill} />
            </li>
          ))}
          <li className="w-48">
            <BillTile
              bill={{ ...defaultBill, id: "no-thumb", thumbnail_url: null }}
            />
          </li>
        </ul>
      </ComponentShowcase>

      <ComponentShowcase
        title="BillSearchCard"
        description="議案一覧（/bills）・会期別一覧の1行。is_featured は「賛否が分かれた」の目印になる"
      >
        <ul className="divide-y divide-mirai-border">
          {samples.map((bill) => (
            <li key={bill.id}>
              <BillSearchCard bill={bill} />
            </li>
          ))}
        </ul>
      </ComponentShowcase>

      <ComponentShowcase
        title="All Statuses"
        description="全議案ステータスの表示"
      >
        <ul className="flex flex-wrap gap-4">
          {allBillStatuses.map((status) => (
            <li key={status} className="w-48">
              <PreviewSection label={`status: ${status}`}>
                <BillTile
                  bill={createMockBill({
                    id: `mock-${status}`,
                    status,
                    thumbnail_url: SAMPLE_THUMBNAIL,
                  })}
                />
              </PreviewSection>
            </li>
          ))}
        </ul>
      </ComponentShowcase>
    </>
  );
}
