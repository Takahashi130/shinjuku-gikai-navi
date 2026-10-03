-- 会期の採決予定（本会議で議案を採決する日時）
--
-- 取り込み処理（packages/shinjuku-importer）が会期ページの「主な会議日程」から読み取って書き込む。
-- - final_vote_at: 議案の討論・採決を行う本会議の開始時刻（定例会の最終日など）
-- - early_vote_at: 先議（会期の初めに一部の議案だけ先に採決する本会議）の時刻。無い会期は null
-- 投票の回（polls）の締切は final_vote_at を使い、無ければ会期の最終日 14:00（日本時間）とする。

alter table diet_sessions
  add column final_vote_at timestamptz,
  add column early_vote_at timestamptz;

comment on column diet_sessions.final_vote_at is
  '議案を採決する本会議の開始予定時刻。会期ページの日程から取り込む。読めない場合は null';
comment on column diet_sessions.early_vote_at is
  '先議（一部の議案を先に採決する本会議）の予定時刻。開始時刻の記載が無い場合は、その日の直前に書かれた時刻（下限）。先議が無い会期は null';
