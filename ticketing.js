/* Northern Broadcast — Get My Ticket (manual bKash). Talks to Supabase using only the public anon key. */
(function () {
  'use strict';
  const C = window.NB_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sb = window.supabase && C.SUPABASE_URL && !/PASTE/.test(C.SUPABASE_URL)
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PRICE = 250;   // default ticket price (BDT) when an event has no entry_price
  const priceOf = e => Number(e && e.entry_price) > 0 ? Number(e.entry_price) : PRICE;
  const tk = n => '৳' + Number(n).toLocaleString('en-US');
  const today = () => new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);   // Dhaka date
  const fmtD = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'To Be Announced';
  const MSG = {
    EVENT_UNAVAILABLE: 'This event is not available.', SALES_CLOSED: 'Ticket sales are closed for this event.',
    PAST_EVENT: 'This event has already taken place.', TBA_EVENT: 'Tickets for this event are not available right now.',
    INVALID_NAME: 'Please enter your full name.', INVALID_MOBILE: 'Please enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).',
    INVALID_EMAIL: 'Please enter a valid email address.', EMAIL_REQUIRED: 'Email address is required.', INVALID_QTY: 'Please choose 1 to 10 tickets.',
    INVALID_BKASH_NUMBER: 'Please enter the valid bKash number you paid from.', TXN_REQUIRED: 'Please enter your bKash Transaction ID.',
    AMOUNT_MISMATCH: 'The amount does not match the total. Please enter the exact total amount.',
    DUPLICATE_TXN: 'This transaction ID has already been submitted.', FORBIDDEN: 'You do not have permission to do that.',
    NOT_PENDING: 'This order has already been processed.'
  };
  const errMsg = e => { const m = ((e && e.message) || '').match(/[A-Z_]{5,}/); return MSG[m && m[0]] || (navigator.onLine ? 'Something went wrong. Please try again.' : 'No internet connection. Please try again.'); };
  const note = (t, k = '') => `<div class="notice ${k}">${t}</div>`;
  const facts = rows => `<div class="facts">${rows.filter(r => r[1] != null && r[1] !== '').map(r => `<div><span class="k">${r[0]}</span><span class="v">${esc(r[1])}</span></div>`).join('')}</div>`;
  const badge = s => `<span class="badge ${String(s).toLowerCase()}">${s === 'PENDING' ? 'Pending' : s === 'APPROVED' ? 'Approved' : s === 'REJECTED' ? 'Rejected' : esc(s)}</span>`;

  // ---------- mount panels ----------
  const foot = $('footer.site');
  ['gmt', 'admin', 'verify'].forEach(id => { const s = document.createElement('section'); s.id = 'panel-' + id; s.className = 'panel tx'; s.hidden = true; foot.parentNode.insertBefore(s, foot); });
  const P = id => $('#panel-' + id);
  { const tp = $('#panel-tickets'); if (tp) tp.classList.add('tx'); }
  const go = id => window.show(id);
  // pre-order works with or without a date; normal sale needs a date + sales ON
  const state = e => e.event_date && e.event_date < today() ? 'past' : (e.event_date && e.sales_enabled) ? 'open' : e.pre_order_enabled ? 'preorder' : 'unavailable';
  const BTN = { open: 'Buy Ticket', preorder: 'Pre-Order Ticket', unavailable: 'Tickets Unavailable', past: 'Past Event' };

  // ---------- QR + e-ticket ----------
  function qrSvg(token) {
    const q = window.qrcode(0, 'M'); q.addData(location.origin + location.pathname + '?verify=' + token); q.make();
    let svg = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    if (!/viewBox/.test(svg)) { const m = svg.match(/width="(\d+)[^"]*"[^>]*height="(\d+)/); if (m) svg = svg.replace('<svg', `<svg viewBox="0 0 ${m[1]} ${m[2]}"`); }   // make sure the QR scales
    return svg;
  }
  function ticketHTML(t) {
    const logo = ($('img.logo') || {}).src || '';
    return `<div class="ticket"><div class="t-top">${logo ? `<img src="${logo}" alt="Northern Broadcast">` : '<b>NORTHERN BROADCAST</b>'}<span>E-TICKET</span></div>
      ${t.image ? `<img class="t-img" src="${esc(t.image)}" alt="">` : ''}
      <h3>${esc(t.event)}</h3>
      ${facts([['Date', fmtD(t.date)], ['Time', t.time], ['Venue', t.venue], ['Name', t.name], ['Mobile', t.mobile], ['Tickets', t.qty], ['Ticket ID', t.ticket_id]])}
      <div class="t-qr"><div class="qrbox">${qrSvg(t.token)}</div><small>Scan QR at the entry gate</small></div></div>`;
  }
  function ticketBlock(t) {
    const html = ticketHTML(t);
    return `<div class="tkt-wrap">${html}<div class="cta-row"><button class="cta" data-print>Download / Print Ticket</button></div>
      <p class="dim" style="font-size:.85rem">Tip: choose “Save as PDF” in the print window to download it.</p></div>`;
  }
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-print]')) return;
    const src = e.target.closest('.tkt-wrap').querySelector('.ticket');
    let a = $('#printarea'); if (!a) { a = document.createElement('div'); a.id = 'printarea'; a.className = 'tx'; document.body.appendChild(a); }
    a.innerHTML = ''; a.appendChild(src.cloneNode(true)); window.print();
  });

  // ---------- CUSTOMER: get my ticket ----------
  const S = { events: null, ev: null, qty: 1, tok: null, f: { n: '', m: '', e: '' } };
  const norm = x => String(x || '').replace(/[\s-]/g, '').replace(/^\+?88/, '');
  const isMob = x => /^01[3-9]\d{8}$/.test(norm(x)), isMail = x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
  const BK = () => C.BKASH_NUMBER || '01511588581';
  const buyable = e => ['open', 'preorder'].includes(state(e));
  async function loadEvents() {
    const { data, error } = await sb.from('events').select('*').eq('is_active', true);
    if (error) throw error;
    const rank = { open: 0, preorder: 0, unavailable: 1, past: 2 };
    S.events = (data || []).sort((a, b) => rank[state(a)] - rank[state(b)] || String(a.event_date).localeCompare(String(b.event_date)));
  }
  const poster = e => e.image_url ? `<img class="poster" src="${esc(e.image_url)}" alt="" loading="lazy">` :
    `<div class="poster ph"><span>${esc((e.name.split(/\s+/).map(w => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || 'NB').toUpperCase())}</span></div>`;
  const eventCard = e => {
    const s = state(e);
    return `<article class="ev-card">${poster(e)}<div class="ev-info"><h3>${esc(e.name)}</h3>
      ${e.type ? `<p class="ev-type">${esc(e.type)}</p>` : ''}<p>📅 ${fmtD(e.event_date)}</p>${e.event_time ? `<p>🕐 ${esc(e.event_time)}</p>` : ''}${e.venue ? `<p>📍 ${esc(e.venue)}</p>` : ''}
      <div class="ev-foot"><b class="price">${tk(priceOf(e))} <small>/ person</small></b>
      ${buyable(e) ? `<button class="cta" data-eid="${e.id}">${BTN[s]} →</button>` : `<span class="pill">${BTN[s]}</span>`}</div></div></article>`;
  };
  const mini = (e, extra = '') => `<div class="mini">${poster(e)}<div><b>${esc(e.name)}</b><p>📅 ${fmtD(e.event_date)}</p>${e.venue ? `<p>📍 ${esc(e.venue)}</p>` : ''}${extra}</div></div>`;

  async function openGMT(id) {
    go('gmt');
    if (!sb) { P('gmt').innerHTML = note('Online ticketing is being set up. Please contact us on WhatsApp: 01511588581.', 'err'); return; }
    P('gmt').innerHTML = '<p class="dim">Loading events…</p>';
    try { await loadEvents(); } catch (e) { P('gmt').innerHTML = note('Could not load events. Please refresh and try again.', 'err'); return; }
    const ev = id && (S.events.find(x => x.id === id) || S.events.find(x => x.code === id));   // event.id is canonical; code kept only as a fallback
    if (ev && buyable(ev)) return start(ev);
    screenList(ev ? note(`${esc(ev.name)}: ${BTN[state(ev)].toLowerCase()}.`) : '');
  }
  function screenList(top = '') {
    const logo = ($('img.logo') || {}).src || '', up = S.events.filter(e => state(e) !== 'past');
    P('gmt').innerHTML = `<section class="hero-tx">${logo ? `<img class="hero-logo" src="${logo}" alt="Northern Broadcast">` : ''}
      <h1>Live Music Brings People Together</h1><p>Concerts · Events · Unforgettable Moments</p><button class="cta big" id="hero-cta">Get My Ticket →</button></section>
      ${top}<div id="gmt-body"><h2 class="sec">Upcoming Events</h2><p class="dim">Select an event to book your ticket</p>
      ${up.length ? up.map(eventCard).join('') : '<p class="dim">No upcoming events right now. Check back soon.</p>'}</div>
      <div class="lk-box"><h2 class="sec">Already booked? Find your ticket</h2>
      <label class="field"><span>Order ID</span><input id="lk-o" placeholder="NB-ORD-000001" autocomplete="off"></label>
      <label class="field"><span>Mobile number used for the order</span><input id="lk-m" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX"></label>
      <button class="cta secondary" id="lk-go">Find my ticket</button><div id="lk-out" style="margin-top:20px"></div></div>`;
    $('#lk-go').onclick = lookup; $('#hero-cta').onclick = () => $('#gmt-body').scrollIntoView({ behavior: 'smooth' });
  }
  function start(ev) {
    S.ev = ev; S.qty = 1; S.f = { n: '', m: '', e: '' };
    S.tok = (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()) + Math.random();
    screenInfo();
  }
  function screenInfo() {
    const e = S.ev, pre = state(e) === 'preorder', bk = esc(BK()), unitPrice = priceOf(e); let touched = false;
    P('gmt').innerHTML = `<button class="back" id="back">← All events</button>${mini(e)}
      ${pre ? note('<b>Pre-Order</b><br>Your pre-order secures your ticket. The event date will appear on your e-ticket as soon as it is announced.', 'ok') : ''}
      <section class="co-card"><h2 class="co-h">YOUR INFORMATION</h2>
        <label class="field"><span>Full Name *</span><input id="f-n" autocomplete="name" placeholder="Enter your full name"></label>
        <label class="field"><span>Mobile Number *</span><input id="f-m" type="tel" inputmode="numeric" autocomplete="tel" placeholder="01XXXXXXXXX"></label>
        <label class="field"><span>Email Address *</span><input id="f-e" type="email" autocomplete="email" placeholder="Enter your email address"></label>
        <div class="field" style="margin-bottom:0"><span>Number of Tickets *</span><div class="qty"><button class="cta secondary" id="qm" aria-label="Fewer tickets">−</button><b id="qn">1</b><button class="cta secondary" id="qp" aria-label="More tickets">+</button></div></div>
      </section>
      <section class="co-card bk-hl"><h2 class="co-h">PAY VIA bKASH</h2>
        <div class="total-box"><span>Total amount to pay</span><b id="tt"></b><small id="tq"></small></div>
        <p class="lbl">Payment to:</p>
        <div class="bk-num"><b id="bk-n">${bk}</b><button class="cta secondary" id="bk-copy" type="button">Copy Number</button></div>
        <h3 class="co-sub">Payment Instructions</h3>
        <ol class="bk-steps"><li>Open your bKash app.</li><li>Select “Payment”.</li><li>Send the required amount to ${bk} through bKash Payment.</li><li>Complete the payment.</li><li>Enter your transaction details below.</li></ol>
      </section>
      <section class="co-card"><h2 class="co-h">PAYMENT DETAILS</h2>
        <label class="field"><span>bKash Sender Number *</span><input id="f-b" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX"></label>
        <label class="field"><span>Transaction ID *</span><input id="f-t" autocomplete="off" placeholder="Enter transaction ID"></label>
        <label class="field"><span>Amount Paid *</span><input id="f-a" type="number" inputmode="numeric" min="0" placeholder="৳${unitPrice}"></label>
        <div id="f-err"></div>
        <button class="cta big" id="f-go">Submit Payment →</button>
        <p class="pend-note">⏳ Your order will remain pending until our team verifies your bKash payment.</p>
      </section>`;
    const upd = () => { const t = unitPrice * S.qty; $('#qn').textContent = S.qty; $('#tt').textContent = tk(t); $('#tq').textContent = `${S.qty} × ${tk(unitPrice)}`; if (!touched) $('#f-a').value = t; };
    upd();
    $('#f-a').oninput = () => { touched = true; };
    $('#qm').onclick = () => { S.qty = Math.max(1, S.qty - 1); upd(); }; $('#qp').onclick = () => { S.qty = Math.min(10, S.qty + 1); upd(); };
    $('#back').onclick = () => screenList();
    $('#bk-copy').onclick = ev => {
      const b = ev.currentTarget, n = BK();
      b.textContent = 'Copied!'; b.classList.add('copied'); setTimeout(() => { b.textContent = 'Copy Number'; b.classList.remove('copied'); }, 1600);
      const fallback = () => { try { const t = document.createElement('textarea'); t.value = n; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } catch (x) {} };
      try { navigator.clipboard.writeText(n).catch(fallback); } catch (x) { fallback(); }
    };
    $('#f-go').onclick = submit;
  }
  async function submit() {
    const e = S.ev, v = id => $('#' + id).value.trim(), out = $('#f-err'), btn = $('#f-go'), total = priceOf(e) * S.qty;
    const bad = (id, m) => { out.innerHTML = note(esc(m), 'err'); const f = $('#' + id); if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
    if (v('f-n').length < 2) return bad('f-n', MSG.INVALID_NAME);
    if (!isMob(v('f-m'))) return bad('f-m', MSG.INVALID_MOBILE);
    if (!v('f-e')) return bad('f-e', MSG.EMAIL_REQUIRED);
    if (!isMail(v('f-e'))) return bad('f-e', MSG.INVALID_EMAIL);
    if (!isMob(v('f-b'))) return bad('f-b', MSG.INVALID_BKASH_NUMBER);
    if (!v('f-t')) return bad('f-t', MSG.TXN_REQUIRED);
    if (v('f-a') === '') return bad('f-a', 'Please enter the amount you paid.');
    if (Number(v('f-a')) !== total) return bad('f-a', `The amount must match the total (${tk(total)}).`);
    btn.disabled = true; btn.textContent = 'Submitting…'; out.innerHTML = '';
    const { data, error } = await sb.rpc('create_order', {
      p_event_id: e.id, p_name: v('f-n'), p_mobile: norm(v('f-m')), p_email: v('f-e'), p_qty: S.qty,
      p_bkash_number: norm(v('f-b')), p_txn: v('f-t'), p_amount: Number(v('f-a')), p_client_token: S.tok
    });
    if (error || !data || !data[0]) { out.innerHTML = note(esc(errMsg(error)), 'err'); btn.disabled = false; btn.textContent = 'Submit Payment →'; return; }
    const o = data[0], pre = state(e) === 'preorder';
    P('gmt').innerHTML = `<div class="done-card"><div class="tick">✓</div><h2 class="sec">Payment Verification Pending</h2>
      <p>Your payment information has been submitted successfully. Our team will verify your transaction.</p></div>
      ${facts([['Order ID', o.order_id], ['Event', o.event_name], ['Event date', fmtD(e.event_date)], ['Name', o.customer_name], ['Tickets', o.ticket_quantity], ['Total amount', tk(o.total_amount)], ['Status', 'Pending']])}
      <p class="dim">Save your Order ID. Use it with your mobile number under “Find your ticket” to check your status.${pre ? ' Your ticket will show “To Be Announced” until the date is confirmed.' : ''}</p>
      <button class="cta secondary" id="again">Back to events</button>`;
    $('#again').onclick = () => screenList(); window.scrollTo(0, 0);
  }
  function renderResult(r, el) {
    if (!r) { el.innerHTML = note('No order found. Please check your Order ID and mobile number.', 'err'); return; }
    const head = facts([['Order ID', r.order_id], ['Event', r.event.name], ['Name', r.customer_name], ['Tickets', r.ticket_quantity], ['Amount', tk(r.total_amount)]]);
    if (r.payment_status === 'PENDING') el.innerHTML = note('<b>Payment Verification Pending</b><br>We are verifying your bKash transaction. Please check again soon.') + head;
    else if (r.payment_status === 'REJECTED') el.innerHTML = note('<b>Payment Rejected</b><br>We could not verify your payment. Please contact us on WhatsApp: 01511588581.', 'err') + head;
    else el.innerHTML = ticketBlock({ event: r.event.name, date: r.event.date, time: r.event.time, venue: r.event.venue, image: r.event.image_url, name: r.customer_name, mobile: r.customer_mobile || '', qty: r.ticket_quantity, ticket_id: r.ticket_id, token: r.qr_token });
  }
  async function lookup() {
    const btn = $('#lk-go'), out = $('#lk-out'), o = $('#lk-o').value.trim(), m = $('#lk-m').value.trim();
    if (!o || !m) { out.innerHTML = note('Enter both your Order ID and mobile number.', 'err'); return; }
    btn.disabled = true; btn.textContent = 'Searching…';
    const { data, error } = await sb.rpc('lookup_order', { p_order_id: o, p_mobile: m });
    btn.disabled = false; btn.textContent = 'Find my ticket';
    if (error) out.innerHTML = note(esc(errMsg(error)), 'err'); else renderResult(data && Object.assign(data, { customer_mobile: m }), out);
  }

  // ---------- VERIFY (QR landing page) ----------
  async function isAdmin() { if (!sb) return false; const { data: { session } } = await sb.auth.getSession(); if (!session) return false; const { data } = await sb.rpc('is_admin'); return !!data; }
  function verdict(r) {
    const s = r && r.status;
    const [cls, txt] = s === 'VALID' ? ['ok', '✓ VALID TICKET'] : s === 'USED' ? ['warn', '⚠ TICKET ALREADY USED'] : ['err', '✕ INVALID TICKET'];
    return `<div class="verdict ${cls}">${txt}</div>` + (r && r.ticket_id ? facts([['Event', r.event], ['Ticket ID', r.ticket_id], ['Name', r.customer_name], ['Tickets', r.ticket_quantity], ['Event date', fmtD(r.event_date)]]) : '');
  }
  async function verifyPage(token) {
    go('verify'); const el = P('verify');
    el.innerHTML = '<h1>Northern Broadcast</h1><p class="dim">Verifying ticket…</p>';
    if (!sb) { el.innerHTML = '<h1>Northern Broadcast</h1>' + note('Verification is unavailable right now.', 'err'); return; }
    const { data, error } = await sb.rpc('verify_ticket', { p_token: token });
    const r = error ? { status: 'INVALID' } : data;
    el.innerHTML = '<h1>Northern Broadcast</h1>' + verdict(r) + '<div id="v-act"></div>';
    if (r.status === 'VALID' && await isAdmin()) {
      $('#v-act').innerHTML = '<button class="cta" id="v-use">Mark as Used</button>';
      $('#v-use').onclick = async ev => { ev.target.disabled = true; ev.target.textContent = 'Saving…'; const x = await sb.rpc('mark_ticket_used', { p_ticket_id: r.ticket_id }); el.innerHTML = '<h1>Northern Broadcast</h1>' + verdict({ ...r, status: x.error ? r.status : x.data }); };
    }
  }

  // ---------- ADMIN ----------
  const A = { orders: [], events: [], f: { q: '', st: '', ev: '', d: '' } };
  async function adminRoute() {
    const el = P('admin');
    if (!sb) { el.innerHTML = '<h1>Admin</h1>' + note('Supabase is not configured yet (config.js).', 'err'); return; }
    if (!(await isAdmin())) { const { data: { session } } = await sb.auth.getSession(); if (session) await sb.auth.signOut(); return login(session ? 'This account is not an authorized admin.' : ''); }
    dash();
  }
  function login(msg) {
    P('admin').innerHTML = `<div class="login-box"><h1>Admin Login</h1>${msg ? note(esc(msg), 'err') : ''}
      <label class="field"><span>Email</span><input id="a-e" type="email" autocomplete="username"></label>
      <label class="field"><span>Password</span><input id="a-p" type="password" autocomplete="current-password"></label>
      <div id="a-err"></div><button class="cta big" id="a-go">Log in</button></div>`;
    $('#a-go').onclick = async () => {
      const b = $('#a-go'); b.disabled = true; b.textContent = 'Logging in…';
      const { error } = await sb.auth.signInWithPassword({ email: $('#a-e').value.trim(), password: $('#a-p').value });
      if (error) { $('#a-err').innerHTML = note('Incorrect email or password.', 'err'); b.disabled = false; b.textContent = 'Log in'; } else adminRoute();
    };
  }
  function view(v) { $$('[data-view]').forEach(x => x.hidden = x.dataset.view !== v); $$('.adm-side nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); }
  async function dash() {
    P('admin').innerHTML = `<div class="adm"><aside class="adm-side"><div class="adm-brand"><b>Northern Broadcast</b><small>Admin Panel</small></div>
      <nav><button data-v="dash" class="on">▦ Dashboard</button><button data-v="orders">🎟 Ticket Orders</button><button data-v="events">📅 Events</button><button data-v="verify">✔ Verify Tickets</button></nav>
      <button class="lo" id="a-out">Log out</button></aside>
      <main class="adm-main">
      <section data-view="dash"><h2 class="sec">Dashboard</h2><div id="a-stats" class="stats"></div><h3 class="sec2">Pending payments</h3><div id="a-pend"><p class="dim">Loading…</p></div></section>
      <section data-view="orders" hidden><div class="oc-top"><h2 class="sec">Ticket Orders</h2><button class="cta secondary sm" id="a-csv">Export CSV</button></div>
        <div class="chips" id="a-chips">${['', 'PENDING', 'APPROVED', 'REJECTED'].map((s, i) => `<button data-st="${s}" class="${i ? '' : 'on'}">${s ? s[0] + s.slice(1).toLowerCase() : 'All'}</button>`).join('')}</div>
        <label class="field"><span>Search</span><input id="a-q" placeholder="Search by name, mobile, event…"></label>
        <div class="cta-row"><label class="field" style="flex:1;min-width:150px"><span>Event</span><select id="a-ev"></select></label>
        <label class="field" style="flex:1;min-width:150px"><span>Date</span><input id="a-d" type="date"></label></div>
        <div id="a-list"><p class="dim">Loading orders…</p></div></section>
      <section data-view="events" hidden><h2 class="sec">Events</h2><p class="dim">Pre-Order lets customers buy before a date is announced. Ticket prices are set per event.</p><div id="a-events"></div></section>
      <section data-view="verify" hidden><h2 class="sec">Verify Tickets</h2><div class="cta-row" style="align-items:flex-end"><label class="field" style="flex:1;min-width:200px;margin:0"><span>Ticket ID</span><input id="v-id" placeholder="NB-BTC26-000123"></label><button class="cta" id="v-go">Check</button></div><div id="v-res"></div>
      <p class="dim">To scan a QR code, use your phone camera. It opens the verification page, where you can mark the ticket as used while logged in.</p></section>
      </main></div>`;
    $$('.adm-side nav button').forEach(b => b.onclick = () => view(b.dataset.v));
    $('#a-out').onclick = async () => { await sb.auth.signOut(); login(); };
    $('#a-csv').onclick = csv;
    $('#a-chips').onclick = e => { const b = e.target.closest('[data-st]'); if (!b) return; A.f.st = b.dataset.st; $$('#a-chips button').forEach(x => x.classList.toggle('on', x === b)); list(); };
    $('#a-q').oninput = e => { A.f.q = e.target.value.toLowerCase(); list(); };
    $('#a-d').onchange = e => { A.f.d = e.target.value; list(); };
    $('#a-ev').onchange = e => { A.f.ev = e.target.value; list(); };
    $('#a-list').onclick = tblAct; $('#a-pend').onclick = tblAct; $('#a-events').onclick = evSave;
    $('#v-go').onclick = async () => {
      const r = await sb.rpc('admin_find_ticket', { p_ticket_id: $('#v-id').value }); const d = r.data || { status: 'INVALID' };
      $('#v-res').innerHTML = verdict(d) + (d.status === 'VALID' ? '<button class="cta" id="v-mu">Mark as Used</button>' : '');
      if (d.status === 'VALID') $('#v-mu').onclick = async ev => { ev.target.disabled = true; ev.target.textContent = 'Saving…'; const x = await sb.rpc('mark_ticket_used', { p_ticket_id: d.ticket_id }); $('#v-res').innerHTML = verdict({ ...d, status: x.error ? d.status : x.data }); };
    };
    await Promise.all([load(), stats()]);
  }
  async function stats() {
    const { data } = await sb.rpc('admin_stats', { p_event_id: null }); if (!data) return;
    const c = (l, v) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    $('#a-stats').innerHTML = c('Total orders', data.total_orders) + c('Pending', data.pending_orders) + c('Approved', data.approved_orders) + c('Rejected', data.rejected_orders) + c('Tickets sold', data.tickets_sold) + c('Revenue', tk(data.revenue));
  }
  async function load() {
    const [o, e] = await Promise.all([
      sb.from('ticket_orders').select('*,events!ticket_orders_event_id_fkey(name,event_date,event_time,venue,image_url),tickets!tickets_order_id_fkey(ticket_id,status,qr_token)').order('created_at', { ascending: false }),
      sb.from('events').select('*').order('event_date', { ascending: true, nullsFirst: false })]);
    if (o.error) { $('#a-list').innerHTML = note('Could not load orders.', 'err'); return; }
    A.orders = o.data.map(x => ({ ...x, t: [].concat(x.tickets || [])[0] || {} })); A.events = e.data || [];
    $('#a-ev').innerHTML = '<option value="">All events</option>' + A.events.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
    list(); evList();
    const pend = A.orders.filter(x => x.payment_status === 'PENDING');
    $('#a-pend').innerHTML = pend.length ? table(pend.slice(0, 8)) : '<p class="dim">No pending payments.</p>';
  }
  const filtered = () => A.orders.filter(o => (!A.f.st || o.payment_status === A.f.st) && (!A.f.ev || o.event_id === A.f.ev) &&
    (!A.f.d || new Date(o.created_at).toLocaleDateString('en-CA') === A.f.d) &&
    (!A.f.q || [o.order_id, o.t.ticket_id, o.customer_name, o.customer_mobile, o.customer_email, o.bkash_transaction_id, o.events && o.events.name].join(' ').toLowerCase().includes(A.f.q)));
  const table = rows => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Ticket ID</th><th>Customer</th><th>Mobile</th><th>Event</th><th>Qty</th><th>Amount</th><th>Transaction ID</th><th>Status</th><th>Action</th></tr></thead><tbody>
    ${rows.map((o, i) => `<tr><td data-l="#">${i + 1}</td><td data-l="Ticket ID">${esc(o.t.ticket_id)}</td><td data-l="Customer"><b>${esc(o.customer_name)}</b></td><td data-l="Mobile">${esc(o.customer_mobile)}</td><td data-l="Event">${esc(o.events && o.events.name)}</td><td data-l="Qty">${o.ticket_quantity}</td><td data-l="Amount">${tk(o.total_amount)}</td><td data-l="Transaction ID">${esc(o.bkash_transaction_id)}</td><td data-l="Status">${badge(o.payment_status)}</td><td data-l=""><button class="cta sm" data-oid="${esc(o.order_id)}">View</button></td></tr>`).join('')}</tbody></table></div>`;
  function list() { const r = filtered(); $('#a-list').innerHTML = r.length ? table(r) : '<p class="dim">No orders found.</p>'; }
  function tblAct(e) { const b = e.target.closest('[data-oid]'); if (b) openOrder(A.orders.find(x => x.order_id === b.dataset.oid)); }
  function openOrder(o) {
    const m = document.createElement('div'); m.className = 'tx modal'; const ev = o.events || {};
    m.innerHTML = `<div class="sheet"><button class="x" aria-label="Close">×</button><div class="oc-top"><h3>Order Details</h3>${badge(o.payment_status)}</div>
      ${facts([['Order ID', o.order_id], ['Ticket ID', o.t.ticket_id], ['Event', ev.name], ['Event date', fmtD(ev.event_date)], ['Customer', o.customer_name], ['Mobile', o.customer_mobile], ['Email', o.customer_email], ['Tickets', o.ticket_quantity], ['Total amount', tk(o.total_amount)], ['bKash transaction ID', o.bkash_transaction_id], ['bKash sender number', o.bkash_number], ['Order time', new Date(o.created_at).toLocaleString('en-GB')]])}
      ${o.payment_status === 'PENDING' ? '<div class="cta-row"><button class="cta ok" data-a="approve">✓ Approve</button><button class="cta no" data-a="reject">✕ Reject</button></div>' : ''}
      ${o.payment_status === 'APPROVED' ? ticketBlock({ event: ev.name, date: ev.event_date, time: ev.event_time, venue: ev.venue, image: ev.image_url, name: o.customer_name, mobile: o.customer_mobile, qty: o.ticket_quantity, ticket_id: o.t.ticket_id, token: o.t.qr_token }) : ''}</div>`;
    document.body.appendChild(m); document.body.style.overflow = 'hidden';
    const close = () => { m.remove(); document.body.style.overflow = ''; };
    m.onclick = async e => {
      if (e.target === m || e.target.closest('.x')) return close();
      const b = e.target.closest('[data-a]'); if (!b) return; const ap = b.dataset.a === 'approve';
      if (!confirm(ap ? `Approve payment for ${o.order_id}? The e-ticket will be activated.` : `Reject payment for ${o.order_id}?`)) return;
      b.disabled = true; b.textContent = ap ? 'Approving…' : 'Rejecting…';
      const { error } = await sb.rpc(ap ? 'approve_order' : 'reject_order', { p_order_id: o.order_id });
      if (error) alert(errMsg(error)); close(); await Promise.all([load(), stats()]);
    };
  }
  function evList() {
    $('#a-events').innerHTML = A.events.map(e => `<div class="ocard" data-e="${e.id}"><div class="oc-top"><b>${esc(e.name)}</b><span class="pill">${BTN[state(e)]}</span></div>
      <label class="field"><span>Date (leave blank for TBA)</span><input type="date" data-f="d" value="${e.event_date || ''}"></label>
      <p class="dim" style="margin:0 0 14px">Ticket price: <b>${tk(priceOf(e))}</b> per ticket</p>
      <label class="field"><span>Venue</span><input data-f="v" value="${esc(e.venue)}"></label>
      <label class="field"><span>Event image URL (optional)</span><input data-f="i" value="${esc(e.image_url)}"></label>
      <label class="sw"><input type="checkbox" data-f="o" ${e.pre_order_enabled ? 'checked' : ''}> Pre-Order ON</label>
      <label class="sw"><input type="checkbox" data-f="s" ${e.sales_enabled ? 'checked' : ''}> Ticket Sales ON</label>
      <button class="cta secondary" data-save>Save</button></div>`).join('');
  }
  async function evSave(e) {
    const b = e.target.closest('[data-save]'); if (!b) return;
    const c = b.closest('[data-e]'), g = f => $(`[data-f="${f}"]`, c);
    b.disabled = true; b.textContent = 'Saving…';
    const { error } = await sb.from('events').update({ event_date: g('d').value || null, venue: g('v').value.trim() || null,
      image_url: g('i').value.trim() || null, pre_order_enabled: g('o').checked, sales_enabled: g('s').checked }).eq('id', c.dataset.e);
    if (error) alert('Could not save. Please check the values and try again.');
    await load();
  }
  function csv() {
    const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const rows = [['Order ID', 'Ticket ID', 'Name', 'Mobile', 'Email', 'Event', 'Qty', 'Amount', 'bKash TrxID', 'Sender', 'Status', 'Created']]
      .concat(filtered().map(o => [o.order_id, o.t.ticket_id, o.customer_name, o.customer_mobile, o.customer_email, o.events && o.events.name, o.ticket_quantity, o.total_amount, o.bkash_transaction_id, o.bkash_number, o.payment_status, o.created_at]));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(r => r.map(cell).join(',')).join('\n')], { type: 'text/csv' }));
    a.download = 'northern-broadcast-orders.csv'; a.click();
  }

  // ---------- PUBLIC TICKETS PAGE (from the Supabase events table) ----------
  const FEATURED_CONCERT = {
    name: 'LINKIN PARK: LIVE IN NAOGAON',
    type: 'Outdoor Concert',
    event_date: '2026-10-23',
    event_time: '4:00 PM - 9:00 PM',
    venue: 'A-Team Field, Naogaon',
    entry_price: 5500,
    image_url: 'linkin-park-naogaon.jpg',
    _featured: true
  };

  const featuredCard = e => `<article class="ev-card featured-concert">${poster(e)}<div class="ev-info"><h3>${esc(e.name)}</h3>
    <p class="ev-type">${esc(e.type)}</p><p>📅 Friday, 23 October 2026</p><p>🕐 ${esc(e.event_time)}</p><p>📍 ${esc(e.venue)}</p>
    <div class="ev-foot"><b class="price">${tk(e.entry_price)} <small>/ person</small></b>
    <button class="cta" type="button" data-featured-preorder>Pre-Order Ticket →</button></div></div></article>`;

  async function renderTickets() {
    if (!sb) return;
    try { await loadEvents(); } catch (e) { return; }
    const up = S.events.filter(e => state(e) !== 'past');
    const dbFeatured = S.events.find(e => String(e.name).trim().toLowerCase() === FEATURED_CONCERT.name.toLowerCase());
    const featuredHtml = dbFeatured ? eventCard(dbFeatured) : featuredCard(FEATURED_CONCERT);
    P('tickets').innerHTML = '<h1>Tickets</h1><p class="dim">Select an event to book your ticket</p>' + featuredHtml + (up.length ? up.filter(e => !dbFeatured || e.id !== dbFeatured.id).map(eventCard).join('') : '');
    const featuredBtn = P('tickets').querySelector('[data-featured-preorder]');
    if (featuredBtn) featuredBtn.onclick = () => {
      P('tickets').innerHTML = '<h1>Tickets</h1>' + note('<b>LINKIN PARK: LIVE IN NAOGAON</b><br>Pre-order checkout will be enabled after the event is added to Supabase.', 'ok') + '<button class="cta secondary" id="featured-back">← Back to events</button>';
      $('#featured-back').onclick = renderTickets;
    };
  }

  // ---------- routing / wiring ----------
  function route() {
    const q = new URLSearchParams(location.search);
    if (q.get('verify')) return verifyPage(q.get('verify'));
    if (location.hash === '#admin') { go('admin'); adminRoute(); }
  }
  document.addEventListener('click', e => { const a = e.target.closest('[data-eid],[data-buy]'); if (a) { e.preventDefault(); openGMT(a.dataset.eid || a.dataset.buy); } });
  const tt = $('#tab-tickets'); if (tt) tt.addEventListener('click', renderTickets);
  const gt = $('#tab-gmt'); if (gt) gt.addEventListener('click', () => openGMT());
  window.addEventListener('hashchange', route);
  route();
  renderTickets();
})();
