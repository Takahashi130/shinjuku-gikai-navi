// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createMainContainer,
  simulateRubyful,
} from "@/lib/rubyful/simulate-rubyful";
import type { PollState } from "../../shared/types";
import { describePollStatus } from "../../shared/utils/describe-poll-status";
import {
  CastVoteBandView,
  type CastVoteBandViewProps,
} from "./cast-vote-band-view";

const CLOSES_AT = "2026-10-15T05:00:00.000Z";
const NOW = new Date("2026-10-04T01:00:00Z");
const OPEN: PollState = { state: "open", closesAt: CLOSES_AT };
const AFTER: PollState = {
  state: "open_after_close",
  closesAt: CLOSES_AT,
  openedAfterClose: false,
};

function bandProps(
  overrides: Partial<CastVoteBandViewProps> = {}
): CastVoteBandViewProps {
  const pollState = overrides.pollState ?? OPEN;
  return {
    pollState,
    status: describePollStatus(pollState, NOW),
    billPublished: true,
    votingEnabled: true,
    myVote: null,
    pending: null,
    error: null,
    onCast: vi.fn(),
    onWithdraw: vi.fn(),
    ...overrides,
  };
}

function renderBand(overrides: Partial<CastVoteBandViewProps> = {}) {
  const props = bandProps(overrides);
  render(<CastVoteBandView {...props} />);
  return props;
}

// 初めのテストは部品の読み込みを含むので、まとめて流すと 5 秒を超えることがある
describe("CastVoteBandView", { timeout: 20_000 }, () => {
  it("受付中は賛成・反対のボタンと、締切までの日数と、参考値の注記を出す", () => {
    const props = renderBand();

    expect(
      screen.getByRole("heading", { level: 2, name: "あなたの意思を投じる" })
    ).toBeInTheDocument();
    expect(screen.getByText("あと11日")).toBeInTheDocument();
    expect(screen.getAllByText(/参考値・区民確認なし/).length).toBeGreaterThan(
      0
    );

    fireEvent.click(screen.getByRole("button", { name: /反対/ }));
    expect(props.onCast).toHaveBeenCalledWith("against");
  });

  it("本人の票を選択中として示し、取り消しは確かめてから行う", () => {
    const props = renderBand({
      myVote: { choice: "for", castBeforeClose: true },
    });

    expect(screen.getByRole("button", { name: /^賛成/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: /^反対/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "投票を取り消す" }));
    expect(props.onWithdraw).not.toHaveBeenCalled();
    expect(
      screen.getByText(/取り消したあとも、もう一度投票できます/)
    ).toBeInTheDocument();
    // 確かめる欄の「取り消す」へフォーカスを移す
    expect(screen.getByRole("button", { name: "取り消す" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "取り消す" }));
    expect(props.onWithdraw).toHaveBeenCalledTimes(1);
  });

  it("取り消しの確かめを「やめる」で閉じられる", () => {
    const props = renderBand({
      myVote: { choice: "for", castBeforeClose: true },
    });
    fireEvent.click(screen.getByRole("button", { name: "投票を取り消す" }));
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));

    expect(props.onWithdraw).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "取り消す" })
    ).not.toBeInTheDocument();
  });

  it("締切の前は、選び直しをそのまま送る", () => {
    const props = renderBand({
      myVote: { choice: "for", castBeforeClose: true },
    });
    fireEvent.click(screen.getByRole("button", { name: /^反対/ }));
    expect(props.onCast).toHaveBeenCalledWith("against");
  });

  /*
    締切の前に入れた票を締切のあとに動かすと、採決前の票から外れて戻らない
    （議会とのズレの判定は採決前の票だけで行う）。そのことを書き、確かめる
  */
  describe("締切の前に入れた票を、締切のあとに動かすとき", () => {
    const LOCKED = { choice: "for", castBeforeClose: true } as const;

    it("採決前の票から外れ、元に戻せないことを書く", () => {
      renderBand({ pollState: AFTER, myVote: LOCKED });
      expect(
        screen.getByText(
          /選び直す・取り消すと、この票は採決前の票から外れ、元に戻せません/
        )
      ).toBeInTheDocument();
    });

    it("選び直しは確かめてから送る", () => {
      const props = renderBand({ pollState: AFTER, myVote: LOCKED });
      fireEvent.click(screen.getByRole("button", { name: /^反対/ }));
      expect(props.onCast).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "反対に選び直す" }));
      expect(props.onCast).toHaveBeenCalledWith("against");
    });

    it("取り消しの確かめにも、元に戻せないことを書く", () => {
      renderBand({ pollState: AFTER, myVote: LOCKED });
      fireEvent.click(screen.getByRole("button", { name: "投票を取り消す" }));
      expect(
        screen.getByText(
          /^取り消すと、この票は採決前の票から外れ、元に戻せません/
        )
      ).toBeInTheDocument();
    });

    it("締切のあとに入れた票には、この注意を出さない", () => {
      renderBand({
        pollState: AFTER,
        myVote: { choice: "for", castBeforeClose: false },
      });
      expect(screen.queryByText(/採決前の票から外れ/)).not.toBeInTheDocument();
    });
  });

  // 取り消しの誤操作を防ぐため、押せる範囲を 44px 以上にする
  it("取り消しと「結果を見る」は、押せる範囲を 44px 以上にする", () => {
    renderBand({
      myVote: { choice: "for", castBeforeClose: true },
      resultsHref: "#bill-votes",
    });
    expect(screen.getByRole("button", { name: "投票を取り消す" })).toHaveClass(
      "min-h-11"
    );
    expect(screen.getByRole("link", { name: "結果を見る" })).toHaveClass(
      "min-h-11"
    );
  });

  it("採決後の票には、採決後であることを添える", () => {
    renderBand({
      pollState: {
        state: "open_after_close",
        closesAt: CLOSES_AT,
        openedAfterClose: false,
      },
      myVote: { choice: "against", castBeforeClose: false },
    });
    expect(screen.getByText(/（採決後の票）/)).toBeInTheDocument();
  });

  // 押せないボタンを並べず、理由を文で書く
  it("人事案件は対象外と書き、投票のボタンを出さない", () => {
    renderBand({ pollState: { state: "not_applicable", reason: "personnel" } });

    expect(
      screen.getByText("人事案件のため、投票の対象外です")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("対象外になっても、本人の票は取り消せる", () => {
    renderBand({
      pollState: { state: "not_applicable", reason: "hidden" },
      myVote: { choice: "for", castBeforeClose: true },
    });

    expect(
      screen.getByRole("button", { name: "投票を取り消す" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^賛成/ })).toBeNull();
  });

  it("受付を止めているときは、ボタンを出さずに理由を書く", () => {
    renderBand({ votingEnabled: false });

    expect(
      screen.getByText("現在、投票の受付を停止しています。")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("公開前の議案（プレビュー）には投票できない", () => {
    renderBand({ billPublished: false });

    expect(
      screen.getByText("公開前の議案のため、投票できません。")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("受付が終わった回はボタンを出さない", () => {
    renderBand({
      pollState: {
        state: "closed",
        closesAt: CLOSES_AT,
        openedAfterClose: false,
      },
    });

    expect(screen.getByText("投票の受付は終了しました")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("失敗の理由を知らせる", () => {
    renderBand({ error: "投票を保存できませんでした。" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "投票を保存できませんでした。"
    );
  });

  // ふりがな表示（Rubyful）が span などの中身を差し替えたあとも、選び直しを反映する
  it("ふりがな表示が中身を差し替えたあとも、選び直した票を出す", () => {
    const { rerender } = render(
      <CastVoteBandView
        {...bandProps({ myVote: { choice: "for", castBeforeClose: true } })}
      />,
      { container: createMainContainer() }
    );
    simulateRubyful();

    expect(() =>
      rerender(
        <CastVoteBandView
          {...bandProps({
            myVote: { choice: "against", castBeforeClose: true },
          })}
        />
      )
    ).not.toThrow();
    expect(screen.getByText(/あなたの票：/)).toHaveTextContent(
      "あなたの票：反対"
    );
    simulateRubyful();

    expect(() =>
      rerender(<CastVoteBandView {...bandProps({ myVote: null })} />)
    ).not.toThrow();
    expect(screen.queryByText(/あなたの票：/)).not.toBeInTheDocument();
  });
});
