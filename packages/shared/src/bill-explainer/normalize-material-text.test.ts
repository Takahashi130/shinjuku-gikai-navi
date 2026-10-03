import { describe, expect, it } from "vitest";
import {
  compactForMatch,
  containsQuote,
  normalizeMaterialText,
} from "./normalize-material-text";

describe("normalizeMaterialText", () => {
  it("1文字ずつ空白が入った行をつなげる", () => {
    expect(normalizeMaterialText("第 ６ ７ 号 議 案")).toBe("第67号議案");
    expect(normalizeMaterialText("計 2 8 5 万 9 , 1 0 0 円 及 び")).toBe(
      "計285万9,100円及び"
    );
  });

  it("全角の英数字・丸数字をそろえる", () => {
    expect(normalizeMaterialText("ＥＳＣＯ事業 ⑴ 介護補償")).toBe(
      "ESCO事業(1)介護補償"
    );
  });

  it("日本語の隣の空白を除き、英単語の間の空白は残す", () => {
    expect(normalizeMaterialText("令和 8 年 12 月 1 日")).toBe(
      "令和8年12月1日"
    );
    expect(normalizeMaterialText("M365 E3 Original Sub 4,382 ライセンス")).toBe(
      "M365 E3 Original Sub 4,382ライセンス"
    );
  });

  it("数の並んだ行は1文字ずつの行として扱わない", () => {
    expect(normalizeMaterialText("1 国庫負担金 31,022,780 7,122")).toBe(
      "1国庫負担金31,022,780 7,122"
    );
  });

  it("空行を除き、改行は残す", () => {
    expect(normalizeMaterialText("一行目\r\n\r\n  二行目  ")).toBe(
      "一行目\n二行目"
    );
  });
});

describe("compactForMatch / containsQuote", () => {
  it("空白と改行をすべて除く", () => {
    expect(compactForMatch("引用条項を\n改める。")).toBe("引用条項を改める。");
  });

  it("行をまたぐ抜き出しも見つける", () => {
    const material = "公益通報者保護法の改正に伴い、引用条\n項を改める。";
    expect(containsQuote(material, "引用条項を改める")).toBe(true);
    expect(containsQuote(material, "引用条項を削る")).toBe(false);
  });

  it("全角・半角の違いは無視する", () => {
    expect(containsQuote("契約金額 ２億２，９９０万円", "2億2,990万円")).toBe(
      true
    );
  });

  it("空の抜き出しは見つからない扱いにする", () => {
    expect(containsQuote("資料", "  ")).toBe(false);
  });
});
