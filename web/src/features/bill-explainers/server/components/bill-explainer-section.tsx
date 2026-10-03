import { unstable_rethrow } from "next/navigation";
import { ExplainerAbsence } from "../../client/components/explainer-absence";
import { ExplainerSlides } from "../../client/components/explainer-slides";
import { buildExplainerFooter } from "../../shared/utils/build-explainer-footer";
import { buildExplainerSlides } from "../../shared/utils/build-explainer-slides";
import { explainerAbsenceMessage } from "../../shared/utils/explainer-absence-message";
import { getBillExplainer } from "../loaders/get-bill-explainer";

interface BillExplainerSectionProps {
  billId: string;
  /** トークン付きのプレビューで下書きも見せるとき true */
  includeDraft?: boolean;
  className?: string;
}

/**
 * 議案ページの「この議案の解説」。解説があればスライド、無ければ理由を出す。
 * データが取れないときは何も出さない（議案ページ全体は止めない）。
 */
export async function BillExplainerSection({
  billId,
  includeDraft = false,
  className,
}: BillExplainerSectionProps) {
  let view: Awaited<ReturnType<typeof getBillExplainer>>;
  try {
    view = await getBillExplainer(billId, { includeDraft });
  } catch (error) {
    unstable_rethrow(error);
    console.error(
      "Failed to load bill explainer:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
  if (!view) return null;

  if (view.kind === "absent") {
    return (
      <ExplainerAbsence
        message={explainerAbsenceMessage(view, new Date())}
        className={className}
      />
    );
  }

  const { explainer } = view;
  return (
    <ExplainerSlides
      billId={billId}
      slides={buildExplainerSlides(explainer.body, explainer.sources)}
      footer={buildExplainerFooter(explainer, new Date())}
      className={className}
    />
  );
}
