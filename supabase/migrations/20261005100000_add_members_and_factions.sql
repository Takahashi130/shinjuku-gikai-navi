-- 議員・会派と、議案への会派ごとの賛否（区のデータ）
--
-- すべて取り込み処理（packages/shinjuku-importer の members / questions / faction-votes / ingest）が
-- 区の公開ページから書き込む。区のデータなので取り込み直しで上書き（または消して入れ直し）してよい。
--
-- 方針
-- - 議員の住所・電話・メール・ホームページ・顔写真は保存しない（列を作らない）。
-- - 会派の名前は年によって変わる（自由民主党新宿区議会議員団 → 自民・参政クラブ など）。
--   同じ会派の名前の履歴を faction_names に持ち、区の資料に書かれた名前から会派を引けるようにする。
-- - 会派の所属の履歴（faction_memberships）は、区の資料で確認できた日付の範囲だけを持つ
--   （本会議の質問者一覧に書かれた会派と、今の会派構成ページ）。確認できない期間は推測しない。

-- 会派
create table factions (
  id uuid primary key default gen_random_uuid(),
  -- 取り込み処理の会派一覧（src/data/factions.ts）のキー。一覧に無い今の会派は自動で作る
  slug text not null unique,
  -- 最新の正式名称
  name text not null,
  -- 委員会名簿にある略称（自参ク など）。今の会派だけ
  short_name text,
  -- 今の会派構成ページに載っているか
  is_current boolean not null default false,
  -- 会派構成ページの人数（今の会派だけ）
  member_count smallint check (member_count >= 0),
  -- 会派構成ページでの並び順
  sort_order smallint not null default 0,
  -- 区の資料で分かる場合だけ（政務活動費の注記など）
  formed_on date,
  dissolved_on date,
  note text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 会派の名前の履歴（区の資料に出てくる名前 → 会派）
create table faction_names (
  faction_id uuid not null references factions(id) on delete cascade,
  name text not null,
  -- 突き合わせ用（全角半角・空白・注記の記号をそろえたもの）
  name_key text not null unique,
  valid_from date,
  valid_to date,
  -- 名称変更の根拠（例：「令和7年4月10日付で会派名を変更（政務活動費収支一覧の注記）」）
  note text,
  created_at timestamptz not null default now(),
  primary key (faction_id, name)
);

-- 議員（今の議員名簿にある議員。名簿から外れた議員は is_current = false にして残す）
create table members (
  id uuid primary key default gen_random_uuid(),
  -- 表示名（名簿の表記。例：木もと ひろゆき）
  name text not null,
  -- 突き合わせ用（空白を除いたもの。例：木もとひろゆき）
  name_key text not null unique,
  -- ふりがな（名簿にある場合）
  name_kana text,
  -- 議席番号
  seat_number smallint check (seat_number >= 1),
  -- 当選期数
  elected_count smallint check (elected_count >= 1),
  -- 今の会派（議員名簿の所属会派）
  faction_id uuid references factions(id) on delete set null,
  is_current boolean not null default true,
  source_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 任期（第20期：令和5年5月1日〜令和9年4月30日 など）
create table member_terms (
  member_id uuid not null references members(id) on delete cascade,
  term_number smallint not null check (term_number >= 1),
  term_start date not null,
  term_end date not null,
  -- 一般選挙の日
  election_date date,
  source_url text not null,
  updated_at timestamptz not null default now(),
  primary key (member_id, term_number),
  check (term_start <= term_end)
);

-- 会派の所属の履歴（区の資料で確認できた範囲）
create table faction_memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  faction_id uuid not null references factions(id) on delete cascade,
  -- 区の資料でこの会派の所属と確認できた最初の日・最後の日
  first_seen_on date not null,
  last_seen_on date not null,
  -- 今の会派構成ページで確認できた所属か
  is_current boolean not null default false,
  -- 確認できた資料の数
  observation_count integer not null default 1 check (observation_count >= 1),
  -- 確認に使った資料の種類（plenary_questions: 本会議の質問者一覧 / faction_page: 会派構成ページ）
  sources text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (member_id, first_seen_on),
  check (first_seen_on <= last_seen_on)
);

-- 役職（議長・副議長、委員会の委員長・副委員長・委員、会派の役職）。今の役職だけを持つ
create table member_positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  body_kind text not null check (
    body_kind in ('council', 'standing_committee', 'special_committee', 'steering_committee', 'faction')
  ),
  -- 新宿区議会 / 総務区民委員会 / 自民・参政クラブ など
  body_name text not null,
  -- 議長・副議長・委員長・副委員長・委員・幹事長 など（区のページの表記）
  role text not null,
  sort_order smallint not null default 0,
  source_url text not null,
  updated_at timestamptz not null default now(),
  unique (member_id, body_kind, body_name, role)
);

-- 議案への会派ごとの賛否（「議案の概要と審議結果」PDF の表）
create table bill_faction_votes (
  bill_id uuid not null references bills(id) on delete cascade,
  -- PDF の見出しの略称（年によって意味が変わることがある）
  faction_abbr text not null,
  -- その会期の凡例にある正式名称
  faction_name text not null,
  -- 会派（名前の履歴から引けたときだけ）
  faction_id uuid references factions(id) on delete set null,
  vote text not null check (vote in ('for', 'against', 'unknown')),
  -- 「1人反対」など、賛否の記号に添えられた注記
  note text,
  -- PDF の列の順番
  sort_order smallint not null,
  updated_at timestamptz not null default now(),
  primary key (bill_id, faction_abbr)
);

-- RLS有効化（ポリシーなし = デフォルト全拒否、アクセスはAdmin Client経由のみ）
alter table factions enable row level security;
alter table faction_names enable row level security;
alter table members enable row level security;
alter table member_terms enable row level security;
alter table faction_memberships enable row level security;
alter table member_positions enable row level security;
alter table bill_faction_votes enable row level security;

create index idx_factions_is_current on factions (is_current, sort_order);
create index idx_members_is_current_seat on members (is_current, seat_number);
create index idx_members_faction_id on members (faction_id);
create index idx_faction_memberships_faction_id on faction_memberships (faction_id);
create index idx_member_positions_member_id on member_positions (member_id, sort_order);
create index idx_bill_faction_votes_faction_vote on bill_faction_votes (faction_id, vote);

create trigger update_factions_updated_at
  before update on factions
  for each row execute function update_updated_at_column();
create trigger update_members_updated_at
  before update on members
  for each row execute function update_updated_at_column();
create trigger update_member_terms_updated_at
  before update on member_terms
  for each row execute function update_updated_at_column();
create trigger update_faction_memberships_updated_at
  before update on faction_memberships
  for each row execute function update_updated_at_column();
create trigger update_member_positions_updated_at
  before update on member_positions
  for each row execute function update_updated_at_column();
create trigger update_bill_faction_votes_updated_at
  before update on bill_faction_votes
  for each row execute function update_updated_at_column();

comment on table factions is
  '会派。区の会派構成ページと、区の資料に出てくる過去の会派。取り込み処理が書き込む';
comment on table faction_names is
  '会派の名前の履歴。区の資料に書かれた名前から会派を引くために使う';
comment on table members is
  '議員（議員名簿にある公的な情報だけ。住所・電話・メール・顔写真は持たない）';
comment on table faction_memberships is
  '会派の所属の履歴。区の資料（本会議の質問者一覧・会派構成ページ）で確認できた日付の範囲だけを持つ';
comment on table member_positions is
  '今の役職（議長・副議長、委員会、会派の役職）。会派の役職は会派構成ページに書かれているものだけ';
comment on table bill_faction_votes is
  '議案への会派ごとの賛否。「議案の概要と審議結果」PDF の表から取り込む';
comment on column bill_faction_votes.faction_name is
  'その会期の凡例にある正式名称。略称は年によって意味が変わるため、表示にはこちらを使う';
