-- =====================================================================
-- Northern Broadcast — PRE-ORDER + FIXED ৳250 PRICE MIGRATION
-- Run ONCE in Supabase -> SQL Editor. Safe to re-run.
-- Changes: adds events.pre_order_enabled, fixes every event at ৳250,
-- and replaces create_order() (same name + parameters as before).
-- Does NOT touch tables' data for orders/tickets, RLS policies, admin
-- functions, approve/reject, lookup, verify or the audit log.
-- Do NOT re-run the old supabase.sql afterwards (it would restore the old create_order).
-- =====================================================================

-- 1) Pre-order switch on events
alter table public.events add column if not exists pre_order_enabled boolean not null default false;

-- 2) One fixed price for all events: ৳250 (entry_price kept only for compatibility)
update public.events set entry_price = 250 where entry_price is distinct from 250;
alter table public.events alter column entry_price set default 250;
alter table public.events alter column entry_price set not null;
alter table public.events drop constraint if exists events_fixed_price;
alter table public.events add constraint events_fixed_price check (entry_price = 250);

-- 3) Example from your brief: Bijoy Tarunno = date TBA, Pre-Order ON, Ticket Sales OFF
update public.events set pre_order_enabled = true, sales_enabled = false where code = 'BTC26';

-- 4) create_order — same signature and return columns; the frontend call is unchanged.
--    Rules: price is always 250 x quantity; name, mobile, EMAIL, bKash sender number,
--    transaction ID and exact amount are all required; duplicate transaction IDs blocked;
--    TBA-date events are orderable only when pre_order_enabled = true;
--    dated events need sales_enabled = true and must not be in the past.
--    Every order starts as PENDING (no free/auto-approved orders any more).
create or replace function public.create_order(
  p_event_id uuid, p_name text, p_mobile text, p_email text, p_qty int,
  p_bkash_number text, p_txn text, p_amount numeric, p_client_token text)
returns table (order_id text, ticket_id text, payment_status text, total_amount numeric,
               event_name text, ticket_quantity int, customer_name text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  c_price constant numeric := 250;
  e public.events;
  v_mobile text := regexp_replace(regexp_replace(coalesce(p_mobile,''), '[\s-]', '', 'g'), '^\+?88', '');
  v_bk text := regexp_replace(regexp_replace(coalesce(p_bkash_number,''), '[\s-]', '', 'g'), '^\+?88', '');
  v_txn text := nullif(upper(trim(coalesce(p_txn,''))), '');
  v_total numeric; v_oid uuid;
begin
  if p_client_token is not null then
    select id into v_oid from ticket_orders where client_token = p_client_token;
  end if;

  if v_oid is null then
    select * into e from events where id = p_event_id and is_active;
    if not found then raise exception 'EVENT_UNAVAILABLE'; end if;

    if e.event_date is null then
      if not e.pre_order_enabled then raise exception 'TBA_EVENT'; end if;      -- pre-order mode
    else
      if e.event_date < (now() at time zone 'Asia/Dhaka')::date then raise exception 'PAST_EVENT'; end if;
      if not e.sales_enabled then raise exception 'SALES_CLOSED'; end if;        -- normal sale mode
    end if;

    if length(trim(coalesce(p_name,''))) < 2 then raise exception 'INVALID_NAME'; end if;
    if v_mobile !~ '^01[3-9][0-9]{8}$' then raise exception 'INVALID_MOBILE'; end if;
    if nullif(trim(coalesce(p_email,'')),'') is null
       or trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
    if p_qty is null or p_qty < 1 or p_qty > 10 then raise exception 'INVALID_QTY'; end if;
    if v_bk !~ '^01[3-9][0-9]{8}$' then raise exception 'INVALID_BKASH_NUMBER'; end if;
    if v_txn is null then raise exception 'TXN_REQUIRED'; end if;

    v_total := c_price * p_qty;
    if p_amount is distinct from v_total then raise exception 'AMOUNT_MISMATCH'; end if;
    if exists (select 1 from ticket_orders o where upper(o.bkash_transaction_id) = v_txn) then
      raise exception 'DUPLICATE_TXN'; end if;

    begin
      insert into ticket_orders (event_id, customer_name, customer_mobile, customer_email, ticket_quantity,
        ticket_price, total_amount, bkash_number, bkash_transaction_id, payment_status, client_token)
      values (e.id, trim(p_name), v_mobile, trim(p_email), p_qty,
        c_price, v_total, v_bk, v_txn, 'PENDING', p_client_token)
      returning id into v_oid;
    exception when unique_violation then
      select id into v_oid from ticket_orders where client_token = p_client_token;
      if v_oid is null then raise exception 'DUPLICATE_TXN'; end if;
    end;

    insert into tickets (ticket_id, order_id, event_id, customer_name, customer_mobile, ticket_quantity, status, qr_token)
    select 'NB-' || e.code || '-' || lpad(nextval('ticket_seq')::text, 6, '0'), v_oid, e.id, trim(p_name), v_mobile, p_qty,
           'PENDING', null
    where not exists (select 1 from tickets t where t.order_id = v_oid);
  end if;

  return query
    select o.order_id, t.ticket_id, o.payment_status, o.total_amount, ev.name, o.ticket_quantity, o.customer_name
    from ticket_orders o join tickets t on t.order_id = o.id join events ev on ev.id = o.event_id
    where o.id = v_oid;
end $$;

revoke execute on function public.create_order(uuid,text,text,text,int,text,text,numeric,text) from public, anon, authenticated;
grant execute on function public.create_order(uuid,text,text,text,int,text,text,numeric,text) to anon, authenticated;
