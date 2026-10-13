-- SALINAN TERBACA (jangan dijalankan dari sini). Definisi efektif dashboard_daily ada di supabase/migrations/20261011000010_foundation.sql.
-- Ubah lewat migrasi baru, lalu jalankan: npm run gen:canonical

create or replace function public.dashboard_daily(p_from date, p_to date, p_tenant uuid default null, p_branch uuid default null)
returns table (day date, branch_id uuid, branch_name text, orders bigint, revenue numeric, discount numeric, cogs numeric, opex numeric)
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.effective_tenant(p_tenant);
begin
  if not public.has_perm(2, 'r') then raise exception 'Akses ditolak: fitur 2'; end if;
  return query
  with days as (select generate_series(p_from, p_to, interval '1 day')::date d),
  sales as (
    select o.paid_at::date d, o.branch_id b, count(*) n, sum(o.total) rev, sum(o.discount) disc, sum(o.cogs) hpp
    from public.orders o
    where o.tenant_id = t and o.status = 'paid' and o.paid_at::date between p_from and p_to
      and (p_branch is null or o.branch_id = p_branch)
    group by 1, 2
  ),
  costs as (
    select e.entry_date d, e.branch_id b, sum(l.debit - l.credit) amt
    from public.journal_entries e
    join public.journal_lines l on l.entry_id = e.id
    join public.accounts a on a.id = l.account_id and a.type = 'expense'
    where e.tenant_id = t and e.entry_date between p_from and p_to
      and (p_branch is null or e.branch_id = p_branch)
    group by 1, 2
  )
  select days.d, br.id, br.name,
         coalesce(s.n, 0), coalesce(s.rev, 0), coalesce(s.disc, 0), coalesce(s.hpp, 0), coalesce(c.amt, 0)
  from days
  cross join public.branches br
  left join sales s on s.d = days.d and s.b = br.id
  left join costs c on c.d = days.d and c.b = br.id
  where br.tenant_id = t and not br.is_warehouse and (p_branch is null or br.id = p_branch)
    and public.branch_ok(br.id)   -- GM yang dibatasi cabang hanya melihat cabangnya
  order by 1, 3;
end $$;
