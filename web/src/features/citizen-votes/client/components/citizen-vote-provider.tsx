"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { BillCitizenVotesView } from "../../shared/types";
import type { PollStatusDescription } from "../../shared/utils/describe-poll-status";
import { pollClosesAt } from "../../shared/utils/resolve-poll-state";
import { useCastVote } from "../hooks/use-cast-vote";

type CitizenVoteContextValue = ReturnType<typeof useCastVote> & {
  view: BillCitizenVotesView;
  status: PollStatusDescription;
};

const CitizenVoteContext = createContext<CitizenVoteContextValue | null>(null);

interface CitizenVoteProviderProps {
  view: BillCitizenVotesView;
  /** サーバーで現在時刻から作った受付状態の説明（表示のずれを防ぐ） */
  status: PollStatusDescription;
  children: ReactNode;
}

/**
 * 1つの議案の区民投票の状態（本人の票・見せてよい結果・送信中・エラー）を、
 * ページの離れた場所に置く部品で分け合う。
 *
 * 議案ページでは「区民の意思（結果）」の面（CitizenVoteResultPanel）と
 * 「あなたの意思を投じる」の帯（CastVoteBand）が別の場所にあるので、
 * 両方をこの中に置く。帯で投票すると、結果の面もすぐに変わる。
 * 匿名ログインは、ボタンを押したときにだけ行う（useCastVote）。
 */
export function CitizenVoteProvider({
  view,
  status,
  children,
}: CitizenVoteProviderProps) {
  // サーバーから新しい値が届いたときだけ初期値を差し替える
  const initial = useMemo(
    () => ({ myVote: view.myVote, summary: view.summary }),
    [view.myVote, view.summary]
  );
  const vote = useCastVote({
    billId: view.billId,
    closesAt: pollClosesAt(view.pollState),
    initial,
  });

  return (
    <CitizenVoteContext.Provider value={{ ...vote, view, status }}>
      {children}
    </CitizenVoteContext.Provider>
  );
}

/** CitizenVoteProvider の中で、区民投票の状態と操作を受け取る */
export function useCitizenVote(): CitizenVoteContextValue {
  const value = useContext(CitizenVoteContext);
  if (!value) {
    throw new Error(
      "useCitizenVote は CitizenVoteProvider の中で使ってください"
    );
  }
  return value;
}
