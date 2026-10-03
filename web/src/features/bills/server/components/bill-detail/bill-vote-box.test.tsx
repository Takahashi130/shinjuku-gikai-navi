// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BillVotes } from "../../../shared/utils/parse-bill-votes";
import { BillVoteBox } from "./bill-vote-box";

const faction = (name: string) => ({ name, note: null });
const votes: BillVotes = {
  result: "承認",
  resultNote: "第5号議案",
  hasFactionVotes: true,
  for: [faction("A"), faction("B"), faction("C")],
  against: [faction("D")],
};

describe("BillVoteBox", () => {
  // 存在しない機能を押せそうに見せない（無効表示のボタンも置かない）。
  it("区民投票は準備中と書くだけで、ボタンを置かない", () => {
    render(<BillVoteBox status="enacted" votes={votes} />);

    expect(screen.getByText("準備中")).toBeInTheDocument();
    expect(
      screen.getByText(
        /この議案に誰でも賛成・反対の意思表示ができるようになります（1台につき1票）/
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("議決済みなら議決の語と会派の数を出す", () => {
    const { container } = render(
      <BillVoteBox status="enacted" votes={votes} />
    );

    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(screen.getByText("第5号議案")).toBeInTheDocument();
    expect(container).toHaveTextContent("賛成 3会派・反対 1会派");
    // 数は文字で出しているので、帯は読み上げで同じ数を繰り返さない
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("解説から読めなければステータスの語を出す", () => {
    render(<BillVoteBox status="rejected" votes={null} />);

    expect(screen.getByText("否決")).toBeInTheDocument();
    expect(
      screen.getByText("会派ごとの賛否は掲載していません")
    ).toBeInTheDocument();
  });

  it("審議中は議決のあとに掲載すると書く", () => {
    render(<BillVoteBox status="in_originating_house" votes={null} />);

    expect(
      screen.getByText(
        /審議中です。議決のあと、結果と会派ごとの賛否を掲載します/
      )
    ).toBeInTheDocument();
  });

  // 提出前の議案を「審議中」と書かない。
  it("提出前の議案は提出前と書く", () => {
    render(<BillVoteBox status="preparing" votes={null} />);

    expect(screen.getByText(/議案の提出前です/)).toBeInTheDocument();
    expect(screen.queryByText(/審議中です/)).not.toBeInTheDocument();
  });
});
