/* =========================================================
   NORTHERN BROADCAST — TICKETING SYSTEM
   Manual bKash + Supabase
   Fixed Ticket Price: BDT 250
   Pre-Order Enabled
   ========================================================= */

(function () {
  'use strict';

  /* =========================================================
     CONFIG
     ========================================================= */

  const C = window.NB_CONFIG || {};

  const $ = (s, r = document) =>
    r.querySelector(s);

  const $$ = (s, r = document) =>
    [...r.querySelectorAll(s)];

  const sb =
    window.supabase &&
    C.SUPABASE_URL &&
    !/PASTE/.test(C.SUPABASE_URL)
      ? window.supabase.createClient(
          C.SUPABASE_URL,
          C.SUPABASE_ANON_KEY
        )
      : null;

  const TICKET_PRICE = 250;

  const BKASH_NUMBER =
    C.BKASH_NUMBER || '01511588581';


  /* =========================================================
     HELPERS
     ========================================================= */

  const esc = s =>
    String(s ?? '').replace(
      /[&<>"']/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[c])
    );

  const tk = n =>
    '৳' +
    Number(n || 0).toLocaleString(
      'en-US'
    );

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


  /* =========================================================
     MESSAGES
     ========================================================= */

  const MSG = {
    SALES_CLOSED:
      'Ticket sales are closed for this event.',

    INVALID_NAME:
      'Please enter your full name.',

    INVALID_MOBILE:
      'Please enter a valid Bangladesh mobile number (e.g. 01XXXXXXXXX).',

    INVALID_EMAIL:
      'Please enter a valid email address.',

    INVALID_BKASH_NUMBER:
      'Please enter the valid bKash number you paid from.',

    TXN_REQUIRED:
      'Please enter your bKash Transaction ID.',

    AMOUNT_MISMATCH:
      'The amount does not match the total.',

    DUPLICATE_TXN:
      'This transaction ID has already been submitted.'
  };


  const errMsg = e => {

    const text =
      (e && e.message) || '';

    const match =
      text.match(/[A-Z_]{5,}/);

    return (
      (match &&
        MSG[match[0]]) ||
      (
        navigator.onLine
          ? 'Something went wrong. Please try again.'
          : 'No internet connection. Please try again.'
      )
    );
  };


  const note = (
    text,
    cls = ''
  ) =>
    `<div class="notice ${cls}">
      ${text}
    </div>`;


  const facts = rows =>
    `<div class="facts">
      ${
        rows
          .filter(
            r =>
              r[1] !== null &&
              r[1] !== undefined &&
              r[1] !== ''
          )
          .map(
            r =>
              `<div>
                <span class="k">
                  ${esc(r[0])}
                </span>

                <span class="v">
                  ${esc(r[1])}
                </span>
              </div>`
          )
          .join('')
      }
    </div>`;


  const badge = status =>
    `<span class="badge ${String(
      status
    ).toLowerCase()}">
      ${
        status === 'PENDING'
          ? 'Pending'
          : status === 'APPROVED'
          ? 'Approved'
          : status === 'REJECTED'
          ? 'Rejected'
          : esc(status)
      }
    </span>`;


  /* =========================================================
     PANELS
     ========================================================= */

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

      const section =
        document.createElement(
          'section'
        );

      section.id =
        'panel-' + id;

      section.className =
        'panel';

      section.hidden = true;

      if (foot) {
        foot.parentNode.insertBefore(
          section,
          foot
        );
      } else {
        document.body.appendChild(
          section
        );
      }
    }
  );


  const P = id =>
    document.getElementById(
      'panel-' + id
    );


  /*
    IMPORTANT:
    Do not depend on window.show().
    We control the ticketing panels directly.
  */

  const go = id => {

    document
      .querySelectorAll('.panel')
      .forEach(panel => {

        panel.hidden = true;

        panel.removeAttribute(
          'data-active'
        );
      });


    document
      .querySelectorAll(
        'nav.tabs button'
      )
      .forEach(tab => {

        tab.setAttribute(
          'aria-selected',
          String(
            tab.id ===
            'tab-' + id
          )
        );
      });


    const panel =
      document.getElementById(
        'panel-' + id
      );


    if (panel) {

      panel.hidden = false;

      panel.setAttribute(
        'data-active',
        'true'
      );
    }


    window.scrollTo(
      0,
      0
    );
  };


  /* =========================================================
     EVENT STATE
     ========================================================= */

  const state = e => {

    if (
      e.event_date &&
      e.event_date < today()
    ) {
      return 'past';
    }


    if (
      e.sales_enabled
    ) {
      return 'open';
    }


    if (
      e.pre_order_enabled
    ) {
      return 'preorder';
    }


    return 'closed';
  };


  /* =========================================================
     QR CODE
     ========================================================= */

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


  /* =========================================================
     E-TICKET
     ========================================================= */

  function ticketHTML(t) {

    const logo =
      (
        $('img.logo') || {}
      ).src || '';


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
