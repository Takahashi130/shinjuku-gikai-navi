// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureSlot } from "./feature-slot";

describe("FeatureSlot", () => {
  it("差し込むものが無ければ fallback を出す", () => {
    render(<FeatureSlot fallback={<p>準備中の説明</p>} />);

    expect(screen.getByText("準備中の説明")).toBeInTheDocument();
  });

  it.each([null, false])("children が %s なら fallback を出す", (empty) => {
    render(<FeatureSlot fallback={<p>準備中の説明</p>}>{empty}</FeatureSlot>);

    expect(screen.getByText("準備中の説明")).toBeInTheDocument();
  });

  it("差し込むものがあればそれだけを出す", () => {
    render(
      <FeatureSlot fallback={<p>準備中の説明</p>}>
        <p>本物の機能</p>
      </FeatureSlot>
    );

    expect(screen.getByText("本物の機能")).toBeInTheDocument();
    expect(screen.queryByText("準備中の説明")).not.toBeInTheDocument();
  });
});
