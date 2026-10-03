import { describe, expect, it } from "vitest";
import { type ExplainerFile, explainerFileSchema } from "./schema";
import { sampleExplainer, sampleMaterial } from "./test-fixtures";
import {
  extractPersonNames,
  hasErrors,
  validateExplainer,
  validateExplainerJson,
} from "./validate-explainer";

function explainer(edit?: (f: ExplainerFile) => void): ExplainerFile {
  const file = explainerFileSchema.parse(sampleExplainer());
  edit?.(file);
  return file;
}

const codes = (file: ExplainerFile) =>
  validateExplainer(file, sampleMaterial()).map((i) => i.code);

describe("validateExplainer", () => {
  it("資料どおりの解説には問題が無い", () => {
    expect(validateExplainer(explainer(), sampleMaterial())).toEqual([]);
  });

  it("根拠の抜き出しが資料に無いとエラーにする", () => {
    const file = explainer((f) => {
      f.body.merits[0].evidence = ["電気代が半分になる"];
    });
    const issues = validateExplainer(file, sampleMaterial());
    expect(issues).toMatchObject([
      {
        severity: "error",
        code: "evidence_not_found",
        path: "body.merits.0.evidence.0",
      },
    ]);
  });

  it("根拠は指定した出典の資料の中だけで探す", () => {
    const file = explainer((f) => {
      // 契約金額は overview にしかない
      f.body.keyFacts[0].sourceRefs = ["full-text"];
    });
    expect(codes(file)).toEqual(["evidence_not_found"]);
  });

  it("資料に無い数字・日付はエラーにする", () => {
    const file = explainer((f) => {
      f.body.oneLiner = "約5億円の工事を令和9年3月31日までに終えます。";
    });
    expect(codes(file)).toEqual([
      "figure_not_in_material",
      "figure_not_in_material",
    ]);
  });

  it("「約」付きの数は、その項目の抜き出しにある数を丸めた値なら通す", () => {
    const file = explainer((f) => {
      f.body.keyFacts[0].value = "約2.3億円";
      // 見出し・ひとことは、解説のどの抜き出しの数と比べてもよい
      f.body.oneLiner = "区立施設の照明をLEDに替える約2.3億円の工事です。";
    });
    expect(validateExplainer(file, sampleMaterial())).toEqual([]);
  });

  it("「約」付きの数は、資料の別の箇所に近い数があっても、その項目の抜き出しに無ければエラーにする", () => {
    const file = explainer((f) => {
      // 契約金額（2億2,990万円）は資料にあるが、この項目の抜き出しには無い
      f.body.merits[0].text = "約2.3億円で、施設の照明がLEDになります。";
    });
    const issues = validateExplainer(file, sampleMaterial());
    expect(issues).toMatchObject([
      {
        severity: "error",
        code: "figure_not_in_material",
        path: "body.merits.0",
      },
    ]);
    expect(issues[0].message).toContain("抜き出し（evidence）");
  });

  it("「約」付きの数は、表示した桁で丸めて一致しなければエラーにする", () => {
    const file = explainer((f) => {
      // 2億2,990万円は 1億の位で丸めると 2億（3億ではない）
      f.body.keyFacts[0].value = "約3億円";
    });
    expect(codes(file)).toEqual(["figure_not_in_material"]);
  });

  it("評価する言葉はエラーにする", () => {
    const file = explainer((f) => {
      f.body.merits[0].text = "画期的な工事で、すぐに賛成すべきです。";
    });
    const issues = validateExplainer(file, sampleMaterial());
    expect(issues.map((i) => i.code)).toEqual(["evaluative_word"]);
    expect(issues[0].message).toContain("「画期的」");
    expect(issues[0].message).toContain("「賛成すべき」");
  });

  it("番地までの住所はエラーにする（抜き出しの中も調べる）", () => {
    const file = explainer((f) => {
      f.body.keyFacts.push({
        label: "工事場所",
        value: "テスト町",
        sourceRefs: ["overview"],
        evidence: ["東京都新宿区テスト町 2 番 42 号"],
      });
    });
    expect(codes(file)).toEqual(["private_info"]);
  });

  it("電話番号はエラーにする", () => {
    const file = explainer((f) => {
      f.body.notInMaterials.push("問い合わせは 03-1234-5678 まで");
    });
    expect(codes(file)).toContain("private_info");
  });

  it("資料にある私人（会社の代表者）の氏名はエラーにする", () => {
    const file = explainer((f) => {
      f.body.keyFacts[1].value = "テスト電気株式会社（代表 山田太郎）";
    });
    expect(codes(file)).toEqual(["private_person_name"]);
  });

  it("論点が空なら warning を出す（error ではない）", () => {
    const file = explainer((f) => {
      f.body.concerns = [];
    });
    const issues = validateExplainer(file, sampleMaterial());
    expect(issues).toMatchObject([
      { severity: "warning", code: "concerns_empty" },
    ]);
    expect(hasErrors(issues)).toBe(false);
  });

  it("材料が無ければエラーにする", () => {
    expect(validateExplainer(explainer(), null).map((i) => i.code)).toEqual([
      "material_missing",
    ]);
  });

  it("材料の議案が違えばエラーにする", () => {
    const material = { ...sampleMaterial(), billSlug: "r8-teirei-3-gian-91" };
    expect(validateExplainer(explainer(), material).map((i) => i.code)).toEqual(
      ["material_mismatch"]
    );
  });

  it("出典の materialKey やページが材料に無ければエラーにする", () => {
    const file = explainer((f) => {
      f.sources[1].materialKey = "budget-overview";
      f.sources[0].pages = [3, 4];
    });
    const issueCodes = codes(file);
    expect(issueCodes).toContain("source_not_in_material");
    expect(issueCodes).toContain("source_page_not_in_material");
  });
});

describe("validateExplainerJson", () => {
  it("スキーマに合わなければ、その問題だけを返す", () => {
    const json = { ...sampleExplainer(), version: 0 };
    const { file, issues } = validateExplainerJson(json, sampleMaterial());
    expect(file).toBeNull();
    expect(issues).toMatchObject([
      { severity: "error", code: "schema", path: "version" },
    ]);
  });

  it("スキーマに合えば材料と照合する", () => {
    const { file, issues } = validateExplainerJson(
      sampleExplainer(),
      sampleMaterial()
    );
    expect(file?.billSlug).toBe("r8-teirei-3-gian-90");
    expect(issues).toEqual([]);
  });
});

describe("extractPersonNames", () => {
  it("肩書きの後ろの氏名を拾う（1文字ずつ空白が入っていても）", () => {
    expect(
      extractPersonNames(
        "代表取締役 山田 太郎\n代 表 取 締 役 社 長 佐 藤 花 子\n執行役員支店長 鈴木 一郎"
      )
    ).toEqual(["山田太郎", "佐藤花子", "鈴木一郎"]);
  });

  it("区長などの公職や、肩書きの無い行は拾わない", () => {
    expect(
      extractPersonNames("提出者 新宿区長 吉住 健一\nテスト電気株式会社")
    ).toEqual([]);
  });
});
