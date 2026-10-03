/**
 * 「投票の前に解説を開いたか」を、そのタブの間だけ覚えておく（sessionStorage）。
 * 票と一緒に read_explainer として記録し、解説を読んだ人の票を別に見られるようにする。
 *
 * 2枚目以降のスライドに進んだか、「一覧で読む」に切り替えたら「開いた」とみなす。
 * 保存できない環境（プライベートブラウズなど）では何もしない。
 */

const KEY_PREFIX = "explainer-read:";

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function markExplainerRead(billId: string): void {
  try {
    getStorage()?.setItem(`${KEY_PREFIX}${billId}`, "1");
  } catch {
    // 保存できなくても解説の表示には影響させない
  }
}

export function hasReadExplainer(billId: string): boolean {
  try {
    return getStorage()?.getItem(`${KEY_PREFIX}${billId}`) === "1";
  } catch {
    return false;
  }
}
