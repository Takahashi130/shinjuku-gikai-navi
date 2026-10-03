import {
  type ExplainerIssue,
  validateExplainerJson,
} from "@mirai-gikai/shared/bill-explainer/validate-explainer";
import {
  type ExplainerFile,
  type MaterialFile,
  materialFileSchema,
} from "@mirai-gikai/shared/bill-explainer/schema";

/**
 * 1つの解説ファイルを検査する（ファイルの読み込みは呼び出し側で行う）。
 * - JSON として読めるか・スキーマに合うか
 * - 置き場所が explainers/<sessionSlug>/<billSlug>.json か
 * - 材料（.materials/）と照合して問題が無いか
 */
export function checkExplainerFile(input: {
  /** リポジトリのルートからのパス（例：explainers/r8-teirei-3/r8-teirei-3-gian-63.json） */
  relPath: string;
  text: string;
  /** 材料ファイルの中身（無ければ null） */
  materialText: string | null;
}): { file: ExplainerFile | null; issues: ExplainerIssue[] } {
  let json: unknown;
  try {
    json = JSON.parse(input.text);
  } catch (e) {
    return {
      file: null,
      issues: [
        {
          severity: "error",
          code: "schema",
          path: "",
          message: `JSON として読めない: ${(e as Error).message}`,
        },
      ],
    };
  }

  let material: MaterialFile | null = null;
  const materialIssues: ExplainerIssue[] = [];
  if (input.materialText !== null) {
    const parsed = materialFileSchema.safeParse(safeJson(input.materialText));
    if (parsed.success) material = parsed.data;
    else {
      materialIssues.push({
        severity: "error",
        code: "material_missing",
        path: "",
        message:
          "材料ファイルの形が正しくない。importer の materials コマンドで取り直す",
      });
    }
  }

  const { file, issues } = validateExplainerJson(json, material);
  const pathIssues: ExplainerIssue[] = [];
  if (file) {
    const expected = `explainers/${file.sessionSlug}/${file.billSlug}.json`;
    if (input.relPath !== expected) {
      pathIssues.push({
        severity: "error",
        code: "schema",
        path: "",
        message: `置き場所は ${expected} にする`,
      });
    }
  }
  // 材料の形が正しくないときは「材料が無い」の重複を除く
  const merged =
    materialIssues.length > 0
      ? issues.filter((i) => i.code !== "material_missing")
      : issues;
  return { file, issues: [...pathIssues, ...materialIssues, ...merged] };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
