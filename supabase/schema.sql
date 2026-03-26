-- Выполните в Supabase → SQL Editor → New query

create table if not exists public.det_results (
  id text primary key,
  payload jsonb not null,
  updated_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);

create index if not exists det_results_updated_at_idx on public.det_results (updated_at desc);

comment on table public.det_results is 'DET fake test: полный объект результата в payload';
