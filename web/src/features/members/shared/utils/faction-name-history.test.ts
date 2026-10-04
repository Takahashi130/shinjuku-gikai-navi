import { describe, expect, it } from "vitest";
import { formerFactionNamesDuring } from "./faction-name-history";

const NAMES = [
  {
    faction_id: "jimin",
    name: "自民・参政クラブ",
    valid_from: "2025-04-10",
    valid_to: null,
  },
  {
    faction_id: "jimin",
    name: "自由民主党新宿区議会議員団",
    valid_from: null,
    valid_to: "2025-04-09",
  },
  {
    faction_id: "komei",
    name: "新宿区議会公明党",
    valid_from: null,
    valid_to: null,
  },
];

describe("formerFactionNamesDuring", () => {
  it("所属していた期間に使われていた、今とは違う会派名を返す", () => {
    expect(
      formerFactionNamesDuring(NAMES, {
        factionId: "jimin",
        currentName: "自民・参政クラブ",
        from: "2019-11-28",
        to: "2026-02-25",
      })
    ).toEqual([{ name: "自由民主党新宿区議会議員団", validTo: "2025-04-09" }]);
  });

  it("名前を変えたあとに入った期間には、前の名前を添えない", () => {
    expect(
      formerFactionNamesDuring(NAMES, {
        factionId: "jimin",
        currentName: "自民・参政クラブ",
        from: "2025-06-11",
        to: "2026-10-04",
      })
    ).toEqual([]);
  });

  it("名前を変えていない会派・ほかの会派の名前は添えない", () => {
    expect(
      formerFactionNamesDuring(NAMES, {
        factionId: "komei",
        currentName: "新宿区議会公明党",
        from: "2019-06-13",
        to: "2026-10-04",
      })
    ).toEqual([]);
  });
});
