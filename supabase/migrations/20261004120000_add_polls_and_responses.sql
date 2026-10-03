-- 区民投票（区民が作るデータ）
--
-- polls: 投票・アンケートの「回」。議決への賛否（decision）、毎年の評価（evaluation）、
--        LIVE 中の投票（live）を1つの形で持つ。
-- poll_responses: 1人（匿名ユーザーを含む auth.users の id）につき1回ごとに1票。
--
-- 方針
-- - 当面は誰でも投票できる（audience = 'anyone'）。参加した時点の資格（eligibility）を
--   票ごとに記録し、将来の区民認証で「区民確認済み」の票を別に数えられるようにする。
-- - 採決後も投票できる（accepts_after_close）。採決前か後かは responded_at と
--   polls.closes_at を比べて集計時に分ける。
-- - 区民の票は議案を消しても消えないよう on delete restrict にする。
-- - user_id には外部キーを張らない（report_reactions と同じ。匿名ユーザーを消しても票は残る）。
-- - 取り込み処理（shinjuku-importer）が polls に対して行ってよいのは、新しい回の追加
--   （重複は無視）と、closes_at_source = 'schedule' の回の closes_at の更新だけ。

create type participant_eligibility as enum (
  'unverified',
  'self_declared_resident',
  'self_declared_nonresident',
  'verified_resident'
);

comment on type participant_eligibility is
  '参加した時点の資格。unverified: 確認なし / self_declared_*: 自己申告 / verified_resident: 区民認証済み';

create table polls (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid references bills(id) on delete restrict,
  kind text not null check (kind in ('decision', 'evaluation', 'live')),
  -- decision = 0, evaluation = 1..5（可決から n 年目）, live = 連番
  round smallint not null default 0,
  response_type text not null check (response_type in ('choice', 'score')),
  -- choice の選択肢（decision は {for,against}）
  options text[],
  -- evaluation・live の設問。decision は null
  question text,
  audience text not null default 'anyone'
    check (audience in ('anyone', 'resident_declared', 'resident_verified')),
  opens_at timestamptz not null default now(),
  -- decision は採決の本会議の開始時刻
  closes_at timestamptz,
  closes_at_source text not null default 'schedule'
    check (closes_at_source in ('schedule', 'manual')),
  accepts_after_close boolean not null default true,
  -- 運営が対象外にした回（polls:hide）
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bill_id, kind, round),
  check (bill_id is not null),
  check (response_type <> 'choice' or cardinality(options) >= 2)
);

create table poll_responses (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete restrict,
  user_id uuid not null,
  -- polls.options のどれか（アプリで確かめる）
  choice text,
  score smallint check (score between 1 and 5),
  eligibility participant_eligibility not null default 'unverified',
  -- 将来の区民認証で使う仮名 ID。氏名・住所は持たない
  resident_subject_hash text,
  read_explainer boolean not null default false,
  -- 最後に選び直した時刻。採決前か後かの判定に使う
  responded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id),
  check ((choice is not null) <> (score is not null))
);

-- RLS有効化（ポリシーなし = デフォルト全拒否、アクセスはAdmin Client経由のみ）
alter table polls enable row level security;
alter table poll_responses enable row level security;

create unique index idx_poll_responses_poll_subject
  on poll_responses (poll_id, resident_subject_hash)
  where resident_subject_hash is not null;
create index idx_poll_responses_poll_choice on poll_responses (poll_id, choice);
create index idx_poll_responses_user_id on poll_responses (user_id);

create trigger update_polls_updated_at
  before update on polls
  for each row execute function update_updated_at_column();

comment on table polls is
  '投票・アンケートの回。議決への賛否（decision）・毎年の評価（evaluation）・LIVE 中の投票（live）';
comment on column polls.closes_at_source is
  'schedule: 会期の日程から取り込み処理が決める（取り込みで更新される） / manual: 運営が個別に決めた（取り込みでは変えない）';
comment on table poll_responses is
  '区民の票。1ユーザー1回につき1票。eligibility は投票した時点の資格';
comment on column poll_responses.responded_at is
  '最後に選び直した時刻。polls.closes_at より前なら採決前の票として数える';

-- 既存の議案すべてに「議決」の回を作る（採決後も投票できる）。
-- 締切は会期の採決予定（final_vote_at）、無ければ会期の最終日 14:00（日本時間）。
-- 人事案件（同意・諮問）は投票の対象外なので作らない。
insert into polls (bill_id, kind, round, response_type, options, closes_at, closes_at_source)
select
  b.id,
  'decision',
  0,
  'choice',
  array['for', 'against'],
  coalesce(
    ds.final_vote_at,
    (ds.end_date::timestamp + interval '14 hours') at time zone 'Asia/Tokyo'
  ),
  'schedule'
from bills b
left join diet_sessions ds on ds.id = b.diet_session_id
where coalesce(b.slug, '') not like '%-doi-%'
  and coalesce(b.slug, '') not like '%-shimon-%'
on conflict (bill_id, kind, round) do nothing;

-- 議案ごとの票数を、選択肢・資格・採決前か後かに分けてまとめて数える。
-- 非表示の回（is_hidden）と、選択肢でない回答（score）は数えない。
-- 採決前 = responded_at < closes_at（締切が無い回はすべて採決前として扱う）。
create or replace function public.count_poll_responses_by_bill_ids(
  p_bill_ids uuid[],
  p_kind text default 'decision'
)
returns table (
  bill_id uuid,
  choice text,
  eligibility participant_eligibility,
  cast_before_close boolean,
  cnt bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.bill_id,
    r.choice,
    r.eligibility,
    (p.closes_at is null or r.responded_at < p.closes_at) as cast_before_close,
    count(*) as cnt
  from polls p
  join poll_responses r on r.poll_id = p.id
  where p.bill_id = any(p_bill_ids)
    and p.kind = p_kind
    and not p.is_hidden
    and r.choice is not null
  group by 1, 2, 3, 4;
$$;

comment on function public.count_poll_responses_by_bill_ids(uuid[], text) is
  '議案ごとの票数を（選択肢・資格・採決前か後か）に分けて返す。非表示の回は数えない';
