import { describe, expect, it } from "vitest";

import { getBillStatusLabel } from "./index";

describe("getBillStatusLabel", () => {
  it("returns '準備中' for preparing", () => {
    expect(getBillStatusLabel("preparing")).toBe("準備中");
  });

  it("returns '提出済み' for introduced", () => {
    expect(getBillStatusLabel("introduced")).toBe("提出済み");
  });

  it("returns '可決' for enacted", () => {
    expect(getBillStatusLabel("enacted")).toBe("可決");
  });

  it("returns '否決' for rejected", () => {
    expect(getBillStatusLabel("rejected")).toBe("否決");
  });

  it.each([
    "HR",
    "HC",
    null,
    undefined,
  ] as const)("in_originating_house は区議会の委員会審査として扱う（%s）", (house) => {
    expect(getBillStatusLabel("in_originating_house", house)).toBe(
      "委員会審査中"
    );
  });

  it.each([
    "HR",
    "HC",
    null,
    undefined,
  ] as const)("in_receiving_house は区議会の本会議として扱う（%s）", (house) => {
    expect(getBillStatusLabel("in_receiving_house", house)).toBe(
      "本会議審議中"
    );
  });

  it("returns the status string as-is for unknown status", () => {
    // biome-ignore lint/suspicious/noExplicitAny: テスト用に未知のステータスを渡す
    expect(getBillStatusLabel("unknown_status" as any)).toBe("unknown_status");
  });
});
