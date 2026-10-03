import { describe, expect, it } from "vitest";
import { splitBillTitle } from "./split-bill-title";

describe("splitBillTitle", () => {
  it("末尾の短い括弧書きを切り分ける", () => {
    expect(splitBillTitle("令和8年度新宿区一般会計補正予算（第2号）")).toEqual({
      head: "令和8年度新宿区一般会計補正予算",
      tail: "（第2号）",
    });
  });

  it("括弧書きが無ければそのまま", () => {
    expect(splitBillTitle("新宿区区税条例の一部を改正する条例")).toEqual({
      head: "新宿区区税条例の一部を改正する条例",
      tail: "",
    });
  });

  it("途中の括弧書きは切り分けない", () => {
    expect(splitBillTitle("専決処分（第2号）の承認について")).toEqual({
      head: "専決処分（第2号）の承認について",
      tail: "",
    });
  });

  // 長い括弧書きを1つにまとめると、行からはみ出すことがある。
  it("長い括弧書きは切り分けない", () => {
    const title =
      "請願の審査について（区立保育園の民営化計画の見直しを求める請願）";
    expect(splitBillTitle(title)).toEqual({ head: title, tail: "" });
  });

  it("名前全体が括弧書きなら切り分けない", () => {
    expect(splitBillTitle("（第2号）")).toEqual({
      head: "（第2号）",
      tail: "",
    });
  });
});
