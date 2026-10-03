import type {
  ExplainerBody,
  ExplainerItem,
  ExplainerSource,
  MaterialKind,
} from "@mirai-gikai/shared/bill-explainer/schema";
import type { ExplainerSlide, SlideItem, SlideSourceRef } from "../types";

const KIND_LABELS: Record<MaterialKind, string> = {
  session_page: "会期のページ",
  overview_pdf: "提出案件概要（PDF）",
  budget_overview_pdf: "補正予算の概要（PDF）",
  full_text_pdf: "議案の本文（PDF）",
  results_pdf: "審議結果（PDF）",
};

/**
 * PDF のページ番号を短い言い方にする。
 * - [3] → 3ページ / [3, 5] → 3・5ページ / [3, 4, 5] → 3〜5ページ / [] → null
 */
export function formatPagesLabel(pages: readonly number[]): string | null {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const consecutive = sorted.every((p, i) => p === first + i);
  if (sorted.length >= 3 && consecutive) return `${first}〜${last}ページ`;
  return `${sorted.join("・")}ページ`;
}

export function toSlideSourceRef(source: ExplainerSource): SlideSourceRef {
  return {
    id: source.id,
    title: source.title,
    kindLabel: KIND_LABELS[source.kind] ?? "資料",
    pagesLabel: formatPagesLabel(source.pages ?? []),
    pageUrl: source.pageUrl,
  };
}

function resolveRefs(
  refs: readonly string[],
  sourcesById: Map<string, SlideSourceRef>
): SlideSourceRef[] {
  const resolved: SlideSourceRef[] = [];
  for (const id of new Set(refs)) {
    const source = sourcesById.get(id);
    if (source) resolved.push(source);
  }
  return resolved;
}

function toSlideItem(
  item: ExplainerItem,
  sourcesById: Map<string, SlideSourceRef>
): SlideItem {
  return {
    text: item.text,
    sources: resolveRefs(item.sourceRefs, sourcesById),
    evidence: item.evidence,
  };
}

export const CONCERNS_EMPTY_MESSAGE =
  "資料からは、はっきりした論点を読み取れませんでした。気になる点は、区の資料や議会での審議もあわせてご確認ください。";

/**
 * 解説の本文を7枚のスライドに並べる。
 * 1 ひとことで 2 目的 3 背景 4 区が説明している効果 5 論点・気になる点 6 主な数字 7 資料に書かれていないこと（と出典）
 *
 * 「一覧で読む」でも同じ並びを使う。
 */
export function buildExplainerSlides(
  body: ExplainerBody,
  sources: readonly ExplainerSource[]
): ExplainerSlide[] {
  const refs = sources.map(toSlideSourceRef);
  const sourcesById = new Map(refs.map((ref) => [ref.id, ref]));
  const items = (list: readonly ExplainerItem[]) =>
    list.map((item) => toSlideItem(item, sourcesById));

  return [
    {
      kind: "cover",
      id: "cover",
      heading: "ひとことで言うと",
      title: body.title,
      oneLiner: body.oneLiner,
    },
    {
      kind: "items",
      id: "purpose",
      heading: "目的",
      lead: "この議案で区が何をしようとしているか",
      items: items([body.purpose]),
      emptyMessage: null,
    },
    {
      kind: "items",
      id: "background",
      heading: "背景",
      lead: "この議案が出された理由や経緯",
      items: items(body.background),
      emptyMessage: null,
    },
    {
      kind: "items",
      id: "merits",
      heading: "区が説明している効果",
      lead: "メリットとして資料から読み取れること",
      items: items(body.merits),
      emptyMessage: null,
    },
    {
      kind: "items",
      id: "concerns",
      heading: "論点・気になる点",
      lead: "負担や課題など、資料から読み取れること",
      items: items(body.concerns),
      emptyMessage: body.concerns.length === 0 ? CONCERNS_EMPTY_MESSAGE : null,
    },
    {
      kind: "facts",
      id: "keyFacts",
      heading: "主な数字・事実",
      lead: "金額・期間・相手方など",
      facts: body.keyFacts.map((fact) => ({
        label: fact.label,
        text: fact.value,
        sources: resolveRefs(fact.sourceRefs, sourcesById),
        evidence: fact.evidence,
      })),
    },
    {
      kind: "notes",
      id: "notInMaterials",
      heading: "資料に書かれていないこと",
      lead: "誤解のないよう、資料からは分からないことをまとめました",
      notes: body.notInMaterials,
      sources: refs,
    },
  ];
}
