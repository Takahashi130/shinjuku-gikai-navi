import { RUBYFUL_SELECTOR } from "./selector";

/**
 * テスト用：ふりがな表示（Rubyful）が ON のときと同じく、セレクタに一致した
 * 要素の innerHTML を差し替える。React が持っていた子ノードは画面から外れる。
 *
 * これを呼んだあとに再描画して、NotFoundError（removeChild）で落ちないこと、
 * 表示が新しい値に変わることを確かめる。要素は main の中に描いておくこと。
 */
export function simulateRubyful(root: ParentNode = document): void {
  for (const element of root.querySelectorAll(RUBYFUL_SELECTOR)) {
    const html = element.innerHTML;
    element.innerHTML = html;
  }
}

/** テスト用：Rubyful のセレクタ（main の中）に当たるよう、main を描画先にする */
export function createMainContainer(): HTMLElement {
  return document.body.appendChild(document.createElement("main"));
}
