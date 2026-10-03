import { describe, expect, it } from "vitest";
import {
  dedupeCoords,
  joinCellText,
  parseFactionLegend,
  parseResultsTable,
  type TextItem,
} from "./parse-results-pdf";

const t = (str: string, x: number, y: number, width = 10, height = 8): TextItem => ({ str, x, y, width, height });

describe("dedupeCoords", () => {
  it("二重に描かれた罫線をひとつにまとめる", () => {
    expect(dedupeCoords([10, 50.1, 50, 10.4, 90])).toEqual([10, 50, 90]);
  });
});

describe("parseFactionLegend", () => {
  it("略称が別アイテムに分かれていても連結する", () => {
    const legend = parseFactionLegend([t("自参ク＝自民・参政クラブ", 100, 500, 100), t("公", 300, 500, 8), t("明＝新宿区議会公明党", 317, 500, 90)]);
    expect(legend.get("自参ク")).toBe("自民・参政クラブ");
    expect(legend.get("公明")).toBe("新宿区議会公明党");
  });

  it("離れた位置の文字（ページタイトル）は略称に含めない", () => {
    const legend = parseFactionLegend([t("議案の概要と審議結果", 0, 500, 60), t("民無ク＝立憲民主党・無所属クラブ", 200, 500, 120)]);
    expect(legend.get("民無ク")).toBe("立憲民主党・無所属クラブ");
  });

  it("正式名称の続きを連結する", () => {
    const legend = parseFactionLegend([t("れいわ＝れいわ新選組", 100, 500, 80), t("新宿", 185, 500, 15)]);
    expect(legend.get("れいわ")).toBe("れいわ新選組 新宿");
  });
});

describe("joinCellText", () => {
  it("上の行から順に連結し、「・」で始まる行だけ改行する", () => {
    const text = joinCellText([t("・犬のふん", 0, 80), t("環境美化を", 0, 100), t("推進する。", 0, 90)]);
    expect(text).toBe("環境美化を推進する。\n・犬のふん");
  });
});

describe("parseResultsTable", () => {
  // 列: [0-20 区分][20-100 議案名][100-300 概要][300-320 A][320-340 B][340-380 議決]
  const rules = {
    vertical: [0, 20, 100, 300, 320, 340, 380],
    horizontal: [400, 380, 340, 300],
  };
  const items: TextItem[] = [
    t("A＝会派エー", 100, 420, 50),
    t("B＝会派ビー", 200, 420, 50),
    t("A", 305, 388, 8),
    t("B", 325, 388, 8),
    t("議決", 350, 388, 16),
    // 1行目
    t("条例案その1", 25, 360, 60),
    t("概要その1。", 105, 360, 60),
    t("〇", 305, 360, 8),
    t("×", 325, 360, 8),
    t("可決", 350, 360, 16),
    // 2行目（区分の縦書き文字は無視される）
    t("区", 5, 320, 8),
    t("条例案その2", 25, 320, 60),
    t("×", 305, 320, 8),
    t("×", 325, 320, 8),
    t("否決", 350, 320, 16),
  ];

  it("罫線でセルを確定し、会派ごとの賛否と議決結果を読む", () => {
    const table = parseResultsTable(items, rules);
    expect(table.factions).toEqual([
      { abbr: "A", name: "会派エー" },
      { abbr: "B", name: "会派ビー" },
    ]);
    expect(table.rows).toEqual([
      { name: "条例案その1", summary: "概要その1。", votes: { A: "for", B: "against" }, result: "可決" },
      { name: "条例案その2", summary: "", votes: { A: "against", B: "against" }, result: "否決" },
    ]);
  });

  it("見出し「議決」がなければエラーにする", () => {
    expect(() => parseResultsTable(items.filter((i) => i.str !== "議決"), rules)).toThrow("議決");
  });
});
