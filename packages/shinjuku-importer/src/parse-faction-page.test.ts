import { describe, expect, it } from "vitest";
import { parseFactionPage } from "./parse-faction-page";

// 区の会派構成ページの一部（2026年8月時点の形）
const html = `
<h1 class="h1_basic01"><span>会派構成</span></h1>
<div class="section01">
  <h2 class="h2_basic02"><span>自民・参政クラブ（8人）</span></h2>
  <div class="free_text_area01"><table border="1">
  <tbody>
    <tr>
      <td>[幹事長]<br>
        ひやま 真一</td>
      <td>[団長]<br>
        下村 治生</td>
      <td>[副幹事長]<br>
        渡辺 みちたか</td>
      <td>池田 だいすけ</td>
    </tr>
    <tr>
      <td>渡辺 清人</td>
      <td>[会計]<br>
        石川 孝一</td>
      <td>高阪 まさし</td>
      <td>青木 仁美</td>
    </tr>
  </tbody>
  </table>
  ※令和8年7月1日付けで所属議員と会計役員に変更がありました。</div>
</div>
<div class="section01">
  <h2 class="h2_basic02"><span>いのちの党 新宿（1人）</span></h2>
  <div class="free_text_area01"><table><tbody><tr>
    <td>[幹事長・会計]<br>さわい めぐみ</td>
    <td>&nbsp;</td>
  </tr></tbody></table>
  ※令和8年8月7日付けで会派名称を「れいわ新選組 新宿」から「いのちの党 新宿」に変更しました。</div>
</div>
<div>本ページに関するお問い合わせ</div>
`;

describe("parseFactionPage", () => {
  const entries = parseFactionPage(html);

  it("会派名・人数・注記を読む", () => {
    expect(entries.map((e) => [e.name, e.memberCount, e.notes])).toEqual([
      ["自民・参政クラブ", 8, ["※令和8年7月1日付けで所属議員と会計役員に変更がありました。"]],
      ["いのちの党 新宿", 1, ["※令和8年8月7日付けで会派名称を「れいわ新選組 新宿」から「いのちの党 新宿」に変更しました。"]],
    ]);
  });

  it("役職はセルに書かれている議員にだけ付け、前のセルの役職を引き継がない", () => {
    expect(entries[0].members).toEqual([
      { name: "ひやま 真一", role: "幹事長" },
      { name: "下村 治生", role: "団長" },
      { name: "渡辺 みちたか", role: "副幹事長" },
      { name: "池田 だいすけ", role: null },
      { name: "渡辺 清人", role: null },
      { name: "石川 孝一", role: "会計" },
      { name: "高阪 まさし", role: null },
      { name: "青木 仁美", role: null },
    ]);
    expect(entries[1].members).toEqual([{ name: "さわい めぐみ", role: "幹事長・会計" }]);
  });

  it("会派の見出しが無ければエラーにする", () => {
    expect(() => parseFactionPage("<h1>会派構成</h1><h2>お知らせ</h2>")).toThrow("会派の見出し");
  });
});
