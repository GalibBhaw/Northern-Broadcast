/* Northern Broadcast — Ticketing */
(function () {
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tk=n=>Number(n)===0?'Free':'৳'+Number(n).toLocaleString('en-US');
  const BKASH='01511588581';
  const EVENTS=[
    {id:'melodies-for-hope-2025',name:'Melodies for Hope Concert 2025',type:'Charity Concert',date:'2025-12-26',time:'4:00 PM - 9:00 PM',venue:'Micro Stand, Naogaon',price:250,artist:'Shironamhin',status:'open'},
    {id:'obinshshor-nzs-26',name:'Obinshshor - NZS ’26',type:'Farewell Festival',date:'2026-01-09',time:'6:00 PM - 10:00 PM',venue:'50 AVE Restaurant Rooftop, Naogaon',price:300,artist:'Aftermath',status:'open'},
    {id:'adios-2-santahar-26',name:'ADIOS 2.0 - Santahar College ’26',type:'Farewell Festival',date:'2026-01-09',time:'6:00 PM - 10:00 PM',venue:'Santahar College Playground, Bogura',price:500,artist:'Karnival',status:'open'},
    {id:'nobin-boron-ngc-26',name:'Nobin Boron NGC ’26',type:'Fresher’s Reception Festival',date:'2026-06-28',time:'10:00 AM - 4:00 PM',venue:'Naogaon Govt. College Playground, Naogaon',price:0,artist:'Fourth Subject',status:'open'},
    {id:'bijoy-tarunno-2026',name:'Bijoy Tarunno Concert 2026',type:'Live Concert',date:'2026-12-16',time:'4:00 PM - 9:00 PM',venue:'Naogaon',price:250,artist:'',status:'open'}
  ];
  const S={events:EVENTS,ev:null,qty:1,f:{n:'',m:'',e:''}};
  const fmtD=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):'To Be Announced';
  const norm=x=>String(x||'').replace(/[\s-]/g,'').replace(/^\+?88/,'');
  const isMob=x=>/^01[3-9]\d{8}$/.test(norm(x));
  const isMail=x=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x);
  const priceOf=e=>Math.max(0,Number(e?.price)||0);
  const getOrders=()=>{try{return JSON.parse(localStorage.getItem('nb_ticket_orders')||'[]')}catch(_){return[]}};
  const saveOrders=x=>localStorage.setItem('nb_ticket_orders',JSON.stringify(x));
  const makeId=p=>`${p}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
  const encodeToken=data=>{
    const b=new TextEncoder().encode(JSON.stringify(data));let s='';b.forEach(x=>s+=String.fromCharCode(x));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  };
  const decodeToken=t=>{try{let b=t.replace(/-/g,'+').replace(/_/g,'/');b+='='.repeat((4-b.length%4)%4);const s=atob(b),u=Uint8Array.from(s,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(u))}catch(_){return null}};
  function qrSvg(token){
    if(!window.qrcode)return '<div style="font-size:10px;text-align:center;padding:30px 4px">QR unavailable</div>';
    const q=window.qrcode(0,'M');q.addData(location.origin+location.pathname+'?verify='+encodeURIComponent(token));q.make();
    let s=q.createSvgTag({cellSize:4,margin:0,scalable:true});
    if(!/viewBox/.test(s)){const m=s.match(/width="(\d+)[^"]*"[^>]*height="(\d+)/);if(m)s=s.replace('<svg',`<svg viewBox="0 0 ${m[1]} ${m[2]}"`)}
    return s;
  }
  function ticketHTML(t){
    const logo=($('img.logo')||{}).src||'',d=t.date?new Date(t.date+'T00:00:00'):null;
    const pm=d?[d.toLocaleDateString('en-GB',{month:'short'}).toUpperCase(),d.getDate(),d.getFullYear()]:['DATE','TBA',''];
    const dateHTML=d?`<em>${esc(d.toLocaleDateString('en-GB',{weekday:'long'}))}</em>, ${esc(d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}))}`:'To Be Announced';
    const cell=(k,v,w)=>v!=null&&v!==''?`<div class="nbt-c${w?' w':''}"><span class="nbt-mono">${k}</span><b>${v}</b></div>`:'';
    const qty=Number(t.qty)||1;
    return `<div class="nbticket"><div class="nbt-in"><div class="nbt-h">${logo?`<img src="${logo}" alt="Northern Broadcast">`:'<b class="nbt-mono" style="color:inherit">NORTHERN BROADCAST</b>'}<b class="nbt-mono">E-TICKET</b></div>
    <div class="nbt-hero"><div class="nbt-stamp"><div class="nbt-ph nbt-mono">NB</div><div class="nbt-pm nbt-mono"><i>${esc(pm[0])}</i><b>${esc(pm[1])}</b><i>${esc(pm[2])}</i></div></div><div class="nbt-t"><small class="nbt-mono">ADMIT ${qty>1?'GUESTS':'ONE'}</small><h3>${esc(t.event)}</h3></div></div>
    <div class="nbt-g">${cell('Date',dateHTML,true)}${cell('Time',esc(t.time))}${cell('Admit',esc(qty+(qty===1?' Person':' Persons')))}${cell('Venue',esc(t.venue),true)}${cell('Name',esc(t.name),true)}${cell('WhatsApp',esc(t.mobile),true)}</div>
    <div class="nbt-f"><div class="nbt-qr">${qrSvg(t.token)}</div><div class="nbt-id"><small class="nbt-mono">TICKET ID</small><code>${esc(t.ticket_id)}</code><p>Scan this QR code at the entry gate.</p></div></div></div></div>`;
  }
  const ticketBlock=t=>`<div class="tkt-wrap">${ticketHTML(t)}<div class="cta-row"><button class="cta" data-print>Download / Print Ticket</button></div><p class="dim" style="font-size:.85rem">Tip: choose “Save as PDF” in the print window to download it.</p></div>`;
  document.addEventListener('click',e=>{if(!e.target.closest('[data-print]'))return;const src=e.target.closest('.tkt-wrap').querySelector('.nbticket');let a=$('#printarea');if(!a){a=document.createElement('div');a.id='printarea';a.className='tx';document.body.appendChild(a)}a.innerHTML='';a.appendChild(src.cloneNode(true));window.print()});
  const foot=$('footer.site');
  ['gmt','verify'].forEach(id=>{if(!$('#panel-'+id)&&foot){const s=document.createElement('section');s.id='panel-'+id;s.className='panel tx';s.hidden=true;foot.parentNode.insertBefore(s,foot)}});
  const P=id=>$('#panel-'+id),go=id=>window.show(id);
  const poster=e=>`<div class="poster ph"><span>${esc((e.name.split(/\s+/).map(w=>w[0]).join('').replace(/[^A-Za-z0-9]/g,'').slice(0,2)||'NB').toUpperCase())}</span></div>`;
  const eventCard=e=>`<article class="ev-card">${poster(e)}<div class="ev-info"><h3>${esc(e.name)}</h3>${e.type?`<p class="ev-type">${esc(e.type)}</p>`:''}<p>📅 ${esc(fmtD(e.date))}</p>${e.time?`<p>🕐 ${esc(e.time)}</p>`:''}${e.venue?`<p>📍 ${esc(e.venue)}</p>`:''}${e.artist?`<p>🎤 ${esc(e.artist)}</p>`:''}<div class="ev-foot"><b class="price">${tk(priceOf(e))} <small>'/ person'</small></b><button class="cta" data-eid="${esc(e.id)}">Buy Ticket →</button></div></div></article>`;
  function screenList(top=''){
    const logo=($('img.logo')||{}).src||'';
    P('gmt').innerHTML=`<section class="hero-tx">${logo?`<img class="hero-logo" src="${logo}" alt="Northern Broadcast">`:''}<h1>Live Music Brings People Together</h1><p>Concerts · Events · Unforgettable Moments</p><button class="cta big" id="hero-cta">Get My Ticket →</button></section>${top}<div id="gmt-body"><h2 class="sec">Upcoming Events</h2><p class="dim">Select an event to book your ticket</p>${S.events.map(eventCard).join('')}</div><div class="lk-box"><h2 class="sec">Already booked? Find your ticket</h2><label class="field"><span>Order ID</span><input id="lk-o" placeholder="NB-ORD-000001" autocomplete="off"></label><label class="field"><span>WhatsApp number used for the order</span><input id="lk-m" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX"></label><button class="cta secondary" id="lk-go">Find my ticket</button><div id="lk-out" style="margin-top:20px"></div></div>`;
    $('#lk-go').onclick=lookup;$('#hero-cta').onclick=()=>$('#gmt-body').scrollIntoView({behavior:'smooth'});
  }
  const mini=e=>`<div class="mini">${poster(e)}<div><b>${esc(e.name)}</b><p>📅 ${esc(fmtD(e.date))}</p><p>📍 ${esc(e.venue)}</p></div></div>`;
  function start(ev){S.ev=ev;S.qty=1;S.f={n:'',m:'',e:''};screenInfo()}
  const steps=a=>`<ol class="steps" aria-label="Checkout steps"><li class="${a===1?'on':'done'}"><i>1</i>Your Information</li><li class="${a===2?'on':''}"><i>2</i>Payment</li></ol>`;
  function screenInfo(){
    const e=S.ev;
    P('gmt').innerHTML=`<button class="back" id="back">← All events</button>${mini(e)}${steps(1)}<section class="co-card"><h2 class="co-h">YOUR INFORMATION</h2><label class="field"><span>Full Name *</span><input id="f-n" autocomplete="name" placeholder="Enter your full name"></label><label class="field"><span>WhatsApp Number *</span><input id="f-m" type="tel" inputmode="numeric" autocomplete="tel" placeholder="01XXXXXXXXX"></label><label class="field"><span>Email Address *</span><input id="f-e" type="email" autocomplete="email" placeholder="Enter your email address"></label><div class="field" style="margin-bottom:0"><span>Number of Tickets *</span><div class="qty"><button class="cta secondary" id="qm">−</button><b id="qn">1</b><button class="cta secondary" id="qp">+</button></div></div></section><div id="f-err"></div><button class="cta big" id="to-payment">Proceed to Payment →</button>`;
    $('#qm').onclick=()=>{S.qty=Math.max(1,S.qty-1);$('#qn').textContent=S.qty};$('#qp').onclick=()=>{S.qty=Math.min(10,S.qty+1);$('#qn').textContent=S.qty};$('#back').onclick=screenList;
    $('#to-payment').onclick=()=>{S.f.n=$('#f-n').value.trim();S.f.m=$('#f-m').value.trim();S.f.e=$('#f-e').value.trim();const o=$('#f-err');if(S.f.n.length<2)return o.innerHTML='<div class="notice err">Please enter your full name.</div>';if(!isMob(S.f.m))return o.innerHTML='<div class="notice err">Please enter a valid WhatsApp number.</div>';if(!isMail(S.f.e))return o.innerHTML='<div class="notice err">Please enter a valid email address.</div>';screenPayment()};
  }
  function screenPayment(){
    const e=S.ev,total=priceOf(e)*S.qty;
    P('gmt').innerHTML=`<button class="back" id="back-info">← Back to Information</button>${mini(e)}${steps(2)}<section class="co-card bk-hl"><h2 class="co-h">PAYMENT</h2><div class="total-box"><span>Total amount to pay</span><b>${tk(total)}</b><small>${S.qty} × ${tk(priceOf(e))}</small></div><p class="lbl">Payment to:</p><div class="bk-num"><b>${BKASH}</b><button class="cta secondary" id="bk-copy" type="button">Copy Number</button></div><h3 class="co-sub">Payment Instructions</h3><ol class="bk-steps"><li>Open your bKash app.</li><li>Select “Payment”.</li><li>Make the payment of the required amount to ${BKASH}.</li><li>Complete the payment.</li><li>Enter your transaction details below.</li></ol></section><section class="co-card"><h2 class="co-h">PAYMENT DETAILS</h2><label class="field"><span>bKash Sender Number *</span><input id="f-b" type="tel" inputmode="numeric" placeholder="01XXXXXXXXX"></label><label class="field"><span>Transaction ID *</span><input id="f-t" autocomplete="off" placeholder="Enter transaction ID"></label><label class="field"><span>Amount Paid *</span><input id="f-a" type="number" inputmode="numeric" min="0" value="${total}"></label><div id="f-err"></div><button class="cta big" id="f-go">Get My Ticket →</button></section>`;
    $('#back-info').onclick=screenInfo;$('#bk-copy').onclick=()=>{try{navigator.clipboard.writeText(BKASH)}catch(_){ }const b=$('#bk-copy');b.textContent='Copied!';setTimeout(()=>b.textContent='Copy Number',1600)};$('#f-go').onclick=submit;
  }
  function facts(rows){return `<div class="facts">${rows.map(r=>`<div><span class="k">${esc(r[0])}</span><span class="v">${esc(r[1])}</span></div>`).join('')}</div>`}
  function submit(){
    const e=S.ev,v=id=>$('#'+id).value.trim(),out=$('#f-err'),total=priceOf(e)*S.qty;
    if(!isMob(v('f-b')))return out.innerHTML='<div class="notice err">Please enter a valid bKash sender number.</div>';
    if(!v('f-t'))return out.innerHTML='<div class="notice err">Please enter your bKash Transaction ID.</div>';
    if(Number(v('f-a'))!==total)return out.innerHTML=`<div class="notice err">The amount must match the total (${tk(total)}).</div>`;
    const orderId=makeId('NB-ORD'),ticketId=makeId('NB-TKT'),base={ticket_id:ticketId,order_id:orderId,event:e.name,date:e.date,time:e.time,venue:e.venue,name:S.f.n,mobile:norm(S.f.m),qty:S.qty},token=encodeToken(base),order={...base,event_id:e.id,email:S.f.e,amount:total,bkash_number:norm(v('f-b')),transaction_id:v('f-t'),created_at:new Date().toISOString(),token};
    const orders=getOrders();orders.unshift(order);saveOrders(orders);
    P('gmt').innerHTML=`<div class="done-card"><div class="tick">✓</div><h2 class="sec">Your Ticket Is Ready</h2><p>Your ticket has been generated successfully.</p></div>${facts([['Order ID',order.order_id],['Event',order.event],['Name',order.name],['Tickets',order.qty],['Total amount',tk(order.amount)]])}${ticketBlock(order)}<button class="cta secondary" id="again">Back to events</button>`;
    $('#again').onclick=screenList;window.scrollTo(0,0);
  }
  function lookup(){const o=$('#lk-o').value.trim(),m=norm($('#lk-m').value.trim()),out=$('#lk-out');if(!o||!m)return out.innerHTML='<div class="notice err">Enter both your Order ID and WhatsApp number.</div>';const r=getOrders().find(x=>x.order_id===o&&x.mobile===m);if(!r)return out.innerHTML='<div class="notice err">No ticket found. Please check your Order ID and WhatsApp number.</div>';out.innerHTML=facts([['Order ID',r.order_id],['Event',r.event],['Name',r.name],['Tickets',r.qty],['Amount',tk(r.amount)]])+ticketBlock(r)}
  function verifyPage(token){go('verify');const r=decodeToken(token),el=P('verify');if(!r||!r.ticket_id)return el.innerHTML='<h1>Northern Broadcast</h1><div class="verdict err">✕ INVALID TICKET</div>';el.innerHTML='<h1>Northern Broadcast</h1><div class="verdict ok">✓ VALID TICKET</div>'+facts([['Event',r.event],['Ticket ID',r.ticket_id],['Name',r.name],['Tickets',r.qty],['Event date',fmtD(r.date)]])}
  function renderTickets(){const tp=$('#panel-tickets');if(!tp)return;tp.classList.add('tx');tp.innerHTML='<h1>Tickets</h1><p class="dim">Select an event to book your ticket</p>'+S.events.map(eventCard).join('')}
  function openGMT(id){go('gmt');const e=id&&S.events.find(x=>x.id===id);e?start(e):screenList()}
  document.addEventListener('click',e=>{const a=e.target.closest('[data-eid],[data-buy]');if(a){e.preventDefault();openGMT(a.dataset.eid||a.dataset.buy)}});
  const tt=$('#tab-tickets');if(tt)tt.addEventListener('click',renderTickets);
  const q=new URLSearchParams(location.search);if(q.get('verify'))verifyPage(q.get('verify'));else renderTickets();
  window.NB_TICKETS={events:EVENTS,open:openGMT};
})();