// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CitizenVoteSummary, VoteActionResult } from "../../shared/types";
import type { VoteViewState } from "../../shared/utils/compute-optimistic-vote";
import { useCastVote } from "./use-cast-vote";

vi.mock("../../server/actions/cast-vote", () => ({ castVote: vi.fn() }));
vi.mock("../../server/actions/withdraw-vote", () => ({
  withdrawVote: vi.fn(),
}));
vi.mock("@/features/chat/client/hooks/use-anonymous-supabase-user", () => ({
  ensureAnonymousSupabaseUser: vi.fn(),
}));

import { ensureAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import { castVote } from "../../server/actions/cast-vote";
import { withdrawVote } from "../../server/actions/withdraw-vote";

const mockedCast = vi.mocked(castVote);
const mockedWithdraw = vi.mocked(withdrawVote);
const mockedEnsure = vi.mocked(ensureAnonymousSupabaseUser);

const BILL_ID = "11111111-1111-4111-8111-111111111111";
const FUTURE_CLOSE = "2999-01-01T00:00:00.000Z";

function summary(forCount: number, against: number): CitizenVoteSummary {
  return {
    beforeClose: { for: forCount, against, total: forCount + against },
    afterClose: { for: 0, against: 0, total: 0 },
    verifiedBeforeClose: { for: 0, against: 0, total: 0 },
  };
}

const NOT_VOTED: VoteViewState = { myVote: null, summary: null };

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mockedEnsure.mockResolvedValue("user-1");
});

describe("useCastVote", () => {
  it("押したときに匿名ログインし、サーバーの結果で確定する", async () => {
    mockedCast.mockResolvedValue({
      ok: true,
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(4, 2),
    });

    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );

    await act(async () => {
      await result.current.cast("for");
    });

    expect(mockedEnsure).toHaveBeenCalledTimes(1);
    expect(mockedCast).toHaveBeenCalledWith(BILL_ID, "for", {
      readExplainer: false,
    });
    expect(result.current.state).toEqual({
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(4, 2),
    });
    expect(result.current.error).toBeNull();
  });

  it("サーバーの応答前に本人の票を出す", async () => {
    let resolve!: (value: VoteActionResult) => void;
    mockedCast.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );

    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );

    await act(async () => {
      void result.current.cast("against");
    });
    expect(result.current.state.myVote).toEqual({
      choice: "against",
      castBeforeClose: true,
    });
    expect(result.current.pending).toBe("against");

    await act(async () => {
      resolve({
        ok: true,
        myVote: { choice: "against", castBeforeClose: true },
        summary: summary(0, 1),
      });
    });
    expect(result.current.pending).toBeNull();
    expect(result.current.state.summary).toEqual(summary(0, 1));
  });

  it("解説を開いていたら readExplainer を付けて送る", async () => {
    window.sessionStorage.setItem(`explainer-read:${BILL_ID}`, "1");
    mockedCast.mockResolvedValue({
      ok: true,
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(1, 0),
    });
    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );
    await act(async () => {
      await result.current.cast("for");
    });
    expect(mockedCast).toHaveBeenCalledWith(BILL_ID, "for", {
      readExplainer: true,
    });
  });

  it("匿名ログインに失敗したら投票を送らず、理由を出す", async () => {
    mockedEnsure.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );
    await act(async () => {
      await result.current.cast("for");
    });
    expect(mockedCast).not.toHaveBeenCalled();
    expect(result.current.state).toEqual(NOT_VOTED);
    expect(result.current.error).not.toBeNull();
  });

  it("サーバーが断ったら元に戻し、理由を出す", async () => {
    mockedCast.mockResolvedValue({
      ok: false,
      code: "rate_limited",
      error: "少し待ってください",
    });
    const initial: VoteViewState = {
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(3, 1),
    };
    const { result } = renderHook(() =>
      useCastVote({ billId: BILL_ID, closesAt: FUTURE_CLOSE, initial })
    );
    await act(async () => {
      await result.current.cast("against");
    });
    expect(result.current.state).toEqual(initial);
    expect(result.current.error).toBe("少し待ってください");
  });

  it("通信エラーでも元に戻す", async () => {
    mockedCast.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );
    await act(async () => {
      await result.current.cast("for");
    });
    expect(result.current.state).toEqual(NOT_VOTED);
    expect(result.current.error).not.toBeNull();
  });

  it("同じ選択肢を押し直しても送らない", async () => {
    const initial: VoteViewState = {
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(3, 1),
    };
    const { result } = renderHook(() =>
      useCastVote({ billId: BILL_ID, closesAt: FUTURE_CLOSE, initial })
    );
    await act(async () => {
      await result.current.cast("for");
    });
    expect(mockedEnsure).not.toHaveBeenCalled();
    expect(mockedCast).not.toHaveBeenCalled();
  });

  it("取り消すと本人の票を消し、サーバーの結果に合わせる", async () => {
    mockedWithdraw.mockResolvedValue({ ok: true, myVote: null, summary: null });
    // initial は描画ごとに作り直さない（作り直すと「変わった」とみなして合わせ続ける）
    const initial: VoteViewState = {
      myVote: { choice: "against", castBeforeClose: true },
      summary: summary(3, 1),
    };
    const { result } = renderHook(() =>
      useCastVote({ billId: BILL_ID, closesAt: FUTURE_CLOSE, initial })
    );
    await act(async () => {
      await result.current.withdraw();
    });
    expect(mockedWithdraw).toHaveBeenCalledWith(BILL_ID);
    expect(result.current.state).toEqual({ myVote: null, summary: null });
  });

  it("応答を待つ間の連打では、1回しか送らない", async () => {
    let resolve!: (value: VoteActionResult) => void;
    mockedCast.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const { result } = renderHook(() =>
      useCastVote({
        billId: BILL_ID,
        closesAt: FUTURE_CLOSE,
        initial: NOT_VOTED,
      })
    );
    await act(async () => {
      void result.current.cast("for");
      void result.current.cast("against");
    });
    await act(async () => {
      resolve({
        ok: true,
        myVote: { choice: "for", castBeforeClose: true },
        summary: summary(1, 0),
      });
    });
    expect(mockedEnsure).toHaveBeenCalledTimes(1);
    expect(mockedCast).toHaveBeenCalledTimes(1);
    expect(result.current.state.myVote?.choice).toBe("for");
  });

  it("initial が変わったら合わせる", () => {
    const { result, rerender } = renderHook(
      ({ initial }) =>
        useCastVote({ billId: BILL_ID, closesAt: FUTURE_CLOSE, initial }),
      { initialProps: { initial: NOT_VOTED } }
    );
    const next: VoteViewState = {
      myVote: { choice: "for", castBeforeClose: true },
      summary: summary(10, 2),
    };
    rerender({ initial: next });
    expect(result.current.state).toEqual(next);
  });
});
