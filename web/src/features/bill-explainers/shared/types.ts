import type { ExplainerReadiness } from "@mirai-gikai/shared/bill-explainer/explainer-readiness";
import type {
  ExplainerBody,
  ExplainerSource,
} from "@mirai-gikai/shared/bill-explainer/schema";

/** 画面に出す解説（DB の bill_explainers を検査したもの） */
export type BillExplainer = {
  billId: string;
  version: number;
  body: ExplainerBody;
  sources: ExplainerSource[];
  reviewedAt: string | null;
  reviewedBy: string | null;
  generatedBy: string | null;
  firstPublishedAt: string | null;
  updatedAt: string;
  /** リポジトリの元ファイル（例：explainers/r8-teirei-3/r8-teirei-3-gian-63.json） */
  sourcePath: string | null;
  /** 公開前の下書き（プレビューでだけ出す） */
  isDraft: boolean;
};

export type BillExplainerView =
  | { kind: "available"; explainer: BillExplainer }
  | {
      kind: "absent";
      readiness: Exclude<ExplainerReadiness, { state: "available" }>;
      /** 下書きの行があるか（準備中の言い方を変える） */
      hasDraft: boolean;
    };

// ── スライド ──

export type SlideSourceRef = {
  id: string;
  title: string;
  /** 例：提出案件概要（PDF） */
  kindLabel: string;
  /** 例：3ページ。HTML のページなら null */
  pagesLabel: string | null;
  /** 資料が載っている区の HTML ページ */
  pageUrl: string;
};

export type SlideItem = {
  text: string;
  sources: SlideSourceRef[];
  /** 資料からの短い抜き出し */
  evidence: string[];
};

export type SlideFact = SlideItem & { label: string };

export type ExplainerSlide =
  | {
      kind: "cover";
      id: "cover";
      heading: string;
      title: string;
      oneLiner: string;
    }
  | {
      kind: "items";
      id: "purpose" | "background" | "merits" | "concerns";
      heading: string;
      lead: string;
      items: SlideItem[];
      /** 項目が無いときに出す文 */
      emptyMessage: string | null;
    }
  | {
      kind: "facts";
      id: "keyFacts";
      heading: string;
      lead: string;
      facts: SlideFact[];
    }
  | {
      kind: "notes";
      id: "notInMaterials";
      heading: string;
      lead: string;
      notes: string[];
      /** この解説の出典すべて */
      sources: SlideSourceRef[];
    };

/** 解説の下に出す、作成・照合・版・元ファイルの表示 */
export type ExplainerFooterInfo = {
  isDraft: boolean;
  /** 見出しに添える印（例：AI作成・照合済み） */
  badge: string;
  /** 作成・照合の説明 */
  attributionText: string;
  /** 誤りの知らせ方（linkText をリンクにする） */
  correction: {
    before: string;
    linkText: string;
    after: string;
    url: string;
  };
  /** 例：第1版・10月5日（日）照合 */
  versionLabel: string;
  sourceFileUrl: string | null;
};
