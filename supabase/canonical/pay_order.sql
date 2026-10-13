-- SALINAN TERBACA (jangan dijalankan dari sini). Definisi efektif pay_order ada di supabase/migrations/20261011000016_fase3_value_add.sql.
-- Ubah lewat migrasi baru, lalu jalankan: npm run gen:canonical

create or replace function public.pay_order(
  p_order uuid, p_payments jsonb, p_customer_phone text default null, p_discount numeric default null, p_pin text default null
) returns orders
language plpgsql security definer set search_path = public, extensions as $$
declare o orders; pay jsonb; paid numeric := 0; cash numeric := 0; noncash numeric := 0; v_tax numeric; v_total numeric; v_taxable numeric;
        change numeric; hpp numeric := 0; bl record; lvl numeric; it record; sid uuid; v_phone text; pts int;
        disc numeric; pct numeric; mx numeric; pol jsonb; auth_id uuid; jl jsonb;
begin
  perform _need(5, 'c');
  select * into o from orders where id = p_order for update;
  if not found or not tenant_ok(o.tenant_id) or not branch_ok(o.branch_id) then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status <> 'open' then raise exception 'Pesanan sudah dibayar atau dibatalkan'; end if;
  select id into sid from shifts where cashier_id = auth.uid() and status = 'open';
  if sid is null then raise exception 'Buka shift kasir dulu sebelum menerima pembayaran'; end if;

  -- Diskon: di atas batas efektif (Tenant → Cabang → Peran) wajib PIN GM cabang / Owner
  disc := coalesce(p_discount, o.discount, 0);
  if disc < 0 then raise exception 'Nominal diskon tidak valid'; end if;
  if disc > o.subtotal then raise exception 'Diskon tidak boleh melebihi subtotal'; end if;
  if disc > 0 and o.subtotal > 0 then
    pct := round(disc / o.subtotal * 100, 2);
    pol := get_effective_policy(o.tenant_id, o.branch_id, current_app_role());
    mx := coalesce((pol->>'max_discount_pct')::numeric, 15);
    if pct > mx and not (o.voucher_code is not null and p_discount is null and disc = o.discount) then
      if p_pin is null or btrim(p_pin) = '' then raise exception 'Diskon % melebihi batas kebijakan (%). Diperlukan PIN GM/Owner.', pct || '%', mx || '%'; end if;
      auth_id := _pin_authorizer(o.tenant_id, o.branch_id, p_pin);
      if auth_id is null then raise exception 'PIN otorisasi GM/Owner salah'; end if;
      insert into audit_logs (tenant_id, actor_id, actor_role, action, entity, entity_id, detail)
      values (o.tenant_id, auth.uid(), current_app_role(), 'discount_authorized', 'orders', o.id::text,
              jsonb_build_object('pct', pct, 'limit', mx, 'authorized_by', auth_id, 'order', o.code));
    end if;
  end if;

  -- Pajak dari pengaturan tenant (Fase 0.8) atas nilai setelah diskon; tagihan klinik selalu tanpa pajak.
  v_taxable := o.subtotal - disc;
  v_tax := case when o.channel = 'clinic' then 0 else round(v_taxable * public.tenant_tax_rate(o.tenant_id)) end;
  v_total := v_taxable + v_tax;

  for pay in select * from jsonb_array_elements(p_payments) loop
    if (pay->>'method') not in ('cash', 'card', 'qris', 'ewallet', 'transfer') then raise exception 'Metode tidak dikenal'; end if;
    if (pay->>'amount')::numeric <= 0 then raise exception 'Nominal pembayaran harus positif'; end if;
    paid := paid + (pay->>'amount')::numeric;
    if pay->>'method' = 'cash' then cash := cash + (pay->>'amount')::numeric; else noncash := noncash + (pay->>'amount')::numeric; end if;
  end loop;
  if paid < v_total then raise exception 'Pembayaran kurang %', _rp(v_total - paid); end if;
  change := paid - v_total;
  if change > cash then raise exception 'Kembalian hanya bisa dari pembayaran tunai'; end if;
  cash := cash - change;

  for pay in select * from jsonb_array_elements(p_payments) loop
    insert into payments (tenant_id, order_id, method, amount, reference)
    values (o.tenant_id, o.id, (pay->>'method')::pay_method,
            case when pay->>'method' = 'cash' then (pay->>'amount')::numeric - change else (pay->>'amount')::numeric end,
            nullif(pay->>'reference', ''));
    if pay->>'method' = 'cash' then change := 0; end if;
  end loop;

  for it in select product_id, sum(qty) q from order_items where order_id = o.id group by product_id loop
    for bl in select b.component_id, b.qty, i.cost_per_unit, i.min_qty, i.name from bom_lines b
              join inventory_items i on i.id = b.component_id where b.product_id = it.product_id loop
      lvl := _move(o.tenant_id, o.branch_id, bl.component_id, -(bl.qty * it.q), 'sale', o.code);
      hpp := hpp + bl.qty * it.q * bl.cost_per_unit;
      if lvl < bl.min_qty and lvl + bl.qty * it.q >= bl.min_qty then
        perform _hermes(o.tenant_id, 'whatsapp', 'GM', 'low_stock',
          format('%s di %s tersisa %s (minimum %s).', bl.name, (select name from branches where id = o.branch_id), round(lvl, 2), bl.min_qty));
      end if;
    end loop;
  end loop;

  v_phone := nullif(regexp_replace(coalesce(p_customer_phone, o.customer_phone, ''), '[^0-9+]', '', 'g'), '');
  update orders set status = 'paid', paid_at = now(), discount = disc, tax = v_tax, total = v_total, cogs = round(hpp), shift_id = sid, customer_phone = v_phone
  where id = o.id returning * into o;
  update shifts set cash_sales = cash_sales + cash, non_cash_sales = non_cash_sales + noncash where id = sid;
  update tables set status = 'dirty' where id = o.table_id;
  update prescriptions set status = 'dispensed', dispensed_at = now() where order_id = o.id and status = 'sent';

  -- CRM (fitur 15): 1 poin per Rp10.000 dari total yang dibayar; poin hanya naik lewat transaksi (customers_guard).
  if v_phone is not null then
    pts := floor(v_total / 10000);
    perform set_config('harumin.sys', '1', true);
    insert into customers (tenant_id, phone, name, points, total_spent, visits, last_visit_at)
    values (o.tenant_id, v_phone, o.customer_name, pts, v_total, 1, now())
    on conflict (tenant_id, phone) do update set points = customers.points + excluded.points,
      total_spent = customers.total_spent + excluded.total_spent, visits = customers.visits + 1, last_visit_at = now(),
      name = coalesce(customers.name, excluded.name);
    perform set_config('harumin.sys', '', true);
    perform _hermes(o.tenant_id, 'whatsapp', 'Pelanggan ' || left(v_phone, 4) || '••••' || right(v_phone, 3), 'receipt',
      format('Struk %s: total %s. +%s poin Harum.in.', o.code, _rp(v_total), pts));
  end if;

  -- Jurnal: diskon dicatat sebagai potongan penjualan (4102) agar pendapatan kotor tetap = subtotal.
  jl := jsonb_build_array(jsonb_build_object('code', '1101', 'dr', cash), jsonb_build_object('code', '1102', 'dr', noncash));
  if disc > 0 then jl := jl || jsonb_build_array(jsonb_build_object('code', '4102', 'dr', disc)); end if;
  jl := jl || jsonb_build_array(
    jsonb_build_object('code', '4101', 'cr', o.subtotal), jsonb_build_object('code', '2102', 'cr', o.tax),
    jsonb_build_object('code', '5101', 'dr', round(hpp)), jsonb_build_object('code', '1301', 'cr', round(hpp)));
  perform _journal(o.tenant_id, o.branch_id, 'Penjualan ' || o.code, 'pos', o.id, jl);
  return o;
end $$;
