import { describe, expect, it } from "vitest";
import { checkExplainerFile } from "./check-explainer-file";
import { explainer, material } from "./test-fixtures";

const relPath = "explainers/r8-teirei-3/r8-teirei-3-gian-90.json";
const json = (v: unknown) => JSON.stringify(v);

describe("checkExplainerFile", () => {
  it("正しい解説と材料なら error は無い（論点が空の warning だけ）", () => {
    const { file, issues } = checkExplainerFile({
      relPath,
      text: json(explainer()),
      materialText: json(material()),
    });
    expect(file?.billSlug).toBe("r8-teirei-3-gian-90");
    expect(issues.map((i) => [i.severity, i.code])).toEqual([
      ["warning", "concerns_empty"],
    ]);
  });

  it("JSON として読めなければ error", () => {
    const { file, issues } = checkExplainerFile({
      relPath,
      text: "{",
      materialText: null,
    });
    expect(file).toBeNull();
    expect(issues[0]).toMatchObject({ severity: "error", code: "schema" });
  });

  it("置き場所が会期と議案の slug に合っていなければ error", () => {
    const { issues } = checkExplainerFile({
      relPath: "explainers/other/x.json",
      text: json(explainer()),
      materialText: json(material()),
    });
    expect(issues[0].message).toContain(relPath);
  });

  it("材料が無ければ error", () => {
    const { issues } = checkExplainerFile({
      relPath,
      text: json(explainer()),
      materialText: null,
    });
    expect(issues.map((i) => i.code)).toContain("material_missing");
  });

  it("材料の形が正しくなければ、その問題を1つだけ返す", () => {
    const { issues } = checkExplainerFile({
      relPath,
      text: json(explainer()),
      materialText: "{}",
    });
    expect(issues.filter((i) => i.code === "material_missing")).toHaveLength(1);
  });
});
