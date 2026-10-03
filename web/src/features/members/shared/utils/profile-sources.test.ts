import { describe, expect, it } from "vitest";
import { buildProfileSources } from "./profile-sources";

const MEMBERS = "https://www.city.shinjuku.lg.jp/kusei/gikai01_000112.html";
const FACTIONS = "https://www.city.shinjuku.lg.jp/kusei/file08_00003.html";
const COMMITTEES = "https://www.city.shinjuku.lg.jp/kusei/file08_01_00013.html";
const EXPENSES = "https://www.city.shinjuku.lg.jp/kusei/file08_00021.html";

describe("buildProfileSources", () => {
  it("議員名簿・会派構成・委員会・政務活動費のページを、同じ URL は1つにして並べる", () => {
    expect(
      buildProfileSources({
        memberSourceUrl: MEMBERS,
        factionSourceUrl: FACTIONS,
        positions: [
          { body_kind: "standing_committee", source_url: COMMITTEES },
          { body_kind: "special_committee", source_url: COMMITTEES },
          { body_kind: "faction", source_url: FACTIONS },
        ],
        expenses: [{ source_url: EXPENSES }, { source_url: EXPENSES }],
      })
    ).toEqual([
      { label: "議員名簿", url: MEMBERS },
      { label: "会派構成", url: FACTIONS },
      { label: "委員会の委員名簿", url: COMMITTEES },
      { label: "政務活動費", url: EXPENSES },
    ]);
  });

  it("会派が無ければ会派構成を出さない", () => {
    expect(
      buildProfileSources({
        memberSourceUrl: MEMBERS,
        factionSourceUrl: null,
        positions: [],
        expenses: [],
      })
    ).toEqual([{ label: "議員名簿", url: MEMBERS }]);
  });
});
