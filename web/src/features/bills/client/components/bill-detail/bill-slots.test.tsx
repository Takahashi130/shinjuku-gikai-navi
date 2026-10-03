// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  BillCommentsSlot,
  BillExplainerSlot,
  CastVoteSlot,
  CitizenVoteSlot,
} from "./bill-slots";

describe("議案ページの差し込み口", () => {
  // まだ無い機能を押せそうに見せない（無効表示のボタンやリンクも置かない）。
  it("何も渡さなければ準備中の説明だけを出し、ボタンもリンクも置かない", () => {
    render(
      <>
        <BillExplainerSlot />
        <CitizenVoteSlot />
        <CastVoteSlot />
        <BillCommentsSlot />
      </>
    );

    expect(screen.getAllByText("準備中")).toHaveLength(4);
    expect(screen.getByText("事前解説")).toBeInTheDocument();
    expect(screen.getByText("区民の意思（区民投票）")).toBeInTheDocument();
    expect(screen.getByText("あなたの意思を投じる")).toBeInTheDocument();
    expect(screen.getByText("区民のコメント")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // 投票の帯とコメント欄は独立した節。比較（h2）の下にあるように読ませない。
  it("事前解説・投票の帯・コメント欄は h2、区民投票の面は h3 にする", () => {
    render(
      <>
        <BillExplainerSlot />
        <CitizenVoteSlot />
        <CastVoteSlot />
        <BillCommentsSlot />
      </>
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /事前解説/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /あなたの意思を投じる/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /区民のコメント/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /区民の意思（区民投票）/ })
    ).toBeInTheDocument();
  });

  // まだ無い区民投票の決まり（1人何票かなど）を、準備中の説明で言い切らない。
  it("投票の帯は、まだ決まっていない投票の決まりを書かない", () => {
    const { container } = render(<CastVoteSlot />);

    expect(container).not.toHaveTextContent(/1台|1人|ブラウザ/);
  });

  // 区民投票はまだ無いので、0% に見える帯や票数を出さない。
  it("区民投票の面は数字を出さない", () => {
    const { container } = render(<CitizenVoteSlot />);

    expect(container).not.toHaveTextContent(/[0-9０-９]+\s*(票|%)/);
  });

  it("本物の機能を渡すと準備中の説明と差し替わる", () => {
    render(
      <CastVoteSlot>
        <p>投票フォーム</p>
      </CastVoteSlot>
    );

    expect(screen.getByText("投票フォーム")).toBeInTheDocument();
    expect(screen.queryByText("準備中")).not.toBeInTheDocument();
  });
});
