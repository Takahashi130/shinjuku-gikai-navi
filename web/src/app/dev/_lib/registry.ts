type PreviewItem = {
  path: string;
  label: string;
  description: string;
};

type PreviewGroup = {
  name: string;
  items: PreviewItem[];
};

export const previewRegistry: PreviewGroup[] = [
  {
    name: "UI Primitives",
    items: [
      {
        path: "/dev/ui",
        label: "UI Components",
        description: "Button, Badge, Card, SpeechBubble",
      },
    ],
  },
  {
    name: "Bills",
    items: [
      {
        path: "/dev/features/bills/bill-card",
        label: "BillCard",
        description: "トップ・一覧・会期別一覧の大きめのカード",
      },
      {
        path: "/dev/features/bills/bill-status-badge",
        label: "BillStatusBadge",
        description: "議案ステータスバッジ全バリアント",
      },
    ],
  },
  {
    name: "Participation",
    items: [
      {
        path: "/dev/features/participation",
        label: "解説・区民投票",
        description: "解説スライド・投票カード・一覧の印（架空のデータ）",
      },
      {
        path: "/dev/features/participation/live",
        label: "解説・区民投票（実データ）",
        description: "つながっている DB の議案で入口を表示する",
      },
    ],
  },
  {
    name: "Interview",
    items: [
      {
        path: "/dev/features/interview/consent-modal",
        label: "ConsentModal",
        description: "AIインタビュー同意モーダル",
      },
      {
        path: "/dev/features/interview/public-consent-modal",
        label: "PublicConsentModal",
        description: "インタビュー公開設定モーダル",
      },
      {
        path: "/dev/features/interview/rating-widget",
        label: "InterviewRatingWidget",
        description: "満足度評価ウィジェット（星評価＋フィードバック）",
      },
      {
        path: "/dev/features/interview/summary-input",
        label: "InterviewSummaryInput",
        description: "要約フェーズの入力欄（レポート提出／未生成時の安全網）",
      },
    ],
  },
];
