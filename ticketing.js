/* Northern Broadcast — Get My Ticket
   Manual bKash + Supabase
   Pre-Order enabled + fixed ticket price BDT 250
*/
(function () {
  'use strict';

  const C = window.NB_CONFIG || {};

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const sb =
    window.supabase &&
    C.SUPABASE_URL &&
    !/PASTE/.test(C.SUPABASE_URL)
      ? window.supabase.createClient(
          C.SUPABASE_URL,
          C.SUPABASE_ANON_KEY
        )
      : null;

  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[c])
    );

  const tk = n => '৳' + Number(n).toLocaleString('en-US');

  const today = () =>
    new Date(Date.now() + 6 * 3600e3)
      .toISOString()
      .slice(0, 10);

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
    EVENT_UNAVAILABLE:
      'This event is not available.',

    SALES_CLOSED:
      'Ticket sales are closed for this event.',

    PAST_EVENT:
      'This event has already taken place.',

    TBA_EVENT:
      'This event is coming soon. Tickets are not on sale yet.',

    PREORDER_EVENT:
      'Pre-order is available for this event.',

    INVALID_NAME:
      'Please enter your full name.',

    INVALID_MOBILE:
      'Please enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).',

    INVALID_EMAIL:
      'Please enter a valid email address.',

    INVALID_QTY:
      'Please choose 1 to 10 tickets.',

    INVALID_BKASH_NUMBER:
      'Please enter the valid bKash number you paid from.',

    TXN_REQUIRED:
      'Please enter your bKash Transaction ID.',

    AMOUNT_MISMATCH:
      'The amount does not match the total. Please enter the exact total amount.',

    DUPLICATE_TXN:
      'This transaction ID has already been submitted.',

    FORBIDDEN:
      'You do not have permission to do that.',

    NOT_PENDING:
      'This order has already been processed.'
  };

  const errMsg = e => {
    const m =
      ((e && e.message) || '').match(/[A-Z_]{5,}/);

    return (
      MSG[m && m[0]] ||
      (
        navigator.onLine
          ? 'Something went wrong. Please try again.'
          : 'No internet connection. Please try again.'
      )
    );
  };

  const note = (t, k = '') =>
    `<div class="notice ${k}">${t}</div>`;

  const facts = rows =>
    `<div class="facts">${
      rows
        .filter(
          r =>
            r[1] != null &&
            r[1] !== ''
        )
        .map(
          r =>
            `<div>
              <span class="k">${r[0]}</span>
              <span class="v">${esc(r[1])}</span>
            </div>`
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

  /* =========================================================
     CONFIG
     ========================================================= */

  const TICKET_PRICE = 250;

  const priceTxt = e =>
    tk(TICKET_PRICE) + ' / person';

  /*
    Event states:

    past     = event date already passed
    open     = normal ticket sales
    preorder = pre-order available
    closed   = unavailable
  */

  const state = e => {
    if (
      e.event_date &&
      e.event_date < today()
    ) {
      return 'past';
    }

    if (e.sales_enabled) {
      return 'open';
    }

    if (e.pre_order_enabled) {
      return 'preorder';
    }

    return 'closed';
  };


  /* =========================================================
     PANELS
     ========================================================= */

  const foot = $('footer.site');

  ['gmt', 'admin', 'verify'].forEach(id => {
    const s = document.createElement('section');
    s.id = 'panel-' + id;
    s.className = 'panel';
    s.hidden = true;

    if (foot && foot.parentNode) {
      foot.parentNode.insertBefore(
        s,
        foot
      );
    }
  });

  const P = id => $('#panel-' + id);

  const go = id => {
    if (window.show) {
      window.show(id);
    }
  };


  /* =========================================================
     QR + E-TICKET
     ========================================================= */

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
    const logo =
      ($('img.logo') || {}).src || '';

    return `
      <div class="ticket">

        <div class="t-top">
          ${
            logo
              ? `<img src="${logo}" alt="Northern Broadcast">`
              : '<b>NORTHERN BROADCAST</b>'
          }

          <span>E-TICKET</span>
        </div>

        ${
          t.image
            ? `<img class="t-img" src="${esc(
                t.image
              )}" alt="">`
            : ''
        }

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
          <div class="qrbox">
            ${qrSvg(t.token)}
          </div>

          <small>Scan at the entrance</small>
        </div>

      </div>
    `;
  }

  function ticketBlock(t) {
    const html = ticketHTML(t);

    return `
      <div class="tkt-wrap">

        ${html}

        <div class="cta-row">
          <button
            class="cta"
            data-print
          >
            Download / Print Ticket
          </button>
        </div>

        <p
          class="dim"
          style="font-size:.85rem"
        >
          Tip: choose “Save as PDF”
          in the print window to download it.
        </p>

      </div>
    `;
  }

  document.addEventListener(
    'click',
    e => {
      if (
        !e.target.closest('[data-print]')
      ) {
        return;
      }

      const src =
        e.target
          .closest('.tkt-wrap')
          .querySelector('.ticket');

      let a = $('#printarea');

      if (!a) {
        a = document.createElement('div');
        a.id = 'printarea';
        document.body.appendChild(a);
      }

      a.innerHTML = '';
      a.appendChild(
        src.cloneNode(true)
      );

      window.print();
    }
  );


  /* =========================================================
     CUSTOMER TICKETING
     ========================================================= */

  const S = {
    events: null,
    ev: null,
    qty: 1,
    tok: null
  };

  const body = () =>
    $('#gmt-body');


  async function loadEvents() {
    const {
      data,
      error
    } = await sb
      .from('events')
      .select('*')
      .eq('is_active', true);

    if (error) {
      throw error;
    }

    const rank = {
      open: 0,
      preorder: 1,
      closed: 2,
      past: 3
    };

    S.events = (data || [])
      .sort(
        (a, b) =>
          rank[state(a)] -
            rank[state(b)] ||
          String(
            a.event_date
          ).localeCompare(
            String(
              b.event_date
            )
          )
      );
  }


  function shell() {
    P('gmt').innerHTML = `
      <h1>Get My Ticket</h1>

      <p>
        Pick an event, pay with bKash
        and receive your e-ticket
        once we verify your payment.
      </p>

      <div id="gmt-body"></div>

      <div class="subsection">

        <h2>
          Already booked?
          Find your ticket
        </h2>

        <label class="field">
          <span>Order ID</span>

          <input
            id="lk-o"
            placeholder="NB-ORD-000001"
            autocomplete="off"
          >
        </label>

        <label class="field">
          <span>
            Mobile number used for the order
          </span>

          <input
            id="lk-m"
            type="tel"
            inputmode="numeric"
            placeholder="01XXXXXXXXX"
          >
        </label>

        <button
          class="cta secondary"
          id="lk-go"
        >
          Find my ticket
        </button>

        <div
          id="lk-out"
          style="margin-top:20px"
        ></div>

      </div>
    `;

    $('#lk-go').onclick =
      lookup;
  }


  async function openGMT(code) {
    go('gmt');

    shell();

    if (!sb) {
      body().innerHTML =
        note(
          'Online ticketing is being set up. Please contact us on WhatsApp: 01511588581.',
          'err'
        );

      return;
    }

    body().innerHTML =
      '<p class="dim">Loading events…</p>';

    try {
      await loadEvents();
    } catch (e) {
      body().innerHTML =
        note(
          'Could not load events. Please refresh and try again.',
          'err'
        );

      return;
    }

    const ev =
      code &&
      S.events.find(
        x => x.code === code
      );

    if (
      ev &&
      (
        state(ev) === 'open' ||
        state(ev) === 'preorder'
      )
    ) {
      return pick(ev.id);
    }

    renderList(
      ev
        ? note(
            `${
              esc(ev.name)
            }: ${
              state(ev) === 'preorder'
                ? 'Pre-order is available.'
                : state(ev) === 'closed'
                ? 'Tickets are not available.'
                : 'This event is coming soon.'
            }`
          )
        : ''
    );
  }


  function renderList(top = '') {
    body().innerHTML =
      top +
      S.events
        .map(e => {

          const s = state(e);

          const button =
            s === 'open'
              ? `
                <button
                  class="cta"
                  data-pick="${e.id}"
                >
                  Get My Ticket
                </button>
              `
              : s === 'preorder'
              ? `
                <button
                  class="cta"
                  data-pick="${e.id}"
                >
                  Pre-Order Ticket
                </button>
              `
              : `
                <span class="pill">
                  ${
                    s === 'past'
                      ? 'Past Event'
                      : s === 'closed'
                      ? 'Ticket Sales Closed'
                      : 'Coming Soon'
                  }
                </span>
              `;

          return `
            <div class="session-block">

              ${facts([
                ['Event', e.name],
                ['Type', e.type],
                [
                  'Date',
                  e.event_date
                    ? fmtD(e.event_date)
                    : 'To Be Announced'
                ],
                ['Time', e.event_time],
                ['Venue', e.venue],
                ['Ticket', priceTxt(e)]
              ])}

              <div class="cta-row">
                ${button}
              </div>

            </div>
          `;
        })
        .join('');

    $$(
      '[data-pick]',
      body()
    ).forEach(b => {
      b.onclick = () =>
        pick(b.dataset.pick);
    });
  }


  function pick(id) {
    S.ev =
      S.events.find(
        e => e.id === id
      );

    S.qty = 1;

    S.tok =
      (
        crypto.randomUUID &&
        crypto.randomUUID()
      ) ||
      String(Date.now()) +
        Math.random();

    const e = S.ev;

    body().innerHTML = `
      <button
        class="cta secondary"
        id="back"
      >
        ← All events
      </button>

      <div
        style="margin-top:20px"
      >
        ${facts([
          ['Event', e.name],
          ['Date', fmtD(e.event_date)],
          ['Time', e.event_time],
          ['Venue', e.venue],
          ['Ticket price', priceTxt(e)]
        ])}
      </div>

      <div class="field">

        <span>
          Number of tickets
        </span>

        <div class="qty">

          <button
            class="cta secondary"
            id="qm"
            aria-label="Fewer"
          >
            −
          </button>

          <b id="qn">1</b>

          <button
            class="cta secondary"
            id="qp"
            aria-label="More"
          >
            +
          </button>

        </div>
      </div>

      <p>
        <b>
          Total:
          <span id="tot">
            ৳250
          </span>
        </b>
      </p>

      <label class="field">
        <span>
          Full name *
        </span>

        <input
          id="f-n"
          autocomplete="name"
        >
      </label>

      <label class="field">
        <span>
          Mobile number *
        </span>

        <input
          id="f-m"
          type="tel"
          inputmode="numeric"
          placeholder="01XXXXXXXXX"
          autocomplete="tel"
        >
      </label>

      <label class="field">
        <span>
          Email Address *
        </span>

        <input
          id="f-e"
          type="email"
          autocomplete="email"
          required
        >
      </label>

      <div class="notice ok">

        <b>
          Pay via bKash
        </b>

        <ol
          style="
            margin:8px 0 0 18px;
            padding:0
          "
        >

          <li>
            Open your bKash app.
          </li>

          <li>
            Send the required amount to
            <b>
              ${esc(
                C.BKASH_NUMBER ||
                '01511588581'
              )}
            </b>.
          </li>

          <li>
            Complete the payment.
          </li>

          <li>
            Enter your transaction
            details below.
          </li>

        </ol>

        <div
          class="facts"
          style="margin-top:10px"
        >

          <div>
            <span class="k">
              Payment number
            </span>

            <span class="v">
              ${esc(
                C.BKASH_NUMBER ||
                '01511588581'
              )}
            </span>
          </div>

          <div>
            <span class="k">
              Amount to send
            </span>

            <span
              class="v"
              id="tot2"
            >
              ৳250
            </span>
          </div>

        </div>

      </div>

      <label class="field">

        <span>
          bKash Transaction ID *
        </span>

        <input
          id="f-t"
          autocomplete="off"
        >

      </label>

      <label class="field">

        <span>
          bKash number you paid from *
        </span>

        <input
          id="f-b"
          type="tel"
          inputmode="numeric"
        >

      </label>

      <label class="field">

        <span>
          Amount paid (৳) *
        </span>

        <input
          id="f-a"
          type="number"
          inputmode="numeric"
          min="0"
        >

      </label>

      <div id="f-err"></div>

      <button
        class="cta"
        id="f-go"
      >
        Submit Payment
      </button>
    `;


    const upd = () => {

      $('#qn').textContent =
        S.qty;

      const total =
        TICKET_PRICE *
        S.qty;

      $('#tot').textContent =
        tk(total);

      $('#tot2').textContent =
        tk(total);
    };


    upd();


    $('#qm').onclick = () => {

      S.qty =
        Math.max(
          1,
          S.qty - 1
        );

      upd();
    };


    $('#qp').onclick = () => {

      S.qty =
        Math.min(
          10,
          S.qty + 1
        );

      upd();
    };


    $('#back').onclick =
      () => renderList();


    $('#f-go').onclick =
      () => submit();
  }


  async function submit() {

    const e = S.ev;

    const v = id =>
      $('#' + id)
        ? $('#' + id).value.trim()
        : '';

    const out =
      $('#f-err');

    const btn =
      $('#f-go');


    if (
      !e ||
      (
        state(e) !== 'open' &&
        state(e) !== 'preorder'
      )
    ) {
      out.innerHTML =
        note(
          esc(MSG.SALES_CLOSED),
          'err'
        );

      return;
    }


    const total =
      TICKET_PRICE *
      S.qty;

    const mob =
      v('f-m')
        .replace(
          /[\s-]/g,
          ''
        )
        .replace(
          /^\+?88/,
          ''
        );


    let m = '';


    if (
      v('f-n').length < 2
    ) {
      m = MSG.INVALID_NAME;

    } else if (
      !/^01[3-9]\d{8}$/.test(mob)
    ) {
      m = MSG.INVALID_MOBILE;

    } else if (
      !v('f-e')
    ) {
      m = MSG.INVALID_EMAIL;

    } else if (
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
        v('f-e')
      )
    ) {
      m = MSG.INVALID_EMAIL;

    } else if (
      !v('f-t')
    ) {
      m = MSG.TXN_REQUIRED;

    } else if (
      !/^01[3-9]\d{8}$/.test(
        v('f-b')
          .replace(
            /[\s-]/g,
            ''
          )
          .replace(
            /^\+?88/,
            ''
          )
      )
    ) {
      m =
        MSG.INVALID_BKASH_NUMBER;

    } else if (
      Number(v('f-a')) !== total
    ) {
      m =
        `The amount must match the total (${tk(total)}).`;
    }


    if (m) {

      out.innerHTML =
        note(
          esc(m),
          'err'
        );

      return;
    }


    btn.disabled = true;

    btn.textContent =
      'Submitting…';

    out.innerHTML = '';


    const {
      data,
      error
    } = await sb.rpc(
      'create_order',
      {
        p_event_id: e.id,
        p_name: v('f-n'),
        p_mobile: mob,
        p_email: v('f-e'),
        p_qty: S.qty,
        p_bkash_number: v('f-b'),
        p_txn: v('f-t'),
        p_amount: total,
        p_client_token: S.tok
      }
    );


    if (
      error ||
      !data ||
      !data[0]
    ) {

      out.innerHTML =
        note(
          esc(errMsg(error)),
          'err'
        );

      btn.disabled = false;

      btn.textContent =
        'Submit Payment';

      return;
    }


    const o =
      data[0];


    body().innerHTML =
      note(
        `<b>Payment Verification Pending</b>
        <br>
        Your payment information has been submitted successfully.
        Our team will verify your transaction.`,
        'ok'
      ) +

      facts([
        [
          'Order ID',
          o.order_id
        ],
        [
          'Event',
          o.event_name
        ],
        [
          'Name',
          o.customer_name
        ],
        [
          'Tickets',
          o.ticket_quantity
        ],
        [
          'Total amount',
          tk(o.total_amount)
        ],
        [
          'Payment status',
          'Pending'
        ]
      ]) +

      `
        <p class="dim">
          Save your Order ID.
          Use it with your mobile number
          under “Find your ticket”
          below to check your status.
        </p>
      `;

    window.scrollTo(
      0,
      0
    );
  }


  function renderResult(
    r,
    el
  ) {

    if (!r) {

      el.innerHTML =
        note(
          'No order found. Please check your Order ID and mobile number.',
          'err'
        );

      return;
    }


    const head =
      facts([
        [
          'Order ID',
          r.order_id
        ],
        [
          'Event',
          r.event.name
        ],
        [
          'Name',
          r.customer_name
        ],
        [
          'Tickets',
          r.ticket_quantity
        ],
        [
          'Amount',
          tk(r.total_amount)
        ]
      ]);


    if (
      r.payment_status ===
      'PENDING'
    ) {

      el.innerHTML =
        note(
          `<b>Payment Verification Pending</b>
          <br>
          We are verifying your bKash transaction.
          Please check again soon.`
        ) +
        head;

    } else if (
      r.payment_status ===
      'REJECTED'
    ) {

      el.innerHTML =
        note(
          `<b>Payment Rejected</b>
          <br>
          We could not verify your payment.
          Please contact us on WhatsApp:
          01511588581.`,
          'err'
        ) +
        head;

    } else {

      el.innerHTML =
        ticketBlock({
          event:
            r.event.name,

          date:
            r.event.event_date,

          time:
            r.event.event_time,

          venue:
            r.event.venue,

          image:
            r.event.image_url,

          name:
            r.customer_name,

          mobile:
            r.customer_mobile || '',

          qty:
            r.ticket_quantity,

          ticket_id:
            r.ticket_id,

          token:
            r.qr_token
        });
    }
  }


  async function lookup() {

    const btn =
      $('#lk-go');

    const out =
      $('#lk-out');

    const o =
      $('#lk-o').value.trim();

    const m =
      $('#lk-m').value.trim();


    if (!o || !m) {

      out.innerHTML =
        note(
          'Enter both your Order ID and mobile number.',
          'err'
        );

      return;
    }


    btn.disabled = true;

    btn.textContent =
      'Searching…';


    const {
      data,
      error
    } = await sb.rpc(
      'lookup_order',
      {
        p_order_id: o,
        p_mobile: m
      }
    );


    btn.disabled = false;

    btn.textContent =
      'Find my ticket';


    if (error) {

      out.innerHTML =
        note(
          esc(errMsg(error)),
          'err'
        );

    } else {

      renderResult(
        data &&
          Object.assign(
            data,
            {
              customer_mobile: m
            }
          ),
        out
      );
    }
  }


  /* =========================================================
     VERIFY QR
     ========================================================= */

  async function isAdmin() {

    if (!sb) {
      return false;
    }

    const {
      data: {
        session
      }
    } =
      await sb.auth.getSession();


    if (!session) {
      return false;
    }


    const {
      data
    } =
      await sb.rpc(
        'is_admin'
      );

    return !!data;
  }


  function verdict(r) {

    const s =
      r &&
      r.status;

    const [
      cls,
      txt
    ] =
      s === 'VALID'
        ? [
            'ok',
            '✓ VALID TICKET'
          ]
        : s === 'USED'
        ? [
            'warn',
            '⚠ TICKET ALREADY USED'
          ]
        : [
            'err',
            '✕ INVALID TICKET'
          ];


    return `
      <div
        class="verdict ${cls}"
      >
        ${txt}
      </div>

      ${
        r &&
        r.ticket_id
          ? facts([
              [
                'Event',
                r.event
              ],
              [
                'Ticket ID',
                r.ticket_id
              ],
              [
                'Name',
                r.customer_name
              ],
              [
                'Tickets',
                r.ticket_quantity
              ],
              [
                'Event date',
                r.event_date
                  ? fmtD(
                      r.event_date
                    )
                  : ''
              ]
            ])
          : ''
      }
    `;
  }


  async function verifyPage(
    token
  ) {

    go('verify');

    const el =
      P('verify');


    el.innerHTML =
      `
        <h1>
          Northern Broadcast
        </h1>

        <p class="dim">
          Verifying ticket…
        </p>
      `;


    if (!sb) {

      el.innerHTML =
        '<h1>Northern Broadcast</h1>' +
        note(
          'Verification is unavailable right now.',
          'err'
        );

      return;
    }


    const {
      data,
      error
    } =
      await sb.rpc(
        'verify_ticket',
        {
          p_token: token
        }
      );


    const r =
      error
        ? {
            status:
              'INVALID'
          }
        : data;


    el.innerHTML =
      '<h1>Northern Broadcast</h1>' +
      verdict(r) +
      '<div id="v-act"></div>';


    if (
      r.status === 'VALID' &&
      await isAdmin()
    ) {

      $('#v-act').innerHTML =
        `
          <button
            class="cta"
            id="v-use"
          >
            Mark as Used
          </button>
        `;


      $('#v-use').onclick =
        async ev => {

          ev.target.disabled =
            true;

          ev.target.textContent =
            'Saving…';


          const x =
            await sb.rpc(
              'mark_ticket_used',
              {
                p_ticket_id:
                  r.ticket_id
              }
            );


          el.innerHTML =
            '<h1>Northern Broadcast</h1>' +
            verdict({
              ...r,
              status:
                x.error
                  ? r.status
                  : x.data
            });
        };
    }
  }


  /* =========================================================
     ADMIN
     ========================================================= */

  const A = {
    orders: [],
    events: [],
    f: {
      q: '',
      st: '',
      ev: ''
    },
    open: null
  };


  async function adminRoute() {

    const el =
      P('admin');


    if (!sb) {

      el.innerHTML =
        '<h1>Admin</h1>' +
        note(
          'Supabase is not configured yet (config.js).',
          'err'
        );

      return;
    }


    if (!(await isAdmin())) {

      const {
        data: {
          session
        }
      } =
        await sb.auth.getSession();


      if (session) {
        await sb.auth.signOut();
      }


      return login(
        session
          ? 'This account is not an authorized admin.'
          : ''
      );
    }


    dash();
  }


  function login(msg) {

    P('admin').innerHTML =
      `
        <h1>
          Admin Login
        </h1>

        ${
          msg
            ? note(
                esc(msg),
                'err'
              )
            : ''
        }

        <label class="field">
          <span>Email</span>

          <input
            id="a-e"
            type="email"
            autocomplete="username"
          >
        </label>

        <label class="field">
          <span>Password</span>

          <input
            id="a-p"
            type="password"
            autocomplete="current-password"
          >
        </label>

        <div id="a-err"></div>

        <button
          class="cta"
          id="a-go"
        >
          Log in
        </button>
      `;


    $('#a-go').onclick =
      async () => {

        const b =
          $('#a-go');

        b.disabled = true;

        b.textContent =
          'Logging in…';


        const {
          error
        } =
          await sb.auth.signInWithPassword({
            email:
              $('#a-e').value.trim(),

            password:
              $('#a-p').value
          });


        if (error) {

          $('#a-err').innerHTML =
            note(
              'Incorrect email or password.',
              'err'
            );

          b.disabled = false;

          b.textContent =
            'Log in';

        } else {

          adminRoute();
        }
      };
  }


  async function dash() {

    P('admin').innerHTML =
      `
        <h1>
          Admin Dashboard
        </h1>

        <div class="cta-row">

          <button
            class="cta secondary"
            id="a-out"
          >
            Log out
          </button>

          <button
            class="cta secondary"
            id="a-csv"
          >
            Export CSV
          </button>

        </div>

        <div
          id="a-stats"
          class="stats"
        ></div>

        <div class="subsection">

          <h2>
            Verify a ticket
          </h2>

          <div
            class="cta-row"
            style="align-items:flex-end"
          >

            <label
              class="field"
              style="
                flex:1;
                min-width:200px;
                margin:0
              "
            >

              <span>
                Ticket ID
              </span>

              <input
                id="v-id"
                placeholder="NB-MH25-000123"
              >

            </label>

            <button
              class="cta secondary"
              id="v-go"
            >
              Check
            </button>

          </div>

          <div id="v-res"></div>

          <p
            class="dim"
            style="font-size:.85rem"
          >
            To scan a QR code,
            use your phone camera.
            It opens the verification page,
            where you can mark the ticket
            as used while logged in.
          </p>

        </div>

        <div class="subsection">

          <h2>
            Events &amp; ticket sales
          </h2>

          <p class="dim">
            Set a date, then turn
            Pre-Order on or open ticket
            sales for an event.
          </p>

          <div id="a-events"></div>

        </div>

        <div class="subsection">

          <h2>
            Ticket orders
          </h2>

          <label class="field">

            <span>
              Search
            </span>

            <input
              id="a-q"
              placeholder="Name, mobile, order, ticket or transaction ID"
            >

          </label>

          <div class="cta-row">

            <label
              class="field"
              style="
                flex:1;
                min-width:150px
              "
            >

              <span>
                Event
              </span>

              <select id="a-ev"></select>

            </label>

            <label
              class="field"
              style="
                flex:1;
                min-width:150px
              "
            >

              <span>
                Status
              </span>

              <select id="a-st">

                <option value="">
                  All
                </option>

                <option>
                  PENDING
                </option>

                <option>
                  APPROVED
                </option>

                <option>
                  REJECTED
                </option>

              </select>

            </label>

          </div>

          <div id="a-list">
            <p class="dim">
              Loading orders…
            </p>
          </div>

        </div>
      `;


    $('#a-out').onclick =
      async () => {
        await sb.auth.signOut();
        login();
      };


    $('#a-csv').onclick =
      csv;


    $('#a-q').oninput =
      e => {
        A.f.q =
          e.target.value
            .toLowerCase();

        list();
      };


    $('#a-st').onchange =
      e => {
        A.f.st =
          e.target.value;

        list();
      };


    $('#a-ev').onchange =
      e => {
        A.f.ev =
          e.target.value;

        list();
        stats();
      };


    $('#v-go').onclick =
      async () => {

        const r =
          await sb.rpc(
            'admin_find_ticket',
            {
              p_ticket_id:
                $('#v-id').value
            }
          );


        const d =
          r.data || {
            status:
              'INVALID'
          };


        $('#v-res').innerHTML =
          verdict(d) +
          (
            d.status === 'VALID'
              ? `
                <button
                  class="cta"
                  id="v-mu"
                >
                  Mark as Used
                </button>
              `
              : ''
          );


        if (
          d.status === 'VALID'
        ) {

          $('#v-mu').onclick =
            async ev => {

              ev.target.disabled =
                true;

              ev.target.textContent =
                'Saving…';


              const x =
                await sb.rpc(
                  'mark_ticket_used',
                  {
                    p_ticket_id:
                      d.ticket_id
                  }
                );


              $('#v-res').innerHTML =
                verdict({
                  ...d,
                  status:
                    x.error
                      ? d.status
                      : x.data
                });
            };
        }
      };


    $('#a-list').onclick =
      listAct;

    $('#a-events').onclick =
      evSave;


    await Promise.all([
      load(),
      stats()
    ]);
  }


  async function stats() {

    const {
      data
    } =
      await sb.rpc(
        'admin_stats',
        {
          p_event_id:
            A.f.ev || null
        }
      );


    if (!data) {
      return;
    }


    const c =
      (l, v) =>
        `
          <div class="stat">
            <b>${v}</b>
            <span>${l}</span>
          </div>
        `;


    $('#a-stats').innerHTML =
      c(
        'Total orders',
        data.total_orders
      ) +

      c(
        'Pending',
        data.pending_orders
      ) +

      c(
        'Approved',
        data.approved_orders
      ) +

      c(
        'Rejected',
        data.rejected_orders
      ) +

      c(
        'Tickets sold',
        data.tickets_sold
      ) +

      c(
        'Revenue',
        tk(data.revenue)
      );
  }


  async function load() {

    const [
      o,
      e
    ] =
      await Promise.all([

        sb
          .from('ticket_orders')
          .select(
            '*,events!ticket_orders_event_id_fkey(name,event_date,event_time,venue,image_url),tickets!tickets_order_id_fkey(ticket_id,status,qr_token)'
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          ),

        sb
          .from('events')
          .select('*')
          .order(
            'event_date',
            {
              ascending: true,
              nullsFirst: false
            }
          )

      ]);


    if (o.error) {

      $('#a-list').innerHTML =
        note(
          'Could not load orders.',
          'err'
        );

      return;
    }


    A.orders =
      o.data.map(
        x => ({
          ...x,
          t:
            [].concat(
              x.tickets || []
            )[0] || {}
        })
      );


    A.events =
      e.data || [];


    $('#a-ev').innerHTML =
      '<option value="">All events</option>' +
      A.events
        .map(
          x =>
            `
              <option
                value="${x.id}"
              >
                ${esc(x.name)}
              </option>
            `
        )
        .join('');


    list();

    evList();
  }


  function evList() {

    $('#a-events').innerHTML =
      A.events
        .map(
          e =>
            `
              <div
                class="ocard"
                data-e="${e.id}"
              >

                <b>
                  ${esc(e.name)}
                </b>

                <label class="field">

                  <span>
                    Date
                    (leave blank for TBA)
                  </span>

                  <input
                    type="date"
                    data-f="d"
                    value="${e.event_date || ''}"
                  >

                </label>

                <label class="field">

                  <span>
                    Ticket price
                  </span>

                  <input
                    type="text"
                    value="৳250"
                    readonly
                  >

                </label>

                <label class="field">

                  <span>
                    Venue
                  </span>

                  <input
                    data-f="v"
                    value="${esc(
                      e.venue
                    )}"
                  >

                </label>

                <label class="field">

                  <span>
                    Event image URL
                    (optional)
                  </span>

                  <input
                    data-f="i"
                    value="${esc(
                      e.image_url
                    )}"
                  >

                </label>

                <label class="field">

                  <span>

                    <input
                      type="checkbox"
                      data-f="s"
                      style="width:auto"
                      ${
                        e.sales_enabled
                          ? 'checked'
                          : ''
                      }
                    >

                    Ticket sales open

                  </span>

                </label>

                <label class="field">

                  <span>

                    <input
                      type="checkbox"
                      data-f="po"
                      style="width:auto"
                      ${
                        e.pre_order_enabled
                          ? 'checked'
                          : ''
                      }
                    >

                    Pre-Order available

                  </span>

                </label>

                <button
                  class="cta secondary"
                  data-save
                >
                  Save
                </button>

              </div>
            `
        )
        .join('');
  }


  async function evSave(e) {

    const b =
      e.target.closest(
        '[data-save]'
      );

    if (!b) {
      return;
    }


    const c =
      b.closest(
        '[data-e]'
      );


    const g =
      f =>
        $(
          `[data-f="${f}"]`,
          c
        );


    b.disabled = true;

    b.textContent =
      'Saving…';


    const {
      error
    } =
      await sb
        .from('events')
        .update({
          event_date:
            g('d').value ||
            null,

          entry_price:
            TICKET_PRICE,

          venue:
            g('v').value.trim() ||
            null,

          image_url:
            g('i').value.trim() ||
            null,

          sales_enabled:
            g('s').checked,

          pre_order_enabled:
            g('po').checked
        })
        .eq(
          'id',
          c.dataset.e
        );


    if (error) {

      alert(
        'Could not save. Please check the values and try again.'
      );

      b.disabled = false;

      b.textContent =
        'Save';

      return;
    }


    await load();
  }


  const filtered =
    () =>
      A.orders.filter(
        o =>
          (
            !A.f.st ||
            o.payment_status ===
              A.f.st
          ) &&

          (
            !A.f.ev ||
            o.event_id ===
              A.f.ev
          ) &&

          (
            !A.f.q ||
            [
              o.order_id,
              o.t.ticket_id,
              o.customer_name,
              o.customer_mobile,
              o.customer_email,
              o.bkash_transaction_id
            ]
              .join(' ')
              .toLowerCase()
              .includes(
                A.f.q
              )
          )
      );


  function list() {

    const rows =
      filtered();


    $('#a-list').innerHTML =
      rows.length
        ? rows
            .map(
              o =>
                `
                  <div
                    class="ocard"
                    data-i="${o.order_id}"
                  >

                    <div class="oc-top">

                      <b>
                        ${esc(
                          o.customer_name
                        )}
                      </b>

                      ${badge(
                        o.payment_status
                      )}

                    </div>

                    ${facts([
                      [
                        'Order ID',
                        o.order_id
                      ],
                      [
                        'Ticket ID',
                        o.t.ticket_id
                      ],
                      [
                        'Mobile',
                        o.customer_mobile
                      ],
                      [
                        'Email',
                        o.customer_email
                      ],
                      [
                        'Event',
                        o.events &&
                          o.events.name
                      ],
                      [
                        'Qty',
                        o.ticket_quantity
                      ],
                      [
                        'Amount',
                        tk(
                          o.total_amount
                        )
                      ],
                      [
                        'Transaction ID',
                        o.bkash_transaction_id
                      ],
                      [
                        'Date',
                        new Date(
                          o.created_at
                        ).toLocaleString(
                          'en-GB'
                        )
                      ]
                    ])}

                    <div class="cta-row">

                      <button
                        class="cta secondary"
                        data-a="view"
                      >
                        View
                      </button>

                      ${
                        o.payment_status ===
                        'PENDING'
                          ? `
                            <button
                              class="cta"
                              data-a="approve"
                            >
                              Approve
                            </button>

                            <button
                              class="cta secondary"
                              data-a="reject"
                            >
                              Reject
                            </button>
                          `
                          : ''
                      }

                      ${
                        o.payment_status ===
                        'APPROVED'
                          ? `
                            <button
                              class="cta secondary"
                              data-a="ticket"
                            >
                              E-ticket
                            </button>
                          `
                          : ''
                      }

                    </div>

                    <div
                      class="oc-more"
                    ></div>

                  </div>
                `
            )
            .join('')
        : '<p class="dim">No orders found.</p>';
  }


  async function listAct(e) {

    const b =
      e.target.closest(
        '[data-a]'
      );

    if (!b) {
      return;
    }


    const card =
      b.closest(
        '.ocard'
      );


    const o =
      A.orders.find(
        x =>
          x.order_id ===
          card.dataset.i
      );


    const more =
      $('.oc-more', card);

    const a =
      b.dataset.a;


    if (a === 'view') {

      more.innerHTML =
        more.innerHTML
          ? ''
          : facts([
              [
                'Event date',
                o.events &&
                  fmtD(
                    o.events
                      .event_date
                  )
              ],
              [
                'Email',
                o.customer_email
              ],
              [
                'Ticket price',
                tk(
                  o.ticket_price ||
                    TICKET_PRICE
                )
              ],
              [
                'bKash number (sender)',
                o.bkash_number
              ],
              [
                'Ticket status',
                o.t.status
              ],
              [
                'Payment status',
                o.payment_status
              ]
            ]);

    } else if (
      a === 'ticket'
    ) {

      more.innerHTML =
        more.innerHTML
          ? ''
          : ticketBlock({
              event:
                o.events.name,

              date:
                o.events.event_date,

              time:
                o.events.event_time,

              venue:
                o.events.venue,

              image:
                o.events.image_url,

              name:
                o.customer_name,

              mobile:
                o.customer_mobile,

              qty:
                o.ticket_quantity,

              ticket_id:
                o.t.ticket_id,

              token:
                o.t.qr_token
            });

    } else {

      const ap =
        a === 'approve';


      if (
        !confirm(
          ap
            ? `Approve payment for ${o.order_id}? The e-ticket will be activated.`
            : `Reject payment for ${o.order_id}?`
        )
      ) {
        return;
      }


      b.disabled = true;

      b.textContent =
        ap
          ? 'Approving…'
          : 'Rejecting…';


      const {
        error
      } =
        await sb.rpc(
          ap
            ? 'approve_order'
            : 'reject_order',
          {
            p_order_id:
              o.order_id
          }
        );


      if (error) {
        alert(
          errMsg(error)
        );
      }


      await Promise.all([
        load(),
        stats()
      ]);
    }
  }


  function csv() {

    const cell =
      v => {

        let s =
          String(
            v ?? ''
          );


        if (
          /^[=+\-@]/.test(
            s
          )
        ) {
          s =
            "'" + s;
        }


        return (
          '"' +
          s.replace(
            /"/g,
            '""'
          ) +
          '"'
        );
      };


    const rows = [
      [
        'Order ID',
        'Ticket ID',
        'Name',
        'Mobile',
        'Email',
        'Event',
        'Qty',
        'Amount',
        'bKash TrxID',
        'Sender',
        'Status',
        'Created'
      ]
    ].concat(
      filtered().map(
        o => [
          o.order_id,
          o.t.ticket_id,
          o.customer_name,
          o.customer_mobile,
          o.customer_email,
          o.events &&
            o.events.name,
          o.ticket_quantity,
          o.total_amount,
          o.bkash_transaction_id,
          o.bkash_number,
          o.payment_status,
          o.created_at
        ]
      )
    );


    const a =
      document.createElement(
        'a'
      );


    a.href =
      URL.createObjectURL(
        new Blob(
          [
            '\ufeff' +
              rows
                .map(
                  r =>
                    r
                      .map(cell)
                      .join(',')
                )
                .join('\n')
          ],
          {
            type:
              'text/csv'
          }
        )
      );


    a.download =
      'northern-broadcast-orders.csv';

    a.click();
  }


  /* =========================================================
     PUBLIC TICKETS PAGE
     ========================================================= */

  async function renderTickets() {

    if (!sb) {
      return;
    }


    try {
      await loadEvents();
    } catch (e) {
      return;
    }


    const up =
      S.events.filter(
        e =>
          state(e) !==
          'past'
      );


    P('tickets').innerHTML =
      '<h1>Tickets</h1>' +
      '<h2 style="margin:8px 0 20px">Upcoming Concerts</h2>' +

      (
        up.length

          ? up
              .map(
                e => {

                  const s =
                    state(e);


                  const button =
                    s === 'open'

                      ? `
                        <a
                          class="cta"
                          href="#get-my-ticket"
                          data-buy="${esc(
                            e.code
                          )}"
                        >
                          Get My Ticket
                        </a>
                      `

                      : s === 'preorder'

                      ? `
                        <a
                          class="cta"
                          href="#get-my-ticket"
                          data-buy="${esc(
                            e.code
                          )}"
                        >
                          Pre-Order Ticket
                        </a>
                      `

                      : `
                        <span
                          class="pill"
                        >
                          ${
                            s === 'closed'
                              ? 'Ticket Sales Closed'
                              : 'Coming Soon'
                          }
                        </span>
                      `;


                  return `
                    <div
                      class="session-block"
                    >

                      ${facts([
                        [
                          'Event',
                          e.name
                        ],
                        [
                          'Type',
                          e.type
                        ],
                        [
                          'Date',
                          e.event_date
                            ? fmtD(
                                e.event_date
                              )
                            : 'To Be Announced'
                        ],
                        [
                          'Time',
                          e.event_time
                        ],
                        [
                          'Entry',
                          priceTxt(e)
                        ],
                        [
                          /acoustic/i.test(
                            e.name
                          )
                            ? 'Artist'
                            : 'Band',
                          e.band
                        ],
                        [
                          'Venue',
                          e.venue
                        ]
                      ])}

                      <div class="cta-row">
                        ${button}
                      </div>

                    </div>
                  `;
                }
              )
              .join('')

          : `
            <p class="dim">
              No upcoming concerts right now.
              Check back soon.
            </p>
          `
      );
  }


  /* =========================================================
     ROUTING
     ========================================================= */

  function route() {

    const q =
      new URLSearchParams(
        location.search
      );


    if (
      q.get('verify')
    ) {

      return verifyPage(
        q.get('verify')
      );
    }


    if (
      location.hash ===
      '#admin'
    ) {

      go('admin');

      adminRoute();
    }
  }


  document.addEventListener(
    'click',
    e => {

      const a =
        e.target.closest(
          '[data-buy]'
        );


      if (a) {

        e.preventDefault();

        openGMT(
          a.dataset.buy
        );
      }
    }
  );


  const tt =
    $('#tab-tickets');


  if (tt) {
    tt.addEventListener(
      'click',
      renderTickets
    );
  }


  const gt =
    $('#tab-gmt');


  if (gt) {
    gt.addEventListener(
      'click',
      () =>
        openGMT()
    );
  }


  window.addEventListener(
    'hashchange',
    route
  );


  route();

  renderTickets();

})();
