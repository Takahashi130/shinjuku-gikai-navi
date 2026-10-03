import type {
  CitizenVoteSummary,
  MyVote,
  VoteChoice,
  VoteTally,
} from "../types";

export type VoteViewState = {
  myVote: MyVote | null;
  /** 見せてよい結果が無ければ null（楽観的更新でも出さない） */
  summary: CitizenVoteSummary | null;
};

export type VoteOperation =
  | { type: "cast"; choice: VoteChoice; castBeforeClose: boolean }
  | { type: "withdraw" };

function adjust(
  tally: VoteTally,
  choice: VoteChoice,
  delta: 1 | -1
): VoteTally {
  const next = { ...tally };
  next[choice] = Math.max(0, next[choice] + delta);
  next.total = next.for + next.against;
  return next;
}

function bucketKey(castBeforeClose: boolean) {
  return castBeforeClose ? "beforeClose" : "afterClose";
}

/**
 * ボタンを押した直後に見せる状態を計算する（サーバーの結果で後から確定する）。
 *
 * - 同じ選択肢を押し直しても何も変えない（サーバーも選び直しの時刻を更新しない）
 * - 選び直し・取り消しでは、前の票を元の区分（締切前／後）から引く
 * - 結果をまだ見せていない（summary が null）ときは、票数は出さない
 * - 区民確認済みの票数は、ここでは動かさない（資格はサーバーが決める）
 */
export function computeOptimisticVote(
  state: VoteViewState,
  operation: VoteOperation
): VoteViewState {
  const { myVote, summary } = state;

  if (operation.type === "cast" && myVote?.choice === operation.choice) {
    return state;
  }
  if (operation.type === "withdraw" && myVote === null) {
    return state;
  }

  let nextSummary = summary;
  if (nextSummary && myVote) {
    const key = bucketKey(myVote.castBeforeClose);
    nextSummary = {
      ...nextSummary,
      [key]: adjust(nextSummary[key], myVote.choice, -1),
    };
  }

  if (operation.type === "withdraw") {
    return { myVote: null, summary: nextSummary };
  }

  if (nextSummary) {
    const key = bucketKey(operation.castBeforeClose);
    nextSummary = {
      ...nextSummary,
      [key]: adjust(nextSummary[key], operation.choice, 1),
    };
  }
  return {
    myVote: {
      choice: operation.choice,
      castBeforeClose: operation.castBeforeClose,
    },
    summary: nextSummary,
  };
}
