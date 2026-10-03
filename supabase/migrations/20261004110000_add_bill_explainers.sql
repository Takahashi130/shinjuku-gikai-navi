-- 議案の解説（運営者が作るデータ）
--
-- 元になるのはリポジトリの explainers/<会期slug>/<議案slug>.json で、
-- packages/navi-ops の explainers:sync がこのテーブルへ upsert する。
-- 区のサイトの取り込み処理（shinjuku-importer）はこのテーブルに一切書き込まない。
--
-- 公開の条件：status = 'published' かつ照合（reviewed_at / reviewed_by）が済んでいること。
-- 照合していないものを公開できないよう、DB の制約で守る。
-- 解説はファイルが元なので、議案を消したときは一緒に消えてよい（on delete cascade）。

create table bill_explainers (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null unique references bills(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'withdrawn')),
  -- 解説の本文（目的・背景・効果・論点・主な数字・資料に無いこと。各項目に出典と根拠の抜き出し）
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  -- 出典の一覧（資料名・区の HTML ページの URL・PDF のページ番号）
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  version integer not null default 1 check (version >= 1),
  -- body と sources から作るハッシュ。公開後に内容が変わったのに版が上がっていないことを見つける
  content_hash text not null,
  -- リポジトリ内の元ファイル（例: explainers/r8-teirei-3/r8-teirei-3-gian-63.json）
  source_path text,
  -- 作成した AI のモデル名など
  generated_by text,
  -- 資料との照合が済んだ日時と、照合した主体（例: 'ai-crosscheck'）
  reviewed_at timestamptz,
  reviewed_by text,
  -- 予約公開。null なら published になった時点で公開
  publish_at timestamptz,
  first_published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bill_explainers_published_requires_review check (
    status <> 'published' or (reviewed_at is not null and reviewed_by is not null)
  )
);

-- RLS有効化（ポリシーなし = デフォルト全拒否、アクセスはAdmin Client経由のみ）
alter table bill_explainers enable row level security;

create index idx_bill_explainers_status on bill_explainers (status);

create trigger update_bill_explainers_updated_at
  before update on bill_explainers
  for each row execute function update_updated_at_column();

comment on table bill_explainers is
  '議案の解説。explainers/ の JSON から navi-ops が同期する。取り込み処理は書き込まない';
comment on column bill_explainers.status is
  'draft: 下書き / published: 公開（照合済みが必須） / withdrawn: 取り下げ';
comment on column bill_explainers.reviewed_by is
  '資料との照合をした主体。AI による照合は ai-crosscheck';
