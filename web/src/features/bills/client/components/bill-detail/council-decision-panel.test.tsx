// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BillVotes } from "../../../shared/utils/parse-bill-votes";
import { CouncilDecisionPanel } from "./council-decision-panel";

const faction = (name: string, note: string | null = null) => ({ name, note });
const votes: BillVotes = {
  result: "承認",
  resultNote: "承認第1号",
  hasFactionVotes: true,
  for: [faction("A"), faction("B", "1人反対"), faction("C")],
  against: [faction("D")],
};

describe("CouncilDecisionPanel", () => {
  it("議決済みなら議決の語と会派の数を出す", () => {
    const { container } = render(
      <CouncilDecisionPanel status="enacted" votes={votes} />
    );

    expect(screen.getByText("承認")).toBeInTheDocument();
    expect(container).toHaveTextContent("賛成 3会派");
    expect(container).toHaveTextContent("反対 1会派");
    // 数は文字で出しているので、帯は読み上げで同じ数を繰り返さない
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(
      screen.getByText(/会派の数で数えています（議員の人数ではありません）/)
    ).toBeInTheDocument();
  });

  it("議案ページでは会派の名前まで並べ、トップでは数だけにする", () => {
    const { rerender } = render(
      <CouncilDecisionPanel status="enacted" votes={votes} />
    );
    expect(screen.queryByText(/A、B/)).not.toBeInTheDocument();

    rerender(
      <CouncilDecisionPanel status="enacted" votes={votes} showFactions />
    );
    expect(screen.getByText("A、B（1人反対）、C")).toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  // 今ある会派だけを議員カルテ（会派で絞った議員の一覧）へのリンクにする。
  it("会派名から、その会派の議員の一覧へ行ける", () => {
    const { container } = render(
      <CouncilDecisionPanel
        status="enacted"
        votes={votes}
        showFactions
        memberLinks={{ A: "party-a", D: "party-d" }}
      />
    );

    // 古い議案では採決のときの議員とは限らないので「今の議員」と読み上げる
    expect(
      screen.getByRole("link", { name: "Aの今の議員（議員カルテ）" })
    ).toHaveAttribute("href", "/members?faction=party-a");
    expect(
      screen.getByRole("link", { name: "Dの今の議員（議員カルテ）" })
    ).toHaveAttribute("href", "/members?faction=party-d");
    // 引けなかった会派は文字のまま。並びと補足は変えない
    expect(screen.queryByRole("link", { name: /^B/ })).not.toBeInTheDocument();
    expect(container).toHaveTextContent("A、B（1人反対）、C");
    expect(
      screen.getByText(/会派名を押すと、その会派の今の議員の一覧/)
    ).toBeInTheDocument();
  });

  it("リンクにできる会派が無ければ、リンクの案内を出さない", () => {
    render(
      <CouncilDecisionPanel
        status="enacted"
        votes={votes}
        showFactions
        memberLinks={{}}
      />
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/会派名を押すと/)).not.toBeInTheDocument();
    expect(screen.getByText("A、B（1人反対）、C")).toBeInTheDocument();
  });

  it("解説から会派の賛否が読めなければ、掲載していないと書く", () => {
    render(<CouncilDecisionPanel status="rejected" votes={null} />);

    expect(screen.getByText("否決")).toBeInTheDocument();
    expect(
      screen.getByText("否決されました。会派ごとの賛否は掲載していません。")
    ).toBeInTheDocument();
  });

  it("審議中は議決のあとに掲載すると書き、会期の閉会予定を添える", () => {
    render(
      <CouncilDecisionPanel
        status="in_originating_house"
        votes={null}
        pendingNote="令和8年第3回定例会は10月15日に閉会予定です。"
      />
    );

    expect(screen.getByText("審議中")).toBeInTheDocument();
    expect(
      screen.getByText(
        "審議中です。議決のあと、結果と会派ごとの賛否を掲載します。令和8年第3回定例会は10月15日に閉会予定です。"
      )
    ).toBeInTheDocument();
  });

  // 提出前の議案を「審議中」と書かない。
  it("提出前の議案は提出前と書く", () => {
    render(<CouncilDecisionPanel status="preparing" votes={null} />);

    expect(screen.getByText(/議案の提出前です/)).toBeInTheDocument();
    expect(screen.queryByText(/審議中です/)).not.toBeInTheDocument();
  });
});
