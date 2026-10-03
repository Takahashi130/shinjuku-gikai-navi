import {
  extractFigures,
  figureInMaterial,
  indexMaterialFigures,
  type MaterialFigureIndex,
} from "./extract-figures";
import {
  compactForMatch,
  normalizeMaterialText,
} from "./normalize-material-text";
import {
  collectEvidenceEntries,
  type ExplainerFile,
  explainerFileSchema,
  type MaterialDocument,
  type MaterialFile,
} from "./schema";

/**
 * 解説を区の資料（材料）と機械的に照らし合わせる。
 *
 * - 根拠の抜き出し（evidence）が、指定した出典の資料にそのまま書かれているか
 * - 本文の数字・日付・金額が、その議案の資料のどこかに書かれているか
 *   （「約」付きの数は、その項目の抜き出し（evidence）にある数を、表示した桁で丸めた値か）
 * - 評価する言葉（「画期的」「無駄」「〜すべき」など）を使っていないか
 * - 私人の情報（氏名・電話番号・番地までの住所など）を載せていないか
 *
 * error が1つでもあれば公開・同期しない。warning は確認を促すだけ。
 */

export type ExplainerIssueCode =
  | "schema"
  | "material_missing"
  | "material_mismatch"
  | "source_not_in_material"
  | "source_page_not_in_material"
  | "evidence_not_found"
  | "figure_not_in_material"
  | "evaluative_word"
  | "private_info"
  | "private_person_name"
  | "concerns_empty"
  | "too_much_quotation";

export type ExplainerIssue = {
  severity: "error" | "warning";
  code: ExplainerIssueCode;
  /** body の中の場所など（例：body.merits.0） */
  path: string;
  message: string;
};

/** 評価・主張にあたる言葉。解説は中立に書き、判断は読む人に任せる */
export const EVALUATIVE_WORDS = [
  "画期的",
  "素晴らしい",
  "すばらしい",
  "優れた",
  "最悪",
  "無駄遣い",
  "税金の無駄",
  "ずさん",
  "杜撰",
  "愚策",
  "悪政",
  "英断",
  "改悪",
  "暴挙",
  "当然だ",
  "当然である",
  "べきだ",
  "べきです",
  "べきである",
  "べきでない",
  "べきではない",
  "評価できる",
  "評価すべき",
  "問題である",
  "残念",
  "遺憾",
  "許されない",
  "許しがたい",
  "間違いなく",
  "賛成すべき",
  "反対すべき",
  "賛成しましょう",
  "反対しましょう",
  "おすすめ",
  "望ましい",
  "好ましい",
  "けしからん",
  "ひどい",
] as const;

/** 解説全体の引用（evidence）の文字数の目安。超えたら転載に近いので warning */
export const MAX_TOTAL_QUOTE_CHARS = 1500;

const PRIVATE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /(?<!\d)0\d{1,4}-\d{1,4}-\d{3,4}(?!\d)/, label: "電話番号" },
  { re: /[\w.+-]+@[\w-]+\.[\w.-]+/, label: "メールアドレス" },
  { re: /(?<![\d-])〒?\d{3}-\d{4}(?![\d-])/, label: "郵便番号" },
  {
    re: /(丁目|町)\d+番(地)?(\d+号)?|\d+番地|\d+番\d+号/,
    label: "番地までの住所（町名までにする）",
  },
];

/** 資料の中で、私人の氏名が書かれやすい肩書き（会社の代表者など）。長いものから並べる */
const PERSON_TITLES = [
  "代表取締役社長",
  "代表取締役",
  "代表執行役社長",
  "代表執行役",
  "代表社員",
  "代表理事",
  "理事長",
  "執行役員支店長",
  "執行役員",
  "営業所長",
  "支店長",
  "グループ長",
  "代表者",
];

const PERSON_NAME_AT_LINE_END = new RegExp(
  `(?:${PERSON_TITLES.join("|")})([\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー]{2,8})$`,
  "u"
);

/**
 * 資料から私人の氏名を拾う。行が「肩書き＋氏名」で終わるとき、肩書きの後ろを氏名とみなす
 * （例：「代表取締役 高橋 稔」→「高橋稔」）。区長など公職の氏名は対象にしない。
 */
export function extractPersonNames(materialText: string): string[] {
  const names = new Set<string>();
  for (const line of normalizeMaterialText(materialText).split("\n")) {
    const m = line.replace(/\s+/g, "").match(PERSON_NAME_AT_LINE_END);
    if (m) names.add(m[1]);
  }
  return [...names];
}

function documentText(doc: MaterialDocument, pages?: number[]): string {
  const selected =
    pages && pages.length > 0
      ? doc.pages.filter((p) => p.page !== null && pages.includes(p.page))
      : doc.pages;
  return selected.map((p) => p.text).join("\n");
}

function pathString(path: (string | number)[]): string {
  return ["body", ...path].join(".");
}

/** 解説の本文（評価語・私人情報を調べる対象） */
function proseFields(file: ExplainerFile): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [
    { path: "body.title", text: file.body.title },
    { path: "body.oneLiner", text: file.body.oneLiner },
  ];
  for (const entry of collectEvidenceEntries(file.body)) {
    for (const text of entry.texts) {
      out.push({ path: pathString(entry.path), text });
    }
  }
  file.body.notInMaterials.forEach((text, i) => {
    out.push({ path: `body.notInMaterials.${i}`, text });
  });
  return out;
}

export function validateExplainer(
  file: ExplainerFile,
  material: MaterialFile | null
): ExplainerIssue[] {
  const issues: ExplainerIssue[] = [];
  const error = (code: ExplainerIssueCode, path: string, message: string) =>
    issues.push({ severity: "error", code, path, message });
  const warning = (code: ExplainerIssueCode, path: string, message: string) =>
    issues.push({ severity: "warning", code, path, message });

  // ── 評価語・私人情報（材料が無くても調べられるもの） ──
  const prose = proseFields(file);
  for (const { path, text } of prose) {
    const compact = compactForMatch(text);
    const words = EVALUATIVE_WORDS.filter((w) =>
      compact.includes(compactForMatch(w))
    );
    if (words.length > 0) {
      error(
        "evaluative_word",
        path,
        `評価する言葉（${words.map((w) => `「${w}」`).join("")}）は使わない（事実を書き、判断は読む人に任せる）`
      );
    }
  }
  const evidenceFields = collectEvidenceEntries(file.body).flatMap((e) =>
    e.evidence.map((q, i) => ({
      path: `${pathString(e.path)}.evidence.${i}`,
      text: q,
    }))
  );
  for (const { path, text } of [...prose, ...evidenceFields]) {
    const compact = compactForMatch(text);
    for (const { re, label } of PRIVATE_PATTERNS) {
      if (re.test(compact)) {
        error("private_info", path, `${label}を載せない`);
      }
    }
  }

  if (file.body.concerns.length === 0) {
    warning(
      "concerns_empty",
      "body.concerns",
      "論点・負担（デメリット）が空。資料から読み取れるものが無いなら notInMaterials に書く"
    );
  }
  const totalQuote = evidenceFields.reduce((n, f) => n + f.text.length, 0);
  if (totalQuote > MAX_TOTAL_QUOTE_CHARS) {
    warning(
      "too_much_quotation",
      "body",
      `引用が合計 ${totalQuote} 文字ある（目安 ${MAX_TOTAL_QUOTE_CHARS} 文字以内）。転載にならないよう減らす`
    );
  }

  // ── 材料との照合 ──
  if (!material) {
    error(
      "material_missing",
      "",
      "材料（.materials/）が無い。importer の materials コマンドで取得する"
    );
    return issues;
  }
  if (material.billSlug !== file.billSlug) {
    error(
      "material_mismatch",
      "",
      `材料の議案（${material.billSlug}）と解説の議案（${file.billSlug}）が違う`
    );
    return issues;
  }

  const docs = new Map(material.documents.map((d) => [d.key, d]));
  const sourceTexts = new Map<string, string>();
  file.sources.forEach((source, i) => {
    const doc = docs.get(source.materialKey);
    if (!doc) {
      error(
        "source_not_in_material",
        `sources.${i}`,
        `出典「${source.id}」の materialKey「${source.materialKey}」が材料に無い`
      );
      return;
    }
    const docPages = doc.pages.map((p) => p.page);
    for (const page of source.pages) {
      if (!docPages.includes(page)) {
        error(
          "source_page_not_in_material",
          `sources.${i}.pages`,
          `出典「${source.id}」の ${page} ページは材料に無い`
        );
      }
    }
    sourceTexts.set(
      source.id,
      compactForMatch(documentText(doc, source.pages))
    );
  });

  for (const entry of collectEvidenceEntries(file.body)) {
    const haystacks = entry.refs
      .map((ref) => sourceTexts.get(ref))
      .filter((t): t is string => t !== undefined);
    entry.evidence.forEach((quote, i) => {
      const q = compactForMatch(quote);
      if (!haystacks.some((h) => h.includes(q))) {
        error(
          "evidence_not_found",
          `${pathString(entry.path)}.evidence.${i}`,
          `抜き出し「${quote}」が出典（${entry.refs.join("、")}）の資料に見つからない`
        );
      }
    });
  }

  // 数字・日付・金額は、その議案の資料のどこかにあればよい。
  // 「約」付きの数は、資料のどこかにある近い数では通さず、その項目の抜き出し（evidence。
  // 出典のページにそのまま書かれていることを上で確かめた、資料の該当箇所）にある数と比べる。
  // 見出し・ひとことには抜き出しが無いので、解説のすべての抜き出しと比べる。
  const allText = material.documents.map((d) => documentText(d)).join("\n");
  const figureIndex = indexMaterialFigures([allText]);
  const entries = collectEvidenceEntries(file.body);
  const allEvidenceIndex = indexMaterialFigures(
    entries.flatMap((e) => e.evidence)
  );
  const figureFields: {
    path: string;
    text: string;
    near: MaterialFigureIndex;
  }[] = [
    { path: "body.title", text: file.body.title, near: allEvidenceIndex },
    { path: "body.oneLiner", text: file.body.oneLiner, near: allEvidenceIndex },
    ...entries.flatMap((e) => {
      const near = indexMaterialFigures(e.evidence);
      return e.texts.map((text) => ({ path: pathString(e.path), text, near }));
    }),
  ];
  for (const { path, text, near } of figureFields) {
    for (const figure of extractFigures(text)) {
      if (figureInMaterial(figure, figureIndex, near)) continue;
      error(
        "figure_not_in_material",
        path,
        figure.approx
          ? `「約」などの付いた「${figure.raw}」に合う数が、この項目の抜き出し（evidence）に無い（元の数を含む箇所を evidence に入れ、表示する桁で四捨五入か切り捨てした値にする）`
          : `「${figure.raw}」が資料に見つからない（数字・日付・金額は資料の値をそのまま使う）`
      );
    }
  }

  // 資料に出てくる私人（会社の代表者など）の氏名
  const names = extractPersonNames(allText);
  for (const { path, text } of [...prose, ...evidenceFields]) {
    const compact = compactForMatch(text);
    for (const name of names) {
      if (compact.includes(name)) {
        error(
          "private_person_name",
          path,
          `個人の氏名「${name}」を載せない（会社名・役職までにする）`
        );
      }
    }
  }

  return issues;
}

/** JSON をスキーマで読んでから照合する。スキーマに合わなければその問題だけ返す */
export function validateExplainerJson(
  json: unknown,
  material: MaterialFile | null
): { file: ExplainerFile | null; issues: ExplainerIssue[] } {
  const parsed = explainerFileSchema.safeParse(json);
  if (!parsed.success) {
    return {
      file: null,
      issues: parsed.error.issues.map((issue) => ({
        severity: "error",
        code: "schema",
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }
  return {
    file: parsed.data,
    issues: validateExplainer(parsed.data, material),
  };
}

export function hasErrors(issues: ExplainerIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
