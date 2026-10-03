"use client";

import { useEffect, useRef, useState } from "react";
import { hasReadExplainer } from "@/features/bill-explainers/client/utils/explainer-read-flag";
import { ensureAnonymousSupabaseUser } from "@/features/chat/client/hooks/use-anonymous-supabase-user";
import { castVote } from "../../server/actions/cast-vote";
import { withdrawVote } from "../../server/actions/withdraw-vote";
import type { VoteChoice } from "../../shared/types";
import {
  computeOptimisticVote,
  type VoteViewState,
} from "../../shared/utils/compute-optimistic-vote";
import { isBeforeClose } from "../../shared/utils/resolve-poll-state";
import { VOTE_ACTION_ERROR_MESSAGES } from "../../shared/utils/vote-action-messages";

/**
 * 投票・取り消しの楽観的更新とサーバーとのやりとりをまとめる。
 *
 * - 匿名ログインは、ボタンを押したときにだけ行う（ページを見ただけでは作らない）
 * - 押した直後に本人の票を反映し、サーバーの結果（最新の集計）で確定する
 * - 失敗したら元に戻し、理由を error に入れる
 * - 親から渡される initial が変わったら（再描画など）それに合わせる
 */
export function useCastVote(input: {
  billId: string;
  closesAt: string | null;
  initial: VoteViewState;
}) {
  const { billId, closesAt, initial } = input;
  const [state, setState] = useState<VoteViewState>(initial);
  const [pending, setPending] = useState<VoteChoice | "withdraw" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const prevInitialRef = useRef(initial);
  const requestIdRef = useRef(0);
  // 連打で同じ描画中に2回呼ばれても、送るのは1回にする（state は次の描画まで変わらない）
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (prevInitialRef.current !== initial) {
      prevInitialRef.current = initial;
      requestIdRef.current += 1;
      setState(initial);
    }
  }, [initial]);

  const run = async (
    operation: VoteChoice | "withdraw",
    call: () => ReturnType<typeof castVote>
  ) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestId = ++requestIdRef.current;
    const previous = state;
    setError(null);
    setPending(operation);

    try {
      const userId = await ensureAnonymousSupabaseUser();
      if (!userId) {
        if (requestId === requestIdRef.current) {
          setError(VOTE_ACTION_ERROR_MESSAGES.unauthenticated);
        }
        return;
      }

      setState((current) =>
        computeOptimisticVote(
          current,
          operation === "withdraw"
            ? { type: "withdraw" }
            : {
                type: "cast",
                choice: operation,
                castBeforeClose: isBeforeClose(closesAt, new Date()),
              }
        )
      );

      const result = await call();
      if (requestId !== requestIdRef.current) return;
      if (result.ok) {
        setState({ myVote: result.myVote, summary: result.summary });
      } else {
        setState(previous);
        setError(result.error);
      }
    } catch {
      if (requestId === requestIdRef.current) {
        setState(previous);
        setError(VOTE_ACTION_ERROR_MESSAGES.server_error);
      }
    } finally {
      inFlightRef.current = false;
      setPending(null);
    }
  };

  const cast = (choice: VoteChoice) => {
    if (state.myVote?.choice === choice) return Promise.resolve();
    return run(choice, () =>
      castVote(billId, choice, { readExplainer: hasReadExplainer(billId) })
    );
  };

  const withdraw = () => {
    if (state.myVote === null) return Promise.resolve();
    return run("withdraw", () => withdrawVote(billId));
  };

  return { state, pending, error, cast, withdraw };
}
