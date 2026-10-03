import { describe, expect, it } from "vitest";
import { explainerFileSchema, materialFileSchema } from "./schema";
import { sampleExplainer, sampleMaterial } from "./test-fixtures";

describe("explainerFileSchema", () => {
  it("正しい解説を読める", () => {
    const parsed = explainerFileSchema.parse(sampleExplainer());
    expect(parsed.body.merits).toHaveLength(1);
    expect(parsed.sources[0].pages).toEqual([3]);
  });

  it("公開（published）には照合（review）が必要", () => {
    const result = explainerFileSchema.safeParse({
      ...sampleExplainer(),
      review: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["review"]);
  });

  it("下書きなら照合が無くてもよい", () => {
    const result = explainerFileSchema.safeParse({
      ...sampleExplainer(),
      status: "draft",
      review: null,
    });
    expect(result.success).toBe(true);
  });

  it("sources に無い出典を参照するとエラーにする", () => {
    const file = sampleExplainer();
    file.body.purpose.sourceRefs = ["unknown"];
    const result = explainerFileSchema.safeParse(file);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([
      "body",
      "purpose",
      "sourceRefs",
    ]);
  });

  it("根拠（evidence）が無い項目はエラーにする", () => {
    const file = sampleExplainer();
    file.body.merits[0].evidence = [];
    expect(explainerFileSchema.safeParse(file).success).toBe(false);
  });

  it("出典に PDF の URL や区のサイト以外を使えない", () => {
    for (const pageUrl of [
      "https://www.city.shinjuku.lg.jp/content/000000001.pdf",
      "https://example.com/page.html",
    ]) {
      const file = sampleExplainer();
      file.sources[0].pageUrl = pageUrl;
      expect(explainerFileSchema.safeParse(file).success, pageUrl).toBe(false);
    }
  });

  it("billSlug は sessionSlug で始まる", () => {
    const result = explainerFileSchema.safeParse({
      ...sampleExplainer(),
      billSlug: "r8-teirei-2-gian-90",
    });
    expect(result.success).toBe(false);
  });
});

describe("materialFileSchema", () => {
  it("材料ファイルを読める", () => {
    expect(materialFileSchema.parse(sampleMaterial()).documents).toHaveLength(
      2
    );
  });
});
