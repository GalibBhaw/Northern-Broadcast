/* Northern Broadcast — Get My Ticket (manual bKash). Talks to Supabase using only the public anon key. */
(function () {
  'use strict';

  const C = window.NB_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const sb = window.supabase && C.SUPABASE_URL && !/PASTE/.test(C.SUPABASE_URL)
    ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY)
    : null;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  const tk = n => '৳' + Number(n).toLocaleString('en-US');

  const today = () =>
    new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);

  const fmtD = d =>
    d
      ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'To Be Announced';

  const MSG = {
    EVENT_UNAVAILABLE: 'This event is not available.',
    SALES_CLOSED: 'Ticket sales are closed for this event.',
    PAST_EVENT: 'This event has already taken place.',
    TBA_EVENT: 'This event is coming soon. Tickets are not on sale yet.',
    INVALID_NAME: 'Please enter your full name.',
    INVALID_MOBILE: 'Please enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).',
    INVALID_EMAIL: 'Please enter a valid email address.',
    INVALID_QTY: 'Please choose 1 to 10 tickets.',
    INVALID_BKASH_NUMBER: 'Please enter the valid bKash number you paid from.',
    TXN_REQUIRED: 'Please enter your bKash Transaction ID.',
    AMOUNT_MISMATCH: 'The amount does not match the total. Please enter the exact total amount.',
    DUPLICATE_TXN: 'This transaction ID has already been submitted.',
    FORBIDDEN: 'You do not have permission to do that.',
    NOT_PENDING: 'This order has already been processed.'
  };

  const errMsg = e => {
    const m = ((e && e.message) || '').match(/[A-Z_]{5,}/);
    return MSG[m && m[0]] ||
      (navigator.onLine
        ? 'Something went wrong. Please try again.'
        : 'No internet connection. Please try again.');
  };

  const note = (t, k = '') =>
    `<div class="notice ${k}">${t}</div>`;

  const facts = rows =>
    `<div class="facts">${
      rows
        .filter(r => r[1] != null && r[1] !== '')
        .map(r =>
          `<div><span class="k">${r[0]}</span><span class="v">${esc(r[1])}</span></div>`
        )
        .join('')
    }</div>`;

  const badge = s =>
    `<span class="badge ${String(s).toLowerCase()}">${
      s === 'PENDING'
        ? 'Pending'
        : s === 'APPROVED'
          ? 'Approved'
          : s === 'REJECTED'
            ? 'Rejected'
            : esc(s)
    }</span>`;

  // ---------- mount panels ----------

  const foot = $('footer.site');

  ['gmt', 'admin', 'verify'].forEach(id => {
    const s = document.createElement('section');
    s.id = 'panel-' + id;
    s.className = 'panel';
    s.hidden = true;
    foot.parentNode.insertBefore(s, foot);
  });

  const P = id => $('#panel-' + id);
  const go = id => window.show(id);

  // FIXED TICKET PRICE
  const TICKET_PRICE = 250;

  const priceTxt = e =>
    tk(TICKET_PRICE) + ' / person';

  // EVENT STATE
  const state = e => {
    if (e.event_date && e.event_date < today()) return 'past';

    if (e.sales_enabled) return 'open';

    if (e.pre_order_enabled) return 'preorder';

    return 'closed';
  };

  // ---------- QR + e-ticket ----------

  function qrSvg(token) {
    const q = window.qrcode(0, 'M');

    q.addData(
      location.origin +
      location.pathname +
      '?verify=' +
      token
    );

    q.make();

    return q.createSvgTag({
      cellSize: 4,
      margin: 0,
      scalable: true
    });
  }

  function ticketHTML(t) {
    const logo = ($('img.logo') || {}).src || '';

    return `<div class="ticket">
      <div class="t-top">
        ${
          logo
            ? `<img src="${logo}" alt="Northern Broadcast">`
            : '<b>NORTHERN BROADCAST</b>'
        }
        <span>E-TICKET</span>
      </div>

      ${t.image ? `<img class="t-img" src="${esc(t.image)}" alt="">` : ''}

      <h3>${esc(t.event)}</h3>

      ${facts([
        ['Date', fmtD(t.date)],
        ['Time', t.time],
        ['Venue', t.venue],
        ['Name', t.name],
        ['Mobile', t.mobile],
        ['Tickets', t.qty],
        ['Ticket ID', t.ticket_id]
      ])}

      <div class="t-qr">
        <div class="qrbox">${qrSvg(t.token)}</div>
        <small>Scan at the entrance</small>
      </div>
    </div>`;
  }

  function ticketBlock(t) {
    const html = ticketHTML(t);

    return `<div class="tkt-wrap">
      ${html}

      <div class="cta-row">
        <button class="cta" data-print>
          Download / Print Ticket
        </button>
      </div>

      <p class="dim" style="font-size:.85rem">
        Tip: choose “Save as PDF” in the print window to download it.
      </p>
    </div>`;
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-print]')) return;

    const src =
      e.target.closest('.tkt-wrap').querySelector('.ticket');

    let a = $('#printarea');

    if (!a) {
      a = document.createElement('div');
      a.id = 'printarea';
      document.body.appendChild(a);
    }

    a.innerHTML = '';
    a.appendChild(src.cloneNode(true));

    window.print();
  });

  // ---------- CUSTOMER ----------

  const S = {
    events: null,
    ev: null,
    qty: 1,
    tok: null
  };

  const body = () => $('#gmt-body');

  async function loadEvents() {
    const { data, error } =
      await sb
        .from('events')
        .select('*')
        .eq('is_active', true);

    if (error) throw error;

    const rank = {
      open: 0,
      preorder: 1,
      closed: 2,
      tba: 3,
      past: 4
    };

    S.events = (data || []).sort(
      (a, b) =>
        rank[state(a)] - rank[state(b)] ||
        String(a.event_date).localeCompare(
          String(b.event_date)
        )
    );
  }

  function shell() {
    P('gmt').innerHTML = `
      <h1>Get My Ticket</h1>

      <p>
        Pick an event, pay with bKash and receive your e-ticket once we verify your payment.
      </p>

      <div id="gmt-body"></div>

      <div class="subsection">
        <h2>Already booked? Find your ticket</h2>

        <label class="field">
          <span>Order ID</span>
          <input
            id="lk-o"
            placeholder="NB-ORD-000001"
            autocomplete="off">
        </label>

        <label class="field">
          <span>Mobile number used for the order</span>
          <input
            id="lk-m"
            type="tel"
            inputmode="numeric"
            placeholder="01XXXXXXXXX">
        </label>

        <button class="cta secondary" id="lk-go">
          Find my ticket
        </button>

        <div id="lk-out" style="margin-top:20px"></div>
      </div>
    `;

    $('#lk-go').onclick = lookup;
  }

  async function openGMT(code) {
    go('gmt');
    shell();
