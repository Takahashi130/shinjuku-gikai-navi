import { describe, expect, it } from "vitest";
import {
  BILLS_RESULTS_ID,
  type BillsListParams,
  billsListHrefFromFormEntries,
  billsListPageHref,
  billsSearchHref,
  buildBillsListQuery,
  buildSearchHiddenFields,
  DEFAULT_BILLS_LIST_PARAMS,
  parseBillsListParams,
} from "./parse-bills-list-params";

const defaults: BillsListParams = {
  query: "",
  status: "all",
  tagId: null,
  sort: "new",
  interviewOnly: false,
  splitOnly: false,
  page: 1,
};

describe("parseBillsListParams", () => {
  it("何も無ければ既定に倒す", () => {
    expect(parseBillsListParams({})).toEqual(defaults);
  });

  it("すべてのパラメータを読む", () => {
    expect(
      parseBillsListParams({
        q: "ガソリン",
        status: "enacted",
        tag: "zeikin",
        sort: "old",
        interview: "1",
        split: "1",
        page: "3",
      })
    ).toEqual({
      query: "ガソリン",
      status: "enacted",
      tagId: "zeikin",
      sort: "old",
      interviewOnly: true,
      splitOnly: true,
      page: 3,
    });
  });

  // URL 直打ちでページを壊せないようにする。
  it("不正なステータスと並び順は既定に倒す", () => {
    const parsed = parseBillsListParams({
      status: "introduced",
      sort: "popular",
    });
    expect(parsed.status).toBe("all");
    expect(parsed.sort).toBe("new");
  });

  it("配列で来たら先頭を採る", () => {
    expect(
      parseBillsListParams({ q: ["a", "b"], status: ["enacted", "all"] })
    ).toMatchObject({ query: "a", status: "enacted" });
  });

  it("前後の空白を落とす", () => {
    expect(parseBillsListParams({ q: "  ガソリン  " }).query).toBe("ガソリン");
  });

  it("空文字のタグは「すべて」扱いにする", () => {
    expect(parseBillsListParams({ tag: "   " }).tagId).toBeNull();
  });

  it("split は 1 のときだけ真", () => {
    expect(parseBillsListParams({ split: "1" }).splitOnly).toBe(true);
    expect(parseBillsListParams({ split: "true" }).splitOnly).toBe(false);
    expect(parseBillsListParams({}).splitOnly).toBe(false);
  });

  it("split=1 は既定では URL に出さず、立てたときだけ出す", () => {
    expect(buildBillsListQuery(defaults)).toBe("");
    expect(buildBillsListQuery(defaults, { splitOnly: true })).toBe("?split=1");
  });

  it("interview は 1 のときだけ真", () => {
    expect(parseBillsListParams({ interview: "1" }).interviewOnly).toBe(true);
    expect(parseBillsListParams({ interview: "true" }).interviewOnly).toBe(
      false
    );
    expect(parseBillsListParams({ interview: "0" }).interviewOnly).toBe(false);
  });

  // 最終ページを超える番号は件数が分かるまで丸められないので、ここでは
  // 1未満と数字以外だけを1ページ目に倒す。
  it("page は正の整数だけ読み、それ以外は1ページ目にする", () => {
    expect(parseBillsListParams({ page: "2" }).page).toBe(2);
    expect(parseBillsListParams({ page: ["4", "5"] }).page).toBe(4);
    expect(parseBillsListParams({ page: "0" }).page).toBe(1);
    expect(parseBillsListParams({ page: "-1" }).page).toBe(1);
    expect(parseBillsListParams({ page: "abc" }).page).toBe(1);
    expect(parseBillsListParams({ page: "9999" }).page).toBe(9999);
  });
});

describe("buildBillsListQuery", () => {
  it("既定だけならクエリを付けない", () => {
    expect(buildBillsListQuery(defaults, {})).toBe("");
  });

  it("既定値はURLに出さない", () => {
    expect(buildBillsListQuery(defaults, { status: "all", sort: "new" })).toBe(
      ""
    );
  });

  it("差し替えた値だけ載せる", () => {
    expect(buildBillsListQuery(defaults, { status: "enacted" })).toBe(
      "?status=enacted"
    );
  });

  it("他の絞り込みを保ったまま1つだけ差し替える", () => {
    const current: BillsListParams = {
      ...defaults,
      query: "税",
      tagId: "zeikin",
    };

    expect(buildBillsListQuery(current, { status: "rejected" })).toBe(
      "?q=%E7%A8%8E&status=rejected&tag=zeikin"
    );
  });

  it("インタビュー絞り込みは 1 で載せる", () => {
    expect(buildBillsListQuery(defaults, { interviewOnly: true })).toBe(
      "?interview=1"
    );
  });

  it("タグを外せる", () => {
    const current: BillsListParams = { ...defaults, tagId: "zeikin" };
    expect(buildBillsListQuery(current, { tagId: null })).toBe("");
  });

  it("1ページ目は URL に出さない", () => {
    expect(buildBillsListQuery(defaults, { page: 1 })).toBe("");
  });

  it("ページを指定すると他の絞り込みと一緒に載せる", () => {
    const current: BillsListParams = { ...defaults, status: "enacted" };
    expect(buildBillsListQuery(current, { page: 2 })).toBe(
      "?status=enacted&page=2"
    );
  });

  // 絞り込みを変えると件数も順序も変わるので、元のページに留めない。
  it("ページ以外を差し替えると1ページ目に戻る", () => {
    const current: BillsListParams = {
      ...defaults,
      query: "税",
      page: 3,
    };

    expect(buildBillsListQuery(current, { status: "enacted" })).toBe(
      "?q=%E7%A8%8E&status=enacted"
    );
    expect(buildBillsListQuery(current, { tagId: "zeikin" })).toBe(
      "?q=%E7%A8%8E&tag=zeikin"
    );
    expect(buildBillsListQuery(current, { sort: "old" })).toBe(
      "?q=%E7%A8%8E&sort=old"
    );
    expect(buildBillsListQuery(current, { query: "" })).toBe("");
    expect(buildBillsListQuery(current, { interviewOnly: true })).toBe(
      "?q=%E7%A8%8E&interview=1"
    );
  });

  it("parse と往復して同じ状態に戻る", () => {
    const current: BillsListParams = {
      query: "ガソリン",
      status: "enacted",
      tagId: "zeikin",
      sort: "old",
      interviewOnly: true,
      splitOnly: true,
      page: 3,
    };
    const queryString = buildBillsListQuery(current, { page: current.page });
    const parsed = Object.fromEntries(
      new URLSearchParams(queryString.slice(1))
    );

    expect(parseBillsListParams(parsed)).toEqual(current);
  });
});

describe("billsListPageHref", () => {
  // ページ送りは一覧の下にあるので、ページの最上部ではなく一覧の先頭に着地させる。
  it("一覧の先頭を指すハッシュを付ける", () => {
    expect(billsListPageHref(DEFAULT_BILLS_LIST_PARAMS, 2)).toBe(
      `/bills?page=2#${BILLS_RESULTS_ID}`
    );
  });

  it("1ページ目は page を URL に出さない", () => {
    expect(billsListPageHref({ ...defaults, page: 2 }, 1)).toBe(
      "/bills#bills-results"
    );
  });

  it("絞り込みと並び替えを引き継ぐ", () => {
    const current: BillsListParams = {
      ...defaults,
      query: "税",
      status: "enacted",
      sort: "old",
      page: 2,
    };

    expect(billsListPageHref(current, 3)).toBe(
      "/bills?q=%E7%A8%8E&status=enacted&sort=old&page=3#bills-results"
    );
  });
});

describe("billsSearchHref", () => {
  it("一覧の検索欄へ送る", () => {
    expect(billsSearchHref()).toBe("/bills#bills-search");
  });
});

describe("buildSearchHiddenFields", () => {
  it("絞り込みがなければ何も送らない", () => {
    expect(buildSearchHiddenFields(DEFAULT_BILLS_LIST_PARAMS)).toEqual([]);
  });

  it("いまの絞り込みを引き継ぎ、検索語・テーマ・並び替えはフォームの欄に任せる", () => {
    expect(
      buildSearchHiddenFields({
        ...defaults,
        query: "ガソリン",
        status: "enacted",
        tagId: "budget",
        sort: "old",
        interviewOnly: true,
        splitOnly: true,
      })
    ).toEqual([
      ["status", "enacted"],
      ["interview", "1"],
      ["split", "1"],
    ]);
  });

  // 検索し直したら件数も並びも変わるので、元のページ番号に留まっても意味がない。
  it("ページ番号は引き継がない", () => {
    expect(buildSearchHiddenFields({ ...defaults, page: 3 })).toEqual([]);
  });

  // フォームの選択欄と同じ名前を隠しフィールドにも置くと、先に来る古い値が使われる。
  it("テーマと並び替えは隠しフィールドに入れない", () => {
    expect(
      buildSearchHiddenFields({ ...defaults, tagId: "budget", sort: "old" })
    ).toEqual([]);
  });
});

describe("billsListHrefFromFormEntries", () => {
  it("フォームの送信内容から一覧の URL を作り、空の値や既定値は出さない", () => {
    expect(
      billsListHrefFromFormEntries([
        ["q", ""],
        ["status", "enacted"],
        ["tag", ""],
        ["sort", "new"],
      ])
    ).toBe("/bills?status=enacted");
  });

  it("検索語・テーマ・並び替えと隠しフィールドの条件を合わせる", () => {
    expect(
      billsListHrefFromFormEntries([
        ["q", " ガソリン "],
        ["split", "1"],
        ["tag", "budget"],
        ["sort", "old"],
      ])
    ).toBe(
      `/bills?q=${encodeURIComponent("ガソリン")}&tag=budget&sort=old&split=1`
    );
  });

  it("同じ名前が2つあれば先のものを使い、文字列でない値は無視する", () => {
    expect(
      billsListHrefFromFormEntries([
        ["sort", "old"],
        ["sort", "new"],
        ["tag", { name: "file" }],
      ])
    ).toBe("/bills?sort=old");
  });

  // 検索し直したら件数も並びも変わるので、1ページ目に戻す。
  it("ページ番号は送られてきても1ページ目に戻す", () => {
    expect(billsListHrefFromFormEntries([["page", "3"]])).toBe("/bills");
  });

  it("不正な値は既定に倒す", () => {
    expect(
      billsListHrefFromFormEntries([
        ["status", "unknown"],
        ["sort", "random"],
      ])
    ).toBe("/bills");
  });
});
