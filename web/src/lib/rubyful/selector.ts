/**
 * Rubyful V2 に渡すセレクタ（ふりがなを付ける要素）。
 *
 * 【注意】このセレクタに一致した要素は、Rubyful に innerHTML を丸ごと差し替え
 * られる。React が持っていた子ノードはその時点で DOM から外れるため、これらの
 * タグの中に、マウント後に出し入れする子（`{cond && <span/>}` や
 * `{cond && "…"}`）や、あとで変わる文字を置かない。変わるものは、要素の
 * key を変えて作り直すか、末端の要素の子を1つの文字列にする
 * （詳しくは initializer.tsx）。
 */
export const RUBYFUL_SELECTOR =
  "main p, main h1, main h2, main h3, main h4, main h5, main h6, main li, main td, main th, main span, main a";
