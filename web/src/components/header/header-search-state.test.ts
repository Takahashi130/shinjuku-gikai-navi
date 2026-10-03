import { describe, expect, it } from "vitest";
import { getHeaderSearchState } from "./header-search-state";

describe("getHeaderSearchState", () => {
  it("議案一覧以外のページでは空のフォームにする", () => {
    expect(getHeaderSearchState("/", { q: "税" })).toEqual({
      query: "",
      hiddenFields: [],
    });
    expect(getHeaderSearchState("/bills/abc", {})).toEqual({
      query: "",
      hiddenFields: [],
    });
  });

  it("議案一覧では今の検索語を入れ、絞り込みを引き継ぐ", () => {
    expect(
      getHeaderSearchState("/bills", {
        q: "ガソリン",
        status: "enacted",
        tag: "budget",
        split: "1",
      })
    ).toEqual({
      query: "ガソリン",
      hiddenFields: [
        ["status", "enacted"],
        ["tag", "budget"],
        ["split", "1"],
      ],
    });
  });

  // 検索し直したら件数も並びも変わるので、元のページ番号に留まっても意味がない。
  it("ページ番号は引き継がない", () => {
    expect(getHeaderSearchState("/bills", { page: "3" }).hiddenFields).toEqual(
      []
    );
  });

  it("不正な値は既定に倒して送らない", () => {
    expect(
      getHeaderSearchState("/bills", { status: "unknown", sort: "x" })
        .hiddenFields
    ).toEqual([]);
  });
});
