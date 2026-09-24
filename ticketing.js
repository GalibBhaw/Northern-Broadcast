/* Northern Broadcast — Get My Ticket
   Manual bKash + Supabase
   Pre-Order supported
   Fixed ticket price: BDT 250
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

  /* =========================
     FIXED TICKET PRICE
     ========================= */

  const TICKET_PRICE = 250;

  const BKASH_NUMBER =
    C.BKASH_NUMBER || '01511588581';


  /* =========================
     HELPERS
     ========================= */

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

  const tk = n =>
    '৳' +
    Number(n || 0).toLocaleString('en-US');

  const today = () =>
    new Date(
      Date.now() + 6 * 3600e3
    )
      .toISOString()
      .slice(0, 10);

  const fmtD = d =>
    d
      ? new Date(
          d + 'T00:00:00'
        ).toLocaleDateString(
          'en-GB',
          {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }
        )
      : 'To Be Announced';

  const priceTxt = () =>
    tk(TICKET_PRICE) +
    ' / person';


  /* =========================
     MESSAGES
     ========================= */

  const MSG = {

    EVENT_UNAVAILABLE:
      'This event is not available.',

    SALES_CLOSED:
      'Ticket sales are closed for this event.',

    PAST_EVENT:
      'This event has already taken place.',

    INVALID_NAME:
      'Please enter your full name.',

    INVALID_MOBILE:
      'Please enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).',

    INVALID_EMAIL:
      'Please enter a valid email address.',

    INVALID_BKASH_NUMBER:
      'Please enter the valid bKash number you paid from.',

    TXN_REQUIRED:
      'Please enter your bKash Transaction ID.'

  };


  const errMsg = e => {

    const m =
      ((e && e.message) || '')
        .match(/[A-Z_]{5,}/);

    return (
      MSG[m && m[0]] ||
      (
        navigator.onLine
          ? (
              (e && e.message) ||
              'Something went wrong. Please try again.'
            )
          : 'No internet connection. Please try again.'
      )
    );
  };


  const note = (
    t,
    k = ''
  ) =>
    `<div class="notice ${k}">
      ${t}
    </div>`;


  const facts = rows =>
    `<div class="facts">
      ${
        rows
          .filter(
            r =>
              r[1] != null &&
              r[1] !== ''
          )
          .map(
            r =>
              `<div>
                <span class="k">
                  ${r[0]}
                </span>

                <span class="v">
                  ${esc(r[1])}
                </span>
              </div>`
          )
          .join('')
      }
    </div>`;


  const badge = s =>
    `<span class="badge ${String(
      s
    ).toLowerCase()}">
      ${
        s === 'PENDING'
          ? 'Pending'
          : s === 'APPROVED'
          ? 'Approved'
          : s === 'REJECTED'
          ? 'Rejected'
          : esc(s)
      }
    </span>`;


  /* =========================
     PANELS
     ========================= */

  const foot =
    $('footer.site');

  ['gmt', 'admin', 'verify'].forEach(
    id => {

      if (
        document.getElementById(
          'panel-' + id
        )
      ) {
        return;
      }

      const s =
        document.createElement(
          'section'
        );

      s.id =
        'panel-' + id;

      s.className =
        'panel';

      s.hidden = true;

      if (foot) {
        foot.parentNode.insertBefore(
          s,
          foot
        );
      } else {
        document.body.appendChild(
          s
        );
      }
    }
  );


  const P = id =>
    $('#panel-' + id);


  /*
    Keep the existing site's
    show() navigation system.
  */

  const go = id => {

    if (
      typeof window.show ===
      'function'
    ) {
      window.show(id);
      return;
    }

    document
      .querySelectorAll('.panel')
      .forEach(
        p => {
          p.hidden = true;
        }
      );

    const p =
      P(id);

    if (p) {
      p.hidden = false;
    }
  };


  /* =========================
     EVENT STATE
     =========================

     open     = normal sales
     preorder = pre-order
     closed   = sales unavailable
     past     = event date passed
  */

  const state = e => {

    if (
      e.event_date &&
      e.event_date < today()
    ) {
      return 'past';
    }

    if (
      e.sales_enabled === true
    ) {
      return 'open';
    }

    if (
      e.pre_order_enabled === true
    ) {
      return 'preorder';
    }

    return 'closed';
  };


  /* =========================
     QR CODE
     ========================= */

  function qrSvg(token) {

    if (
      typeof window.qrcode !==
      'function'
    ) {
      return '';
    }

    const q =
      window.qrcode(
        0,
        'M'
      );

    q.addData(
      location.origin +
      location.pathname +
      '?verify=' +
      encodeURIComponent(
        token || ''
      )
    );

    q.make();

    return q.createSvgTag({
      cellSize: 4,
      margin: 0,
      scalable: true
    });
  }


  /* =========================
     E-TICKET
     ========================= */

  function ticketHTML(t) {

    const logo =
      ($('img.logo') || {})
        .src || '';

    return `
      <div class="ticket">

        <div class="t-top">

          ${
            logo
              ? `
                <img
                  src="${esc(logo)}"
                  alt="Northern Broadcast"
                >
              `
              : `
                <b>
                  NORTHERN BROADCAST
                </b>
              `
          }

          <span>
            E-TICKET
          </span>

        </div>


        ${
          t.image
            ? `
              <img
                class="t-img"
                src="${esc(t.image)}"
                alt=""
              >
            `
            : ''
        }


        <h3>
          ${esc(t.event)}
        </h3>


        ${facts([

          [
            'Date',
            fmtD(t.date)
          ],

          [
            'Time',
            t.time
          ],

          [
            'Venue',
            t.venue
          ],

          [
            'Name',
            t.name
          ],

          [
            'Mobile',
            t.mobile
          ],

          [
            'Tickets',
            t.qty
          ],

          [
            'Ticket ID',
            t.ticket_id
          ]

        ])}


        <div class="t-qr">

          <div class="qrbox">
            ${qrSvg(t.token)}
          </div>

          <small>
            Scan at the entrance
          </small>

        </div>

      </div>
    `;
  }


  function ticketBlock(t) {

    return `
      <div class="tkt-wrap">

        ${ticketHTML(t)}

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
        !e.target.closest(
          '[data-print]'
        )
      ) {
        return;
      }

      const wrap =
        e.target.closest(
          '.tkt-wrap'
        );

      if (!wrap) {
        return;
      }

      const src =
        wrap.querySelector(
          '.ticket'
        );

      let a =
        $('#printarea');

      if (!a) {

        a =
          document.createElement(
            'div'
          );

        a.id =
          'printarea';

        document.body.appendChild(
          a
        );
      }

      a.innerHTML = '';

      a.appendChild(
        src.cloneNode(true)
      );

      window.print();
    }
  );


  /* =========================
     CUSTOMER STATE
     ========================= */

  const S = {

    events: [],

    ev: null,

    qty: 1,

    tok: null

  };


  const body = () =>
    $('#gmt-body');


  /* =========================
     LOAD EVENTS
     ========================= */

  async function loadEvents() {

    const {
      data,
      error
    } =
      await sb
        .from('events')
        .select('*')
        .eq(
          'is_active',
          true
        );


    if (error) {
      throw error;
    }


    const rank = {

      open: 0,

      preorder: 1,

      closed: 2,

      past: 3

    };


    S.events =
      (data || [])
        .sort(
          (a, b) => {

            const rd =
              rank[state(a)] -
              rank[state(b)];

            if (rd !== 0) {
              return rd;
            }

            return String(
              a.event_date || ''
            ).localeCompare(
              String(
                b.event_date || ''
              )
            );
          }
        );
  }


  /* =========================
     CUSTOMER SHELL
     ========================= */

  function shell() {

    P('gmt').innerHTML = `

      <h1>
        Get My Ticket
      </h1>

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

          <span>
            Order ID
          </span>

          <input
            id="lk-o"
            placeholder="NB-ORD-000001"
            autocomplete="off"
          >

        </label>


        <label class="field">

          <span>
            Mobile number used
            for the order
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


  /* =========================
     OPEN PAYMENT
     ========================= */

  async function openGMT(
    eventId = null
  ) {

    go('gmt');

    shell();


    if (!sb) {

      body().innerHTML =
        note(
          `
            Online ticketing is
            not configured.
            <br><br>
            WhatsApp:
            01511588581
          `,
          'err'
        );

      return;
    }


    body().innerHTML =
      `
        <p class="dim">
          Loading event…
        </p>
      `;


    try {

      await loadEvents();

    } catch (e) {

      body().innerHTML =
        note(
          `
            Could not load events.
            Please refresh the page.
          `,
          'err'
        );

      return;
    }


    /*
      IMPORTANT:
      We now use the database ID.
    */

    const ev =
      eventId
        ? S.events.find(
            x =>
              String(x.id) ===
              String(eventId)
          )
        : null;


    if (ev) {

      const s =
        state(ev);


      if (
        s === 'open' ||
        s === 'preorder'
      ) {

        pick(
          ev.id
        );

        return;
      }


      body().innerHTML =
        note(
          s === 'past'
            ? MSG.PAST_EVENT
            : MSG.SALES_CLOSED,
          'err'
        );

      return;
    }


    renderList();
  }


  /* =========================
     CUSTOMER EVENT LIST
     ========================= */

  function renderList(
    top = ''
  ) {

    body().innerHTML =

      top +

      S.events
        .map(
          e => {

            const s =
              state(e);

            let button;


            if (
              s === 'open'
            ) {

              button = `
                <button
                  class="cta"
                  type="button"
                  data-pick="${esc(e.id)}"
                >
                  Get My Ticket
                </button>
              `;

            } else if (
              s === 'preorder'
            ) {

              button = `
                <button
                  class="cta"
                  type="button"
                  data-pick="${esc(e.id)}"
                >
                  Pre-Order Ticket
                </button>
              `;

            } else {

              button = `
                <span class="pill">
                  ${
                    s === 'past'
                      ? 'Past Event'
                      : 'Ticket Sales Closed'
                  }
                </span>
              `;
            }


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
                    'Venue',
                    e.venue
                  ],

                  [
                    'Ticket',
                    priceTxt()
                  ]

                ])}


                <div
                  class="cta-row"
                >
                  ${button}
                </div>

              </div>

            `;
          }
        )
        .join('');


    $$(
      '[data-pick]',
      body()
    ).forEach(
      b => {

        b.onclick =
          () =>
            pick(
              b.dataset.pick
            );
      }
    );
  }


  /* =========================
     PURCHASE FORM
     ========================= */

  function pick(id) {

    S.ev =
      S.events.find(
        e =>
          String(e.id) ===
          String(id)
      );


    if (!S.ev) {

      body().innerHTML =
        note(
          'Event not found. Please refresh the page.',
          'err'
        );

      return;
    }


    const e =
      S.ev;


    /*
      VERY IMPORTANT:
      Both OPEN and PRE-ORDER
      are allowed here.
    */

    if (
      state(e) !== 'open' &&
      state(e) !== 'preorder'
    ) {

      body().innerHTML =
        note(
          MSG.SALES_CLOSED,
          'err'
        );

      return;
    }


    S.qty = 1;


    S.tok =
      (
        crypto.randomUUID &&
        crypto.randomUUID()
      ) ||
      (
        String(Date.now()) +
        Math.random()
      );


    body().innerHTML = `

      <button
        class="cta secondary"
        id="back"
        type="button"
      >
        ← All events
      </button>


      <div
        style="margin-top:20px"
      >

        ${facts([

          [
            'Event',
            e.name
          ],

          [
            'Date',
            fmtD(e.event_date)
          ],

          [
            'Time',
            e.event_time
          ],

          [
            'Venue',
            e.venue
          ],

          [
            'Ticket price',
            priceTxt()
          ]

        ])}

      </div>


      ${
        state(e) === 'preorder'
          ? note(
              `
                <b>
                  Pre-Order Available
                </b>

                <br>

                Your order will remain
                pending until our team
                verifies your bKash payment.
              `,
              'ok'
            )
          : ''
      }


      <div class="field">

        <span>
          Number of tickets
        </span>


        <div class="qty">

          <button
            class="cta
