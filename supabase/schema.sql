create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid references auth.users(id) on delete cascade,
  empresa text not null,
  responsavel text,
  whatsapp text,
  tipo text default 'Manipulação',
  porte text default 'Média',
  origem text default 'Prospecção ativa',
  regiao text,
  volume text,
  etapa text default 'Lead Novo',
  temperatura text default 'Morno',
  dor text,
  proxima_acao text,
  data_proxima_acao date,
  valor_estimado numeric default 0
);

alter table public.leads enable row level security;

drop policy if exists "Usuários acessam seus próprios leads" on public.leads;
create policy "Usuários acessam seus próprios leads"
on public.leads
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
