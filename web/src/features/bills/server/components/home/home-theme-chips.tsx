import type { HomeThemeChip } from "../../../shared/utils/build-home-view";
import {
  billsListHref,
  DEFAULT_BILLS_LIST_PARAMS,
} from "../../../shared/utils/parse-bills-list-params";
import { HomeChipSection } from "./home-chip-section";

/** 「テーマで探す」。テーマで絞った議案一覧へ送る小さなチップを並べる。 */
export function HomeThemeChips({ chips }: { chips: HomeThemeChip[] }) {
  return (
    <HomeChipSection
      id="themes-title"
      title="テーマで探す"
      chips={chips.map((chip) => ({
        key: chip.id,
        label: chip.label,
        href: billsListHref(DEFAULT_BILLS_LIST_PARAMS, { tagId: chip.id }),
        meta: (
          <span className="font-lexend text-xs text-mirai-text-muted">
            {chip.count}
          </span>
        ),
      }))}
    />
  );
}
