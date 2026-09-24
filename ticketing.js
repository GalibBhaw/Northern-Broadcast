/* =========================================================
   NORTHERN BROADCAST — TICKETING SYSTEM
   Manual bKash + Supabase
   Fixed Ticket Price: BDT 250
   Pre-Order Enabled
   ========================================================= */

(function () {
  'use strict';

  /* =========================
     CONFIG
     ========================= */

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

    INVALID_QTY:
      'Please choose 1 to 10 tickets.',

    INVALID_BKASH_NUMBER:
      'Please enter the valid bKash number you paid from.',

    TXN_REQUIRED:
      'Please enter your bKash Transaction ID.',

    AMOUNT_MISMATCH:
      'The amount does not match the total.',

    DUPLICATE_TXN:
      'This transaction ID has already been submitted.',

    FORBIDDEN:
      'You do not have permission to do that.',

    NOT_PENDING:
      'This order has already been processed.'
  };


  const errMsg = e => {

    const raw =
      (e && e.message) || '';

    const match =
      raw.match(/[A-Z_]{5,}/);

    return (
      (match &&
        MSG[match[0]]) ||
      (
        navigator.onLine
          ? raw || 'Something went wrong. Please try again.'
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
