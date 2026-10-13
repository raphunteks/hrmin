-- SALINAN TERBACA (jangan dijalankan dari sini). Definisi efektif decide_approval ada di supabase/migrations/20261011000015_fase2_hardening.sql.
-- Ubah lewat migrasi baru, lalu jalankan: npm run gen:canonical

create or replace function public.decide_approval(
  p_id uuid, p_decision public.approval_status, p_note text default null, p_pin text default null, p_option text default null
) returns public.approvals
language plpgsql security definer set search_path = public, extensions as $$
declare a approvals; needs_pin boolean; my_hash text;
begin
  select tenant_id into a.tenant_id from approvals where id = p_id;
  if a.tenant_id is not null and tenant_ok(a.tenant_id) then perform _escalate_stale(a.tenant_id); end if;

  select * into a from approvals where id = p_id for update;
  if not found or not tenant_ok(a.tenant_id) then raise exception 'Persetujuan tidak ditemukan'; end if;
  if a.status <> 'pending' then raise exception 'Sudah diputuskan'; end if;
  if p_decision = 'pending' then raise exception 'Keputusan tidak valid'; end if;
  if not has_perm(a.feature, 'a') then raise exception 'Peran Anda tidak memiliki hak Approval untuk fitur %', a.feature; end if;
  if a.kind = 'void' and a.requested_by = auth.uid() then raise exception 'Anda tidak dapat memutuskan permintaan void yang Anda ajukan sendiri'; end if;
  if a.kind = 'void' and current_app_role() = 'gm' and (
       coalesce((a.detail->>'escalated_to_owner')::boolean, false)
       or a.requested_at < now() - make_interval(mins => (select void_escalate_minutes from tenants where id = a.tenant_id))) then
    raise exception 'Void ini dieskalasi ke Owner (melebihi kewenangan GM atau melewati batas waktu)';
  end if;

  select label like '%PIN%' into needs_pin from rbac_matrix where feature = a.feature and role = current_app_role();
  if needs_pin then
    select pin_hash into my_hash from profiles where id = auth.uid();
    if my_hash is null or p_pin is null or crypt(p_pin, my_hash) <> my_hash then raise exception 'PIN otorisasi salah'; end if;
  end if;

  if a.kind = 'void' and coalesce(btrim(p_note), '') = '' then raise exception 'Catatan alasan wajib diisi untuk void'; end if;
  if a.kind = 'void' and p_decision = 'approved' and coalesce(p_option, '') not in ('restock', 'waste') then
    raise exception 'Pilih: kembalikan bahan ke stok atau catat sebagai waste';
  end if;

  update approvals set status = p_decision, decided_by = auth.uid(), decided_at = now(), decision_note = p_note,
         detail = detail || jsonb_build_object('option', p_option)
  where id = p_id returning * into a;

  if a.kind = 'void' and p_decision = 'approved' and a.detail ? 'order_id' then
    perform _apply_void((a.detail->>'order_id')::uuid, p_option, p_note);
  elsif a.kind = 'po' and a.detail ? 'po_id' then
    update purchase_orders set status = case when p_decision = 'approved' then 'approved' else 'draft' end where id = (a.detail->>'po_id')::uuid;
  elsif a.kind = 'sto' and a.detail ? 'sto_id' then
    update stock_transfers set status = case when p_decision = 'approved' then 'approved' else 'cancelled' end, approved_by = auth.uid() where id = (a.detail->>'sto_id')::uuid;
  elsif a.kind = 'payroll' and a.detail ? 'run_id' then
    update payroll_runs set status = case when p_decision = 'approved' then 'approved' else 'rejected' end where id = (a.detail->>'run_id')::uuid;
    if p_decision = 'approved' then perform _on_payroll_approved((a.detail->>'run_id')::uuid); end if;
  elsif a.kind = 'supplies' then
    insert into audit_logs (tenant_id, actor_id, actor_role, action, entity, entity_id, detail)
    values (a.tenant_id, auth.uid(), current_app_role(), 'supplies_approval', 'approvals', a.id::text,
            jsonb_build_object('decision', p_decision, 'amount', a.amount, 'note', p_note));
  end if;
  return a;
end $$;
