-- 区民投票のレビューでの指摘への対応（20261004120000_add_polls_and_responses の後に当てる）
--
-- 1. 票の無い議案を削除できるようにする
--    polls.bill_id を on delete restrict から on delete cascade に変える。
--    票（poll_responses.poll_id）は on delete restrict のままなので、票がある回は消せず、
--    票のある議案の削除は外部キー違反で止まる（区民の票を守る）。票の無い議案は回ごと消える。
--    20261004120000 がすでに cascade で作られている DB でも、同じ制約を張り直すだけで害はない。
--
-- 2. 「候補者の推薦」の議案を投票の対象から外す
--    特定の人を推薦するかどうかの議案（例：東京都後期高齢者医療広域連合議会議員選挙候補者の推薦について）は、
--    議員提出議案（slug は -giin-）でも人事案件と同じく「特定の人への賛否」になる。
--    すでに作られた回は消さずに非表示（is_hidden）にする（票があっても残し、本人は取り消せる）。
--    アプリ側の判定（isPersonnelBill・isPollTarget）も議案名で同じように除く。
--
-- 3. count_poll_responses_by_bill_ids が decision 専用であることをコメントに書く

-- ── 1. polls.bill_id を on delete cascade に ──
alter table polls drop constraint if exists polls_bill_id_fkey;
alter table polls
  add constraint polls_bill_id_fkey
  foreign key (bill_id) references bills(id) on delete cascade;

comment on column polls.bill_id is
  '議案。票の無い回は議案と一緒に消える（cascade）。票のある回は poll_responses の restrict で削除が止まる';

-- ── 2. 「候補者の推薦」の議案の回を非表示に ──
update polls p
set is_hidden = true
from bills b
where b.id = p.bill_id
  and p.kind = 'decision'
  and not p.is_hidden
  and b.name like '%候補者の推薦%';

-- ── 3. 集計の関数のコメント ──
comment on function public.count_poll_responses_by_bill_ids(uuid[], text) is
  'decision（choice 型・round 0。議案ごとに1つだけの回）専用。議案ごとの票数を（選択肢・資格・採決前か後か）に分けて返す。非表示の回と score 型の回答は数えない。round では分けず同じ種類の回をすべて合計するので、evaluation（年ごとの回）・live には使わない（別の関数で数える）';
