import { LinkButton } from "@/components/top/link-button";
import { routes } from "@/lib/routes";

/**
 * デスクトップメニュー: アクションボタン（サイドバー内）
 */
export function DesktopMenuActionButtons() {
  return (
    <div className="flex flex-col gap-3">
      <LinkButton
        href={routes.billsList()}
        icon={{
          src: "/icons/arrow-right.svg",
          alt: "",
          width: 20,
          height: 20,
        }}
      >
        議案を探す
      </LinkButton>
    </div>
  );
}
