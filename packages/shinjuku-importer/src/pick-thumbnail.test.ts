import { describe, expect, it } from "vitest";
import { pickTheme, pickThumbnail } from "./pick-thumbnail";

describe("pickThumbnail", () => {
  it.each([
    ["令和8年度新宿区一般会計補正予算（第2号）", "mayor", "budget"],
    ["落合中央公園野球場人工芝等改修工事請負契約", "mayor", "construction"],
    ["新宿区家庭的保育事業等の設備及び運営に関する基準を定める条例の一部を改正する条例", "mayor", "childcare"],
    ["新宿区立学校における学用品の給付に関する条例", "member", "education"],
    ["新宿区保健事業の利用に係る使用料等を定める条例の一部を改正する条例", "mayor", "welfare"],
    ["災害に際し応急措置の業務等に従事した者の損害補償に関する条例の一部を改正する条例", "mayor", "safety"],
    ["新宿区空き缶等の散乱及び路上喫煙による被害の防止に関する条例の一部を改正する条例", "mayor", "environment"],
    ["新宿区地区計画の区域内における建築物の制限に関する条例の一部を改正する条例", "mayor", "town"],
    ["ドナーミルクの利用拡大を求める意見書", "member", "opinion"],
    ["新宿区特別区税条例の一部を改正する条例", "mayor", "ordinance"],
  ] as const)("%s → %s", (name, kind, slug) => {
    expect(pickThumbnail(name, kind)).toBe(`/img/thumbnails/${slug}.png`);
  });
});

describe("pickTheme", () => {
  it("テーマの表示名を返す", () => {
    expect(pickTheme("令和5年度新宿区一般会計歳入歳出決算", "accounts").label).toBe("予算・お金");
    expect(pickTheme("ドナーミルクの利用拡大を求める意見書", "member").label).toBe("意見書・決議");
  });
});
