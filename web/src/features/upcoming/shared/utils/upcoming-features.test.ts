import { describe, expect, it } from "vitest";
import {
  isUpcomingFeatureId,
  UPCOMING_FEATURE_IDS,
  UPCOMING_FEATURES,
  upcomingFeatureHref,
} from "./upcoming-features";

describe("isUpcomingFeatureId", () => {
  it("準備中の機能の id だけを受け付ける", () => {
    expect(isUpcomingFeatureId("live")).toBe(true);
    expect(isUpcomingFeatureId("impact")).toBe(true);
    // 議員カルテは本物のページ（/members）ができたので、説明ページは無い
    expect(isUpcomingFeatureId("members")).toBe(false);
    expect(isUpcomingFeatureId("bills")).toBe(false);
    expect(isUpcomingFeatureId(undefined)).toBe(false);
  });
});

describe("UPCOMING_FEATURES", () => {
  it("id ごとに説明があり、id が食い違わない", () => {
    for (const id of UPCOMING_FEATURE_IDS) {
      expect(UPCOMING_FEATURES[id].id).toBe(id);
      expect(UPCOMING_FEATURES[id].points.length).toBeGreaterThan(0);
    }
  });

  // まだ無い機能のページなので、存在しないページへは送らない。内部リンクは議案一覧だけ。
  it("内部リンクは議案一覧にだけ送る", () => {
    const internal = UPCOMING_FEATURE_IDS.flatMap((id) =>
      UPCOMING_FEATURES[id].links.filter((link) => link.kind === "internal")
    );
    expect(internal.length).toBeGreaterThan(0);
    for (const link of internal) {
      expect(link.href.startsWith("/bills")).toBe(true);
    }
  });

  it("外部リンクは新宿区のサイトにだけ送る", () => {
    const external = UPCOMING_FEATURE_IDS.flatMap((id) =>
      UPCOMING_FEATURES[id].links.filter((link) => link.kind === "external")
    );
    for (const link of external) {
      expect(link.href).toMatch(/^https:\/\/www\.city\.shinjuku\.lg\.jp\//);
    }
  });

  it("議会LIVE中継には区の中継ページを添える", () => {
    expect(UPCOMING_FEATURES.live.links).toContainEqual(
      expect.objectContaining({
        kind: "external",
        href: "https://www.city.shinjuku.lg.jp/kusei/file08_00023.html",
      })
    );
  });
});

describe("upcomingFeatureHref", () => {
  it("説明ページの URL を作る", () => {
    expect(upcomingFeatureHref("impact")).toBe("/upcoming/impact");
  });
});
