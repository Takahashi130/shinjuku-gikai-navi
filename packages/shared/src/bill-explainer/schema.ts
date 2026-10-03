import { z } from "zod";

/**
 * 議案の解説（explainers/<会期slug>/<議案slug>.json）と、
 * 解説の材料（.materials/<会期slug>/<議案slug>.json）の形。
 *
 * - 解説の body / sources は、そのまま bill_explainers.body / sources に入る。
 * - 解説の各項目には、出典（sourceRefs）と、資料からの短い抜き出し（evidence）を必ず付ける。
 * - 材料は区の文章そのものなので、リポジトリにも DB にも入れない（.materials は gitignore）。
 */

export const EXPLAINER_SCHEMA_VERSION = 1;
export const MATERIAL_SCHEMA_VERSION = 1;

export const EXPLAINER_STATUSES = ["draft", "published", "withdrawn"] as const;
export type ExplainerStatus = (typeof EXPLAINER_STATUSES)[number];

/** 資料との照合を AI が行ったときの reviewed_by */
export const AI_CROSSCHECK_REVIEWER = "ai-crosscheck";

/** 区の公式サイト（出典のリンク先はここの HTML ページに限る） */
export const SHINJUKU_SITE_ORIGIN = "https://www.city.shinjuku.lg.jp";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug は英小文字・数字・ハイフン");

const sourceIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "出典の id は英小文字・数字・ハイフン");

export const MATERIAL_KINDS = [
  "session_page",
  "overview_pdf",
  "budget_overview_pdf",
  "full_text_pdf",
  "results_pdf",
] as const;
export const materialKindSchema = z.enum(MATERIAL_KINDS);
export type MaterialKind = z.infer<typeof materialKindSchema>;

const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** 区の HTML ページの URL（PDF への直接リンクは使わない） */
const sitePageUrlSchema = z
  .url()
  .refine((u) => u.startsWith(`${SHINJUKU_SITE_ORIGIN}/`), {
    message: "出典は新宿区の公式サイトのページにする",
  })
  .refine((u) => !/\.pdf(?:$|[?#])/i.test(u), {
    message: "PDF へ直接リンクせず、PDF が載っている HTML ページを指す",
  });

// ── 解説 ──

export const explainerSourceSchema = z.object({
  id: sourceIdSchema,
  kind: materialKindSchema,
  /** 資料名（例：令和8年第3回区議会定例会提出案件概要） */
  title: z.string().trim().min(1).max(120),
  /** 資料が載っている区の HTML ページ */
  pageUrl: sitePageUrlSchema,
  /** PDF のページ番号（HTML の資料は空） */
  pages: z.array(z.number().int().positive()).default([]),
  /** 材料ファイルの documents[].key。照合に使う */
  materialKey: z.string().trim().min(1),
});
export type ExplainerSource = z.infer<typeof explainerSourceSchema>;

/** 資料からの短い抜き出し（引用は短くする） */
export const evidenceQuoteSchema = z.string().trim().min(4).max(120);

export const explainerItemSchema = z.object({
  text: z.string().trim().min(1).max(400),
  sourceRefs: z.array(sourceIdSchema).min(1),
  evidence: z.array(evidenceQuoteSchema).min(1).max(5),
});
export type ExplainerItem = z.infer<typeof explainerItemSchema>;

export const explainerKeyFactSchema = z.object({
  label: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(160),
  sourceRefs: z.array(sourceIdSchema).min(1),
  evidence: z.array(evidenceQuoteSchema).min(1).max(5),
});
export type ExplainerKeyFact = z.infer<typeof explainerKeyFactSchema>;

export const explainerBodySchema = z.object({
  /** 見出し（議案名をかみくだいたもの） */
  title: z.string().trim().min(1).max(80),
  /** ひとことで言うと */
  oneLiner: z.string().trim().min(1).max(140),
  /** 目的 */
  purpose: explainerItemSchema,
  /** 背景 */
  background: z.array(explainerItemSchema).min(1).max(5),
  /** 区が説明している効果（メリット） */
  merits: z.array(explainerItemSchema).min(1).max(5),
  /** 資料から読み取れる論点・負担・気になる点（デメリット） */
  concerns: z.array(explainerItemSchema).max(5),
  /** 主な数字・日付・相手方など */
  keyFacts: z.array(explainerKeyFactSchema).min(1).max(8),
  /** 資料に書かれていないこと（読む人が誤解しないように） */
  notInMaterials: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
});
export type ExplainerBody = z.infer<typeof explainerBodySchema>;

export const explainerReviewSchema = z.object({
  /** 照合した主体（AI の照合は ai-crosscheck） */
  reviewedBy: z.string().trim().min(1),
  reviewedAt: isoDateTimeSchema,
  /** 照合のやり方や指摘のメモ */
  notes: z.string().trim().max(1000).optional(),
});

export const explainerFileSchema = z
  .object({
    schemaVersion: z.literal(EXPLAINER_SCHEMA_VERSION),
    sessionSlug: slugSchema,
    billSlug: slugSchema,
    /** 第63号議案 など（人が読むため） */
    billLabel: z.string().trim().min(1),
    billName: z.string().trim().min(1),
    status: z.enum(EXPLAINER_STATUSES),
    /** 内容を直したら上げる */
    version: z.number().int().min(1),
    /** 予約公開（null なら published にした時点で公開） */
    publishAt: isoDateTimeSchema.nullable().default(null),
    author: z.object({
      kind: z.literal("ai"),
      /** 例：claude-opus-5-5 */
      model: z.string().trim().min(1),
      generatedAt: isoDateTimeSchema,
    }),
    review: explainerReviewSchema.nullable().default(null),
    sources: z.array(explainerSourceSchema).min(1),
    body: explainerBodySchema,
  })
  .superRefine((file, ctx) => {
    if (!file.billSlug.startsWith(`${file.sessionSlug}-`)) {
      ctx.addIssue({
        code: "custom",
        path: ["billSlug"],
        message: "billSlug は sessionSlug で始まる",
      });
    }
    if (file.status === "published" && !file.review) {
      ctx.addIssue({
        code: "custom",
        path: ["review"],
        message: "公開（published）には資料との照合（review）が必要",
      });
    }
    const ids = file.sources.map((s) => s.id);
    const duplicated = ids.filter((id, i) => ids.indexOf(id) !== i);
    for (const id of new Set(duplicated)) {
      ctx.addIssue({
        code: "custom",
        path: ["sources"],
        message: `出典の id「${id}」が重複している`,
      });
    }
    for (const { path, refs } of collectSourceRefs(file.body)) {
      for (const ref of refs) {
        if (!ids.includes(ref)) {
          ctx.addIssue({
            code: "custom",
            path: ["body", ...path, "sourceRefs"],
            message: `出典「${ref}」が sources にない`,
          });
        }
      }
    }
  });
export type ExplainerFile = z.infer<typeof explainerFileSchema>;
export type ExplainerFileInput = z.input<typeof explainerFileSchema>;

export type ExplainerEvidenceEntry = {
  /** body の中の場所（例：["merits", 0]） */
  path: (string | number)[];
  refs: string[];
  evidence: string[];
  /** 数字の照合に使う本文 */
  texts: string[];
};

/** body のうち、出典と根拠が付いている項目をすべて並べる */
export function collectEvidenceEntries(
  body: ExplainerBody
): ExplainerEvidenceEntry[] {
  const item = (path: (string | number)[], it: ExplainerItem) => ({
    path,
    refs: it.sourceRefs,
    evidence: it.evidence,
    texts: [it.text],
  });
  return [
    item(["purpose"], body.purpose),
    ...body.background.map((it, i) => item(["background", i], it)),
    ...body.merits.map((it, i) => item(["merits", i], it)),
    ...body.concerns.map((it, i) => item(["concerns", i], it)),
    ...body.keyFacts.map((f, i) => ({
      path: ["keyFacts", i],
      refs: f.sourceRefs,
      evidence: f.evidence,
      texts: [f.label, f.value],
    })),
  ];
}

function collectSourceRefs(body: ExplainerBody) {
  return collectEvidenceEntries(body).map(({ path, refs }) => ({ path, refs }));
}

// ── 材料 ──

export const materialDocumentSchema = z.object({
  /** 解説の sources[].materialKey から参照する（例：full-text、overview、budget-overview、session-page） */
  key: z.string().trim().min(1),
  kind: materialKindSchema,
  title: z.string().trim().min(1),
  /** 資料が載っている区の HTML ページ */
  pageUrl: z.url(),
  /** PDF の URL（照合と再取得のための控え。画面には出さない） */
  fileUrl: z.url().nullable(),
  pages: z
    .array(
      z.object({
        /** PDF のページ番号（HTML は null） */
        page: z.number().int().positive().nullable(),
        text: z.string(),
      })
    )
    .min(1),
});
export type MaterialDocument = z.infer<typeof materialDocumentSchema>;

export const materialFileSchema = z.object({
  schemaVersion: z.literal(MATERIAL_SCHEMA_VERSION),
  sessionSlug: slugSchema,
  sessionTitle: z.string().trim().min(1),
  sessionUrl: z.url(),
  billSlug: slugSchema,
  billLabel: z.string().trim().min(1),
  billName: z.string().trim().min(1),
  fetchedAt: isoDateTimeSchema,
  documents: z.array(materialDocumentSchema),
});
export type MaterialFile = z.infer<typeof materialFileSchema>;
