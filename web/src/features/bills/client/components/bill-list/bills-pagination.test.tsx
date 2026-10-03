// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getPageInfo } from "../../../shared/utils/pagination";
import {
  billsListPageHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { BillsPagination } from "./bills-pagination";

// 実際の一覧と同じ組み立て方にする（1ページ目は page を出さない、一覧の先頭に着地）。
const hrefFor = (page: number) =>
  billsListPageHref(DEFAULT_BILLS_LIST_PARAMS, page);

function renderPage(totalCount: number, page: number) {
  const pageInfo = getPageInfo(totalCount, page, 30);
  return render(
    <BillsPagination
      pageInfo={pageInfo}
      prevHref={pageInfo.prevPage ? hrefFor(pageInfo.prevPage) : null}
      nextHref={pageInfo.nextPage ? hrefFor(pageInfo.nextPage) : null}
    />
  );
}

describe("BillsPagination", () => {
  it("1ページに収まるときは何も出さない", () => {
    const { container } = renderPage(30, 1);

    expect(container).toBeEmptyDOMElement();
  });

  it("絞り込んだ結果の件数と表示中の範囲を出す", () => {
    renderPage(95, 2);

    expect(screen.getByText("95件中 31〜60件目を表示")).toBeInTheDocument();
  });

  it("最終ページの範囲は件数の端で切れる", () => {
    renderPage(95, 4);

    expect(screen.getByText("95件中 91〜95件目を表示")).toBeInTheDocument();
  });

  it("現在のページと総ページ数を出す", () => {
    renderPage(95, 2);

    expect(
      screen.getByRole("navigation", { name: "ページ送り" })
    ).toHaveTextContent("2 / 4 ページ");
  });

  // 「2 スラッシュ 4」と読まれないよう、読み上げには文で渡す。
  it("読み上げには現在のページを文で渡す", () => {
    renderPage(95, 2);

    expect(screen.getByText("4ページ中 2ページ目")).toHaveClass("sr-only");
    expect(screen.getByText("ページ").closest("[aria-hidden]")).not.toBeNull();
  });

  it("前へ／次へが隣のページへのリンクになる", () => {
    renderPage(95, 2);

    const prev = screen.getByRole("link", { name: "前のページへ" });
    const next = screen.getByRole("link", { name: "次のページへ" });
    // 見た目は短い文言のまま。
    expect(prev).toHaveTextContent("前へ");
    expect(next).toHaveTextContent("次へ");
    // 1ページ目は page を URL に出さない。どちらも一覧の先頭に着地させる。
    expect(prev).toHaveAttribute("href", "/bills#bills-results");
    expect(next).toHaveAttribute("href", "/bills?page=3#bills-results");
  });

  // 端でもボタンを消さない。消すと反対側のボタンの位置がずれる。
  it("1ページ目では前へを押せない", () => {
    renderPage(95, 1);

    expect(screen.queryByRole("link", { name: "前のページへ" })).toBeNull();
    expect(screen.getByRole("button", { name: "前のページへ" })).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "次のページへ" })
    ).toBeInTheDocument();
  });

  it("最終ページでは次へを押せない", () => {
    renderPage(95, 4);

    expect(screen.queryByRole("link", { name: "次のページへ" })).toBeNull();
    expect(screen.getByRole("button", { name: "次のページへ" })).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "前のページへ" })
    ).toBeInTheDocument();
  });
});
