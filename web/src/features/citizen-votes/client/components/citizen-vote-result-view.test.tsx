// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  createMainContainer,
  simulateRubyful,
} from "@/lib/rubyful/simulate-rubyful";
import type { CitizenVoteSummary, PollState } from "../../shared/types";
import { describeCitizenVoteResult } from "../../shared/utils/describe-citizen-vote-result";
import { describePollStatus } from "../../shared/utils/describe-poll-status";
import { CitizenVoteResultView } from "./citizen-vote-result-view";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const NOW = new Date("2026-10-04T01:00:00Z");

type ViewOptions = {
  voteHref?: string;
  councilStatus?: "enacted" | "rejected";
  votingEnabled?: boolean;
  billPublished?: boolean;
  showUpdateNote?: boolean;
};

function viewElement(
  pollState: PollState,
  summary: CitizenVoteSummary | null,
  options: ViewOptions = {}
) {
  return (
    <CitizenVoteResultView
      model={describeCitizenVoteResult({
        pollState,
        summary,
        councilStatus: options.councilStatus ?? "enacted",
        billSlug: "r8-teirei-3-gian-63",
        votingEnabled: options.votingEnabled ?? true,
        billPublished: options.billPublished ?? true,
      })}
      status={describePollStatus(pollState, NOW)}
      voteHref={options.voteHref}
      showUpdateNote={options.showUpdateNote}
    />
  );
}

function renderView(
  pollState: PollState,
  summary: CitizenVoteSummary | null,
  options: ViewOptions = {}
) {
  return render(viewElement(pollState, summary, options));
}

const SUMMARY: CitizenVoteSummary = {
  beforeClose: { for: 18, against: 44, total: 62 },
  afterClose: { for: 3, against: 5, total: 8 },
  verifiedBeforeClose: { for: 0, against: 0, total: 0 },
};

describe("CitizenVoteResultView", () => {
  // 先に結果を見て流されないよう、締切前で投票していなければ数字を出さない
  it("結果を見せない間は票数も割合も出さず、投票へのリンクを出す", () => {
    const { container } = renderView(
      { state: "open", closesAt: CLOSES_AT },
      null,
      { voteHref: "#cast-vote" }
    );

    expect(container).not.toHaveTextContent("%");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("投票受付中")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /投票して結果を見る/ })
    ).toHaveAttribute("href", "#cast-vote");
  });

  it("ほかのページからは、議案ページの投票の帯へ送る", () => {
    renderView(
      {
        state: "open_after_close",
        closesAt: CLOSES_AT,
        openedAfterClose: false,
      },
      {
        ...SUMMARY,
        beforeClose: { for: 0, against: 0, total: 0 },
        afterClose: { for: 0, against: 0, total: 0 },
      },
      { voteHref: "/bills/bill-1#cast-vote" }
    );

    expect(
      screen.getByText(/まだ区民投票の票がありません/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /賛成・反対を投じる/ })
    ).toHaveAttribute("href", "/bills/bill-1#cast-vote");
  });

  it("採決後は、採決前と採決後の票を分け、議会とのズレを示す", () => {
    renderView(
      {
        state: "open_after_close",
        closesAt: CLOSES_AT,
        openedAfterClose: false,
      },
      SUMMARY
    );

    // 見出しのピルと、議会との比較の両方に出る
    expect(screen.getAllByText("反対多数")).toHaveLength(2);
    expect(
      screen.getByRole("img", { name: /^採決前の票：賛成 29%（18票）/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^採決後の票：賛成 38%（3票）/ })
    ).toBeInTheDocument();
    expect(screen.getByText("議会と区民の判断が分かれた")).toBeInTheDocument();
  });

  it("人事案件は対象外と書き、数字もリンクも出さない", () => {
    const { container } = renderView(
      { state: "not_applicable", reason: "personnel" },
      null
    );

    expect(screen.getByText("対象外")).toBeInTheDocument();
    expect(container).toHaveTextContent("人事案件");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("区民の面は h3（議案ページの「区民の意思 vs 議会の議決」の中の面）", () => {
    renderView({ state: "open", closesAt: CLOSES_AT }, null);
    expect(
      screen.getByRole("heading", { level: 3, name: /区民の意思（区民投票）/ })
    ).toBeInTheDocument();
  });

  // 緊急停止（秘密鍵を外す）中は、帯でも投票できない。受付中と書かない
  it("受付を止めているときは「受付停止中」とし、締切もリンクも出さない", () => {
    renderView({ state: "open", closesAt: CLOSES_AT }, null, {
      votingEnabled: false,
    });

    expect(screen.getByText("受付停止中")).toBeInTheDocument();
    expect(screen.queryByText("投票受付中")).not.toBeInTheDocument();
    expect(screen.queryByText("あと11日")).not.toBeInTheDocument();
    expect(screen.getByText(/投票の受付を停止しています/)).toBeInTheDocument();
    expect(
      screen.queryByText(/ほかの人の結果は、投票したあとに表示します/)
    ).not.toBeInTheDocument();
  });

  it("公開前の議案（プレビュー）は「公開前」とし、受付中と書かない", () => {
    renderView({ state: "open", closesAt: CLOSES_AT }, null, {
      billPublished: false,
    });

    expect(screen.getByText("公開前")).toBeInTheDocument();
    expect(screen.queryByText("投票受付中")).not.toBeInTheDocument();
  });

  // 1票でも「賛成 100%」を大きく出すと、判定なしでも結果のように読める
  it("30票に届くまでは、割合を大きな数字で出さない", () => {
    const { container } = renderView(
      { state: "open", closesAt: CLOSES_AT },
      {
        ...SUMMARY,
        beforeClose: { for: 1, against: 0, total: 1 },
        afterClose: { for: 0, against: 0, total: 0 },
      }
    );

    expect(
      screen.getByText("判定なし", { selector: "span[data-slot]" })
    ).toBeInTheDocument();
    expect(container.querySelector(".text-2xl")).toBeNull();
    // 横棒と小さな票数は出す
    expect(
      screen.getByRole("img", { name: /^これまでの票：賛成 100%（1票）/ })
    ).toBeInTheDocument();
  });

  it("採決のあとに受付を始めた回は、採決前の欄と判定を出さない", () => {
    renderView(
      {
        state: "open_after_close",
        closesAt: CLOSES_AT,
        openedAfterClose: true,
      },
      {
        ...SUMMARY,
        beforeClose: { for: 0, against: 0, total: 0 },
        afterClose: { for: 4, against: 1, total: 5 },
      }
    );

    expect(
      screen.getByText(/採決のあとに受付を始めたため、採決前の票はありません/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/採決前の票/, { selector: "span" })).toBeNull();
    expect(screen.queryByText("判定なし")).not.toBeInTheDocument();
    expect(
      screen.getByText("採決後の票", { selector: "span[data-slot]" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /^採決後の票：賛成 80%（4票）/ })
    ).toBeInTheDocument();
  });

  /*
    ふりがな表示（Rubyful）が ON のとき、main の中の p・span などの中身が
    差し替えられ、React が持つ子ノードが画面から外れる。そのあとに投票・
    取り消しで表示が変わっても、落ちず（NotFoundError: removeChild）、新しい
    値が出ること。
  */
  describe("ふりがな表示（Rubyful）が中身を差し替えたあと", () => {
    const OPEN: PollState = { state: "open", closesAt: CLOSES_AT };
    const VOTED: CitizenVoteSummary = {
      ...SUMMARY,
      beforeClose: { for: 20, against: 12, total: 32 },
      afterClose: { for: 0, against: 0, total: 0 },
    };

    it("投票済みで開き、取り消しても落ちない", () => {
      const { rerender } = render(
        viewElement(OPEN, VOTED, { showUpdateNote: true }),
        { container: createMainContainer() }
      );
      simulateRubyful();

      expect(() =>
        rerender(
          viewElement(OPEN, null, {
            showUpdateNote: true,
            voteHref: "#cast-vote",
          })
        )
      ).not.toThrow();
      expect(screen.getByText("投票受付中")).toBeInTheDocument();
      expect(screen.queryByText(/集計は1分ごとに更新されます/)).toBeNull();
      expect(screen.getByText(/投票して結果を見る/)).toBeInTheDocument();
    });

    it("投票 → 差し替え → 取り消し・選び直しでも落ちず、新しい値を出す", () => {
      const { rerender, container } = render(
        viewElement(OPEN, null, {
          showUpdateNote: true,
          voteHref: "#cast-vote",
        }),
        { container: createMainContainer() }
      );
      simulateRubyful();
      rerender(viewElement(OPEN, VOTED, { showUpdateNote: true }));
      simulateRubyful();

      // 選び直し（賛成 → 反対）で数が変わる
      expect(() =>
        rerender(
          viewElement(
            OPEN,
            { ...VOTED, beforeClose: { for: 19, against: 13, total: 32 } },
            { showUpdateNote: true }
          )
        )
      ).not.toThrow();
      expect(container).toHaveTextContent("賛成 59%");
      expect(container).toHaveTextContent("（13票）");
      simulateRubyful();

      expect(() =>
        rerender(
          viewElement(OPEN, null, {
            showUpdateNote: true,
            voteHref: "#cast-vote",
          })
        )
      ).not.toThrow();
      expect(screen.getByText("投票受付中")).toBeInTheDocument();
      expect(container).not.toHaveTextContent("%");
    });
  });
});
