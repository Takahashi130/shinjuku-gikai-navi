import { describe, expect, it } from "vitest";
import { getCardStatusLabel, getStatusVariant } from "./bill-status";

describe("getCardStatusLabel", () => {
  it.each([
    ["introduced", "審議中"],
    ["in_originating_house", "審議中"],
    ["in_receiving_house", "審議中"],
  ] as const)("審議中ステータス %s → %s", (status, expected) => {
    expect(getCardStatusLabel(status)).toBe(expected);
  });

  it("enacted → 可決", () => {
    expect(getCardStatusLabel("enacted")).toBe("可決");
  });

  it("rejected → 否決", () => {
    expect(getCardStatusLabel("rejected")).toBe("否決");
  });

  it("preparing → 議案提出前", () => {
    expect(getCardStatusLabel("preparing")).toBe("議案提出前");
  });
});

describe("getStatusVariant", () => {
  it.each([
    ["introduced", "status-deliberating"],
    ["in_originating_house", "status-deliberating"],
    ["in_receiving_house", "status-deliberating"],
  ] as const)("審議中ステータス %s → %s", (status, expected) => {
    expect(getStatusVariant(status)).toBe(expected);
  });

  it("enacted → status-enacted", () => {
    expect(getStatusVariant("enacted")).toBe("status-enacted");
  });

  it("rejected → status-rejected", () => {
    expect(getStatusVariant("rejected")).toBe("status-rejected");
  });

  it("preparing → status-pending", () => {
    expect(getStatusVariant("preparing")).toBe("status-pending");
  });
});
