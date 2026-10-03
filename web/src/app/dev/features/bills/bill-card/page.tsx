import { BillCard } from "@/features/bills/client/components/bill-list/bill-card";
import { ComponentShowcase } from "../../../_components/component-showcase";
import { PreviewSection } from "../../../_components/preview-section";
import { allBillStatuses, createMockBill } from "../../../_lib/mock-data";

export default function BillCardPreview() {
  const defaultBill = createMockBill();

  const featuredBill = createMockBill({
    id: "mock-featured",
    is_featured: true,
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
      <h1 className="text-3xl font-bold text-mirai-text mb-4">BillCard</h1>
      {/*
        BillCard は自分で議案詳細へのリンクになる。ここの議案はプレビュー用の
        架空のもの（id: mock-*）なので、押しても存在しない議案のページになり、
        トップへ戻される。
      */}
      <p className="mb-8 rounded-2xl border border-line-soft bg-white px-4 py-3 text-sm text-mirai-text-secondary">
        ※
        ここに並べている議案はプレビュー用の架空のものです。カードは議案詳細へのリンクですが、押しても存在しない議案のページ（トップへ戻されます）になります。
      </p>

      <ComponentShowcase
        title="BillCard"
        description="トップの「審議中の議案」・議案一覧（/bills）・会期別一覧の大きめのカード。is_featured は「賛否が分かれた」の目印になる"
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {samples.map((bill) => (
            <li key={bill.id}>
              <BillCard bill={bill} />
            </li>
          ))}
        </ul>
      </ComponentShowcase>

      <ComponentShowcase
        title="All Statuses"
        description="全議案ステータスの表示"
      >
        <ul className="grid gap-4 md:grid-cols-2">
          {allBillStatuses.map((status) => (
            <li key={status}>
              <PreviewSection label={`status: ${status}`}>
                <BillCard
                  bill={createMockBill({
                    id: `mock-${status}`,
                    status,
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
