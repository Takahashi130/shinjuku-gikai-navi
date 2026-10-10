/**
 * 議案ごとの解説動画（web/public/videos に置いた mp4）。キーは議案の slug
 * （開発用と本番で議案の ID が違うため）。
 *
 * いまは試しに1本だけ。動画は議案の公開資料と、賛成・反対それぞれの公開された
 * 説明をもとに作り、出典は動画の最後に出す。
 */
export type ExplainerVideo = {
  src: string;
  poster: string;
  /** 動画の長さ（例：「約2分」） */
  length: string;
  /** 動画の上に出す説明（3行ほど） */
  description: readonly string[];
};

export const EXPLAINER_VIDEOS: Record<string, ExplainerVideo> = {
  // 第42号議案 令和8年度新宿区一般会計補正予算（第2号）
  "r8-teirei-2-gian-42": {
    src: "/videos/r8-2-gian-42.mp4",
    poster: "/videos/r8-2-gian-42-poster.png",
    length: "約2分30秒",
    description: [
      "約2億9千万円を追加する補正予算の中身（商品券の拡充・道路と下水道の工事費など）を、スライドで説明します。",
      "論点は「商店街ハッピー商品券のプレミアム率を20%から30%に上げること」。区の説明と、反対した会派の主張を並べています。",
      "背景（物価高・中東情勢）と、議会の議決（賛成7会派・反対1会派で可決）までをまとめています。",
    ],
  },
};
