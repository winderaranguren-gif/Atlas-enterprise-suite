const H={
  'content-type':'text/html; charset=utf-8',
  'cache-control':'no-store',
  'x-content-type-options':'nosniff',
  'referrer-policy':'strict-origin-when-cross-origin'
};

const NAV=[
  ['/accounting','Command Center','⌂'],
  ['/accounting/transactions','Transactions','⇄'],
  ['/accounting/reconciliation','Reconciliation','✓'],
  ['/accounting/ap','Accounts Payable','↓'],
  ['/accounting/ar','Accounts Receivable','↑'],
  ['/accounting/ledger','General Ledger','▤'],
  ['/accounting/journals','Journal Entries','✎'],
  ['/accounting/close','Monthly Close','◷'],
  ['/accounting/catch-up','Catch-Up','↻'],
  ['/accounting/year-end','Year-End','◇'],
  ['/accounting/tax','Tax Readiness','§'],
  ['/accounting/forecast','Cash Forecast','⌁'],
  ['/accounting/review','Accountant Review','◎'],
  ['/accounting/audit','Audit Trail','◉'],
  ['/accounting/integrations','Integrations','⌘']
];

const ENTITIES=[
  {id:'atl-hq',name:'ATLAS Technologies Inc.',meta:'US · Delaware · USD'},
  {id:'atl-eu',name:'ATLAS Europe B.V.',meta:'NL · Amsterdam · EUR'},
  {id:'atl-labs',name:'ATLAS Labs LLC',meta:'US · Florida · USD'}
];

const TX=[
  ['TXN-0001','2026-08-18','Northwind Cloud','Operating · 4412',-4820.50,'Cloud & infrastructure',97,'attached','atl-hq','Platform / R&D','Vendor rule: 14 prior matches','approved',''],
  ['TXN-0002','2026-08-18','Helio Design Co.','Operating · 4412',-2150,'Contractors',62,'requested','atl-hq','Go-to-market','Merchant ambiguous — contractor vs marketing','needs-review','judgment'],
  ['TXN-0003','2026-08-17','Blue Harbour Airlines','Card · 9921',-1284.40,'Travel & meals',88,'attached','atl-hq','Corporate','Travel merchant classification','needs-review',''],
  ['TXN-0004','2026-08-17','Sable Analytics','Operating · 4412',-399,'Software subscriptions',99,'attached','atl-hq','Platform / R&D','Recurring monthly · same amount','approved',''],
  ['TXN-0005','2026-08-16','Meridian Group','Operating · 4412',18400,'Product revenue',94,'attached','atl-hq','Go-to-market','Matches invoice INV-2093','needs-review',''],
  ['TXN-0006','2026-08-16','Transfer to Reserve','Operating · 4412',-25000,'Internal transfer',91,'attached','atl-hq','Corporate','Mirror entry on Reserve · 7730','needs-review','transfer'],
  ['TXN-0007','2026-08-15','Cedar Facilities','Operating · 4412',-1860,'Facilities',86,'requested','atl-hq','Corporate','Vendor rule: 6 prior matches','needs-review',''],
  ['TXN-0008','2026-08-15','Sable Analytics','Card · 9921',-399,'Software subscriptions',55,'missing','atl-hq','Platform / R&D','Possible duplicate of TXN-0004','needs-review','duplicate'],
  ['TXN-0009','2026-08-14','Orbit Payroll Svc','Operating · 4412',-38200,'Payroll',98,'attached','atl-hq','Corporate','Payroll provider file matched','approved',''],
  ['TXN-0010','2026-08-14','Lumen Media','Card · 9921',-2410,'Marketing',74,'requested','atl-hq','Go-to-market','Historically split marketing / events','needs-review',''],
  ['TXN-0011','2026-08-13','Kestrel Foods','Card · 9921',-318.75,'Travel & meals',81,'missing','atl-hq','Corporate','Team meal · receipt missing','needs-review',''],
  ['TXN-0012','2026-08-12','ATLAS Labs (intercompany)','Operating · 4412',-12000,'Due from ATLAS Labs',69,'requested','atl-hq','Platform / R&D','Intercompany elimination candidate','needs-review','judgment'],
  ['TXN-0013','2026-08-11','Vertex Hardware','Operating · 4412',-9640,'Fixed assets',58,'attached','atl-hq','Platform / R&D','Capitalise vs expense threshold','needs-review','judgment'],
  ['TXN-0014','2026-08-10','Quay Logistics','Card · 9921',-742.20,'Shipping',92,'attached','atl-hq','Corporate','Vendor rule: 9 prior matches','needs-review',''],
  ['TXN-0015','2026-08-09','Fairmount Trust','Operating · 4412',32600,'Product revenue',96,'attached','atl-hq','Go-to-market','Matches invoice INV-2101','approved',''],
  ['TXN-0016','2026-08-08','Unknown ACH 8823','Operating · 4412',-3450,'Uncategorised',31,'missing','atl-hq','Corporate','No vendor history · no memo','needs-review','anomaly'],
  ['TXN-0017','2026-08-07','Pinecrest Insurance','Operating · 4412',-5400,'Prepaid expense',66,'requested','atl-hq','Corporate','Annual policy · prepaid schedule needed','needs-review','judgment'],
  ['TXN-0018','2026-08-06','Halcyon Studio','Card · 9921',-1290,'Marketing',79,'attached','atl-eu','Go-to-market','Similar to prior creative spend','needs-review',''],
  ['TXN-0019','2026-08-05','Rowan & Co.','Operating · 4412',-2800,'Professional fees',90,'attached','atl-eu','Corporate','Vendor rule: 4 prior matches','needs-review',''],
  ['TXN-0020','2026-08-04','Beacon Retail','Card · 9921',-164.30,'Office supplies',95,'attached','atl-labs','Corporate','Low value · high confidence','approved','']
];

const BILLS=[
 ['BILL-3041','Northwind Cloud','Sep 04',4821,'approved','3-way matched','Current',''],
 ['BILL-3042','Vertex Hardware','Sep 02',9640,'pending','PO only','Current','Capitalisation review'],
 ['BILL-3043','Crown Legal','Aug 29',6200,'pending','no PO','1–30',''],
 ['BILL-3044','Cedar Facilities','Aug 22',1860,'approved','PO only','1–30',''],
 ['BILL-3045','Sable Analytics','Sep 10',399,'on-hold','no PO','Current','Possible duplicate'],
 ['BILL-3046','Quay Logistics','Jul 30',742,'approved','3-way matched','31–60','']
];

const INVOICES=[
 ['INV-2101','Fairmount Trust','Sep 12',32600,'sent','Current','No action'],
 ['INV-2093','Meridian Group','Aug 30',18400,'viewed','Current','Auto reminder queued'],
 ['INV-2088','Solent Partners','Aug 14',19500,'part-paid','1–30','Partial $9,750 matched'],
 ['INV-2074','Harborline Health','Jul 20',28600,'overdue','31–60','Second notice drafted'],
 ['INV-2061','Kestrel Retail','Jun 18',13200,'overdue','61–90','Escalate to owner'],
 ['INV-2044','Ashvale Municipal','May 11',7940,'overdue','90+','Credit review needed']
];

const RECON=[
 ['Operating checking · 4412',318420,214,0,0,1,100],
 ['Reserve savings · 7730',94460,12,0,0,0,100],
 ['Card · 9921',11930,96,2,1,2,84],
 ['EUR current · 5501',188410,78,4,0,1,71]
];

const CLOSE=[
 ['CT-1','Reconcile operating checking · 4412','A. Rivera','Reconciliations',true,''],
 ['CT-2','Reconcile reserve savings · 7730','A. Rivera','Reconciliations',true,''],
 ['CT-3','Reconcile card · 9921','A. Rivera','Reconciliations',false,'2 unmatched items'],
 ['CT-4','Post depreciation JE-0412','M. Okafor','Accruals & deferrals',false,'Awaiting review'],
 ['CT-5','Prepaid insurance amortisation','M. Okafor','Accruals & deferrals',false,''],
 ['CT-6','Accrue unbilled services revenue','M. Okafor','Accruals & deferrals',true,''],
 ['CT-7','Clear uncategorised backlog','ATLAS + reviewer','Review',false,'18 transactions'],
 ['CT-8','Intercompany due-to / due-from tie-out','Controller','Review',false,''],
 ['CT-9','Draft P&L and balance sheet','Controller','Statements',false,''],
 ['CT-10','Accountant sign-off','External CPA','Statements',false,'Blocked by open tasks']
];

const JOURNALS=[
 ['JE-0412','Aug 31','Depreciation — August','Facilities & other','Fixed assets, net',2140,'review-required','Recurring schedule'],
 ['JE-0413','Aug 31','Prepaid insurance amortisation','Facilities & other','Prepaid expenses',450,'review-required','Prepaid schedule'],
 ['JE-0410','Aug 15','Intercompany allocation — ATLAS Labs','Due from ATLAS Labs','Payroll & contractors',12000,'posted','Controller entry'],
 ['JE-0409','Aug 01','Deferred revenue release','Deferred revenue','Product revenue',9800,'posted','Revenue schedule']
];

const REVIEW=[
 ['RV-081','Vertex Hardware $9,640','Materiality','Controller','Open','Capitalise vs expense — above $5,000 threshold.'],
 ['RV-082','Unknown ACH 8823 $3,450','Clarification','Owner','Awaiting client','No vendor history. Requested context from owner.'],
 ['RV-083','Intercompany allocation JE-0410','Approval','External CPA','Approved','Tie-out matched due-to / due-from.'],
 ['RV-084','August close sign-off','Close','External CPA','Blocked','Blocked by card · 9921 reconciliation.'],
 ['RV-085','Sales tax nexus review','Tax handoff','Tax professional','Open','Requires authorised tax professional.']
];

const AUDIT=[
 ['2026-08-18 15:58','m.okafor','JE-0412 moved to review-required','draft → review-required','Recurring schedule'],
 ['2026-08-18 15:22','atlas.categoriser','TXN-0004 category suggested','Uncategorised → Software subscriptions','Vendor rule v7'],
 ['2026-08-18 14:58','a.rivera','TXN-0016 flagged for human judgment','auto → exception queue','Confidence 31%'],
 ['2026-08-17 11:12','external.cpa','JE-0410 approved','review-required → posted','Reviewer approval'],
 ['2026-08-17 09:40','a.rivera','Evidence attached to TXN-0011','missing → requested','Expense capture']
];

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function money(n,c='$'){return c+Math.abs(Number(n)).toLocaleString('en-US',{maximumFractionDigits:2});}
function badge(text,tone=''){return `<span class="badge ${tone}">${esc(text)}</span>`;}
function progress(v){return `<div class="progress"><i style="width:${Math.max(0,Math.min(100,v))}%"></i></div>`;}
function card(title,value,meta='',tone=''){return `<article class="kpi ${tone}"><small>${esc(title)}</small><strong>${esc(value)}</strong><span>${esc(meta)}</span></article>`;}
function table(head,rows){return `<div class="tableWrap"><table><thead><tr>${head.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}

function dashboard(){
  const kpis=[
    ['Cash position','$412,880','3 demo accounts'],['Accounts receivable','$186,240','22 open invoices'],['Accounts payable','$74,610','14 open bills'],
    ['Revenue','$128,750','MTD demo'],['Operating spend','$75,420','MTD demo'],['Net income','$53,330','MTD demo'],
    ['Uncategorised','18','awaiting review'],['Reconciliation','92%','3 of 4 accounts'],['Close readiness','78 / 100','transparent score'],['Filing readiness','64 / 100','transparent score']
  ];
  const bars=[54,68,61,74,78,84,91];
  return `<section class="hero"><div><div class="eyebrow">AUTONOMOUS ACCOUNTING · CLEAN-ROOM IMPLEMENTATION</div><h1>Accounting Command Center</h1><p>Bank → AI review → reconciliation → ledger → close → tax readiness. Every value on this surface is illustrative DEMO data until an authorised connector is enabled.</p></div><div class="heroScore"><span>Close readiness</span><b>78</b><small>/ 100</small>${progress(78)}</div></section>
  <div class="kpis">${kpis.map(x=>card(...x)).join('')}</div>
  <div class="grid2"><section class="panel"><div class="panelHead"><h2>Cash-flow trend</h2>${badge('DEMO')}</div><div class="bars">${bars.map((v,i)=>`<div><i style="height:${v}%"></i><small>${['Feb','Mar','Apr','May','Jun','Jul','Aug'][i]}</small></div>`).join('')}</div><p class="muted">Illustrative inflow/outflow direction. Not live banking data.</p></section>
  <section class="panel"><div class="panelHead"><h2>Expense mix</h2>${badge('DEMO')}</div>${[['Payroll & contractors',51],['Cloud & infrastructure',20],['Software',11],['Marketing',8],['Travel & meals',5],['Other',5]].map(x=>`<div class="mix"><span>${x[0]}</span><b>${x[1]}%</b>${progress(x[1])}</div>`).join('')}</section></div>
  <div class="grid2"><section class="panel"><div class="panelHead"><h2>Priority review</h2><a href="/accounting/review">Open workspace →</a></div>${REVIEW.slice(0,4).map(r=>`<a class="rowLink" href="/accounting/review"><div><b>${esc(r[1])}</b><small>${esc(r[2])} · ${esc(r[3])}</small></div>${badge(r[4],r[4]==='Approved'?'ok':r[4]==='Blocked'?'bad':'warn')}</a>`).join('')}</section>
  <section class="panel"><div class="panelHead"><h2>Anomalies</h2><a href="/accounting/transactions">Inspect →</a></div>${[
    ['Duplicate candidate','Sable Analytics $399 appears on two accounts.','Review'],['Unknown counterparty','Unknown ACH 8823 has no merchant history.','High'],['Spend spike','Cloud spend is above trailing demo baseline.','Watch'],['Concentration','Top demo customer represents 27% of revenue.','Watch']
  ].map(a=>`<div class="rowLink static"><div><b>${a[0]}</b><small>${a[1]}</small></div>${badge(a[2],a[2]==='High'?'bad':'warn')}</div>`).join('')}</section></div>`;
}

function transactions(){
  const rows=TX.map(t=>`<tr data-tx="${t[0]}" data-entity="${t[8]}" data-search="${esc((t[2]+' '+t[5]+' '+t[3]+' '+t[0]).toLowerCase())}"><td><b>${t[0]}</b><small>${t[1]}</small></td><td><b>${esc(t[2])}</b><small>${esc(t[3])}</small></td><td class="num ${t[4]>0?'pos':'neg'}">${t[4]>0?'+':'−'}${money(t[4])}</td><td><b class="js-cat">${esc(t[5])}</b><small>${esc(t[9])}</small></td><td><span class="confidence ${t[6]>=90?'high':t[6]>=70?'mid':'low'}">${t[6]}%</span><small>${esc(t[10])}</small></td><td><span class="js-evidence">${badge(t[7],t[7]==='attached'?'ok':t[7]==='missing'?'bad':'warn')}</span><small>${esc(t[12]||'')}</small></td><td><span class="js-status">${badge(t[11],t[11]==='approved'?'ok':'warn')}</span></td><td class="actions"><button data-act="approve">Approve</button><button data-act="category">Category</button><button data-act="evidence">Evidence</button><button data-act="flag">Flag</button><button data-act="exclude">Exclude</button></td></tr>`);
  return `<section class="pageHead"><div><div class="eyebrow">AI TRANSACTION INBOX</div><h1>Transactions</h1><p>Confidence-aware categorisation with explicit human review boundaries.</p></div>${badge('LOCAL DEMO ACTIONS','warn')}</section>
  <section class="panel tools"><input id="txSearch" placeholder="Search merchant, account, category or ID…"><select id="txStatus"><option value="all">All states</option><option value="approved">Approved</option><option value="needs-review">Needs review</option><option value="excluded">Excluded</option><option value="flagged">Flagged</option></select><span id="txCount">${TX.length} transactions</span></section>
  ${table(['Transaction','Merchant / account','Amount','Suggested category / dimension','Confidence / reason','Evidence / flag','State','Actions'],rows)}`;
}

function reconciliation(){
  return `<section class="pageHead"><div><div class="eyebrow">BANK ↔ LEDGER CONTROL</div><h1>Reconciliation Center</h1><p>Account-level matching, duplicates, timing differences and exception review.</p></div>${badge('NO LIVE BANK CONNECTION','warn')}</section>
  <div class="cards">${RECON.map(r=>`<article class="panel accountCard"><div class="panelHead"><h2>${esc(r[0])}</h2>${badge(r[6]===100?'Reconciled':'Open',r[6]===100?'ok':'warn')}</div><div class="bigMoney">${money(r[1])}</div>${progress(r[6])}<div class="quad"><span>Matched<b>${r[2]}</b></span><span>Unmatched<b>${r[3]}</b></span><span>Duplicates<b>${r[4]}</b></span><span>Timing<b>${r[5]}</b></span></div><button class="wide" data-recon="${esc(r[0])}">Open detail workspace</button></article>`).join('')}</div><section id="reconDetail" class="panel detailBox"><h2>Detail workspace</h2><p class="muted">Select an account above. The demo workspace will show the selected account context without implying a live statement connection.</p></section>`;
}

function ap(){
 const rows=BILLS.map(b=>`<tr><td><b>${b[0]}</b><small>${esc(b[1])}</small></td><td>${esc(b[2])}</td><td class="num">${money(b[3])}</td><td>${badge(b[4],b[4]==='approved'?'ok':b[4]==='on-hold'?'bad':'warn')}</td><td>${badge(b[5])}</td><td>${esc(b[6])}</td><td>${b[7]?badge(b[7],'warn'):'—'}</td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">PROCURE-TO-PAY</div><h1>Accounts Payable</h1><p>Bill intake, approval state, aging and matching controls.</p></div></section>${table(['Bill / vendor','Due','Amount','Approval','Match','Aging','Flag'],rows)}<div class="notice">Payment execution is disabled until an authorised payment connector and approval policy are configured.</div>`;
}

function ar(){
 const rows=INVOICES.map(i=>`<tr><td><b>${i[0]}</b><small>${esc(i[1])}</small></td><td>${esc(i[2])}</td><td class="num">${money(i[3])}</td><td>${badge(i[4],i[4]==='overdue'?'bad':i[4]==='part-paid'?'warn':'ok')}</td><td>${esc(i[5])}</td><td>${esc(i[6])}</td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">ORDER-TO-CASH</div><h1>Accounts Receivable</h1><p>Invoices, aging and collections status.</p></div></section>${table(['Invoice / customer','Due','Amount','Status','Aging','Collections'],rows)}<div class="notice">Collection emails and payment actions are preview-only until authorised communication/payment connectors are configured.</div>`;
}

function ledger(){
 const groups=[
  ['1000','Assets',712430,[['1010','Operating checking · 4412',318420],['1020','Reserve savings · 7730',94460],['1100','Accounts receivable',186240],['1200','Prepaid expenses',21460],['1500','Fixed assets, net',91850]]],
  ['2000','Liabilities',152970,[['2010','Accounts payable',74610],['2020','Accrued expenses',28840],['2100','Sales tax payable',12180],['2200','Deferred revenue',37340]]],
  ['3000','Equity',559460,[['3010','Contributed capital',420000],['3020','Retained earnings',139460]]],
  ['4000','Revenue',128750,[['4010','Product revenue',96420],['4020','Services revenue',32330]]],
  ['5000','Expenses',75420,[['5010','Payroll & contractors',38200],['5020','Cloud & infrastructure',14650],['5030','Software subscriptions',8420],['5040','Marketing',6180],['5050','Travel & meals',3910],['5060','Facilities & other',4060]]]
 ];
 return `<section class="pageHead"><div><div class="eyebrow">GENERAL LEDGER</div><h1>Chart of Accounts</h1><p>Hierarchical demo ledger with drill-down interaction.</p></div>${badge('DEMO BALANCES')}</section><div class="ledger">${groups.map(g=>`<details open><summary><span><b>${g[0]} · ${g[1]}</b><small>${g[3].length} accounts</small></span><strong>${money(g[2])}</strong></summary>${g[3].map(a=>`<button class="ledgerRow" data-ledger="${a[0]} · ${esc(a[1])}"><span>${a[0]} · ${esc(a[1])}</span><b>${money(a[2])}</b></button>`).join('')}</details>`).join('')}</div><section id="ledgerDetail" class="panel detailBox"><h2>Account drilldown</h2><p class="muted">Choose an account to open its demo transaction context.</p></section>`;
}

function journals(){
 const rows=JOURNALS.map(j=>`<tr><td><b>${j[0]}</b><small>${j[1]}</small></td><td><b>${esc(j[2])}</b><small>${esc(j[7])}</small></td><td>${esc(j[3])}<small>Debit ${money(j[5])}</small></td><td>${esc(j[4])}<small>Credit ${money(j[5])}</small></td><td>${badge(j[6],j[6]==='posted'?'ok':'warn')}</td><td><button data-journal="${j[0]}" ${j[6]==='posted'?'disabled':''}>${j[6]==='posted'?'Posted':'Review entry'}</button></td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">CONTROLLED POSTING</div><h1>Journal Entries</h1><p>Balanced entries with source, review state and audit context.</p></div></section>${table(['Entry','Memo / source','Debit','Credit','State','Action'],rows)}<div class="notice">Posting remains review-required in this demo. No production ledger is modified.</div>`;
}

function closePage(){
 const rows=CLOSE.map(c=>`<tr data-close="${c[0]}"><td><button class="check ${c[4]?'done':''}" data-close-toggle="${c[0]}">${c[4]?'✓':'○'}</button></td><td><b>${esc(c[1])}</b><small>${esc(c[3])}</small></td><td>${esc(c[2])}</td><td>${c[5]?badge(c[5],'warn'):'—'}</td><td><span class="js-close-state">${badge(c[4]?'Complete':'Open',c[4]?'ok':'warn')}</span></td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">PERIOD CONTROL</div><h1>Monthly Close</h1><p>Checklist, blockers and transparent readiness scoring.</p></div><div class="scoreMini"><b id="closeScore">78</b><span>/100 readiness</span></div></section><section class="panel scoreFactors"><h2>Score factors</h2>${[['Bank reconciliations',30,24],['Uncategorised backlog',25,16],['Accruals & deferrals',20,14],['Intercompany tie-out',15,12],['Reviewer sign-off',10,12]].map(f=>`<div><span>${f[0]} · ${f[2]}/${f[1]}</span>${progress(Math.min(100,f[2]/f[1]*100))}</div>`).join('')}</section>${table(['','Task / group','Owner','Blocker','State'],rows)}`;
}

function catchUp(){
 const months=[['Jan 2026',100,0,true],['Feb 2026',100,0,true],['Mar 2026',92,4,true],['Apr 2026',74,11,false],['May 2026',48,23,false],['Jun 2026',31,37,false],['Jul 2026',66,12,false]];
 return `<section class="pageHead"><div><div class="eyebrow">HISTORICAL BOOK CLEANUP</div><h1>Catch-Up Accounting</h1><p>Month-by-month statement, categorisation and reconciliation progress.</p></div></section><div class="cards">${months.map(m=>`<article class="panel"><div class="panelHead"><h2>${m[0]}</h2>${badge(m[1]===100?'Ready':'In progress',m[1]===100?'ok':'warn')}</div><div class="scoreMini"><b>${m[1]}%</b></div>${progress(m[1])}<div class="quad"><span>Uncategorised<b>${m[2]}</b></span><span>Reconciled<b>${m[3]?'Yes':'No'}</b></span></div></article>`).join('')}</div>`;
}

function yearEnd(){
 const items=[['P&L readiness','Revenue and expense cut-off reviewed for 11 of 12 months',88],['Balance sheet readiness','All control accounts reconciled except card · 9921',81],['1099 readiness','6 of 9 contractor W-9 records complete',67],['Fixed assets & depreciation','2 items pending capitalisation call',72],['Owner equity review','Distributions and contributions traced to bank',94],['Tax package checklist','9 of 16 supporting documents collected',56]];
 return `<section class="pageHead"><div><div class="eyebrow">YEAR-END CONTROL</div><h1>Year-End Center</h1><p>Financial statement, information return and evidence readiness.</p></div></section><div class="cards">${items.map(i=>`<article class="panel"><div class="panelHead"><h2>${i[0]}</h2><b>${i[2]}%</b></div><p class="muted">${i[1]}</p>${progress(i[2])}</article>`).join('')}</div>`;
}

function tax(){
 const tasks=[['Q3 estimated income tax','Federal','Sep 15','in-progress','Estimate based on demo YTD figures'],['Payroll tax deposit','Federal','Sep 15','ready','Payroll provider file reconciled'],['Sales tax return','State','Sep 20','blocked','Nexus review needed for 2 states'],['Franchise tax report','State','Nov 15','in-progress','Entity data confirmed'],['1099-NEC preparation','Federal','Jan 31','in-progress','3 W-9 records missing'],['Local business licence renewal','Local','Dec 31','ready','Documents on file']];
 const rows=tasks.map(t=>`<tr><td><b>${t[0]}</b><small>${t[1]}</small></td><td>${t[2]}</td><td>${badge(t[3],t[3]==='ready'?'ok':t[3]==='blocked'?'bad':'warn')}</td><td>${t[4]}</td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">TAX READINESS · NOT TAX FILING</div><h1>Tax Readiness</h1><p>Evidence and deadline orchestration with professional handoff boundaries.</p></div>${badge('AUTHORIZED PROFESSIONAL REQUIRED','warn')}</section>${table(['Task / level','Due','State','Note'],rows)}<div class="notice strong">ATLAS does not file, sign, transmit or represent a taxpayer from this demo. Filing requires an authorised connector and, where applicable, an authorised tax professional.</div>`;
}

function forecast(){
 const vals=[413,401,427,438,421,451,466,459,482,491,475,503,517];
 return `<section class="pageHead"><div><div class="eyebrow">13-WEEK LIQUIDITY</div><h1>Cash Forecast</h1><p>Expected, low and high demo trajectories for liquidity planning.</p></div>${badge('DEMO FORECAST')}</section><section class="panel"><div class="forecast">${vals.map((v,i)=>`<div class="week"><div class="range" style="height:${Math.max(30,(v-330)/2)}px"><i style="bottom:${Math.max(8,(v-385)/3)}px"></i></div><b>$${v}k</b><small>W${i+1}</small></div>`).join('')}</div><div class="legend"><span><i class="expected"></i>Expected</span><span><i class="band"></i>Illustrative low/high range</span></div></section><div class="notice">Forecasts are decision-support estimates, not guarantees. Live forecasting requires connected bank, AR, AP and payroll data.</div>`;
}

function review(){
 const rows=REVIEW.map(r=>`<tr data-review="${r[0]}"><td><b>${r[0]}</b><small>${esc(r[2])}</small></td><td><b>${esc(r[1])}</b><small>${esc(r[5])}</small></td><td>${esc(r[3])}</td><td><span class="js-review-state">${badge(r[4],r[4]==='Approved'?'ok':r[4]==='Blocked'?'bad':'warn')}</span></td><td><button data-review-act="approve" ${r[4]==='Approved'?'disabled':''}>Approve demo</button><button data-review-act="note">Add note</button></td></tr>`);
 return `<section class="pageHead"><div><div class="eyebrow">HUMAN JUDGMENT BOUNDARY</div><h1>Accountant Review</h1><p>Materiality, judgment, clarification, close approval and tax handoff queue.</p></div>${badge('LOCAL DEMO APPROVALS','warn')}</section>${table(['Item / type','Subject / note','Owner','State','Action'],rows)}`;
}

function audit(){
 return `<section class="pageHead"><div><div class="eyebrow">EVIDENCE & CHANGE HISTORY</div><h1>Audit Trail</h1><p>Chronological event history for demo accounting decisions. This interface does not claim cryptographic immutability.</p></div>${badge('DEMO EVENT LOG')}</section><section class="timeline">${AUDIT.map(a=>`<article><time>${a[0]}</time><div><b>${esc(a[2])}</b><small>Actor: ${esc(a[1])} · ${esc(a[3])}</small><p>${esc(a[4])}</p></div></article>`).join('')}</section>`;
}

function integrations(){
 const x=[['Bank feeds','Banking','Requires connector','Read-only account and transaction feed via an authorised provider.'],['Corporate cards','Cards','Requires connector','Card programme feed with merchant enrichment.'],['ATLAS HR & Payroll','Payroll','Preview','Internal payroll-to-ledger mapping surface.'],['Point of sale','POS','Requires connector','Daily sales summaries and tender reconciliation.'],['Ecommerce','Ecommerce','Requires connector','Orders, refunds, fees and payout normalisation.'],['Payment processors','Payments','Requires connector','Payout-to-deposit matching with fee separation.'],['ATLAS Inventory','Inventory','Preview','COGS and valuation hand-off.'],['Expense & receipts','Expense','Preview','Evidence capture into the transaction inbox.'],['Existing accounting systems','Accounting','Requires connector','Trial balance import or ledger sync.'],['ATLAS Connect','Platform','Available','Internal ATLAS integration and data exchange fabric.']];
 return `<section class="pageHead"><div><div class="eyebrow">CONTROLLED DATA BOUNDARIES</div><h1>Integrations</h1><p>Connector catalogue with explicit Available, Preview and Requires connector states.</p></div></section><div class="cards">${x.map(i=>`<article class="panel integration"><div class="panelHead"><span class="icoBig">${i[0].slice(0,1)}</span>${badge(i[2],i[2]==='Available'?'ok':i[2]==='Preview'?'warn':'')}</div><h2>${i[0]}</h2><small>${i[1]}</small><p class="muted">${i[3]}</p>${i[2]==='Available'?`<a class="btn" href="/connect">Open ATLAS Connect</a>`:`<button class="wide" disabled>${i[2]}</button>`}</article>`).join('')}</div><div class="notice">Bank credentials are never requested or stored on this demo surface. Production connections must use authorised OAuth/tokenised connector flows.</div>`;
}

function pageBody(path){
 const key=path.replace('/accounting','').replace(/^\//,'')||'home';
 const map={home:dashboard,transactions,reconciliation,ap,ar,ledger,journals,close:closePage,'catch-up':catchUp,'year-end':yearEnd,tax,forecast,review,audit,integrations};
 return (map[key]||dashboard)();
}

function titleFor(path){const hit=NAV.find(n=>n[0]===path);return hit?hit[1]:'Accounting';}

const CSS=`
:root{--bg:#020713;--panel:#071522;--panel2:#0a1e30;--line:#173e62;--text:#eef7ff;--muted:#8fa9c2;--cyan:#5ed6ff;--blue:#238bff;--green:#55df95;--orange:#f4b35a;--red:#ff6b63;--violet:#9b7bff}*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:radial-gradient(circle at 75% 0,#092b4f 0,transparent 28%),var(--bg);color:var(--text);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh}.app{display:grid;grid-template-columns:245px minmax(0,1fr);min-height:100vh}.side{height:100vh;position:sticky;top:0;overflow:auto;padding:18px 12px;background:rgba(2,10,22,.96);border-right:1px solid #15344f}.brand{display:flex;align-items:center;gap:10px;padding:5px 8px 17px}.logo{font-size:29px;color:var(--cyan);text-shadow:0 0 22px #299be9}.brand b{letter-spacing:.2em}.brand small{display:block;color:#6f94b2;font-size:8px;letter-spacing:.13em}.nav{display:flex;gap:9px;align-items:center;text-decoration:none;color:#9fb6ca;padding:9px 10px;border:1px solid transparent;border-radius:9px;font-size:12px;margin:2px 0}.nav:hover,.nav.on{color:white;border-color:#28699d;background:linear-gradient(90deg,rgba(36,119,205,.35),rgba(7,29,52,.15))}.nav i{font-style:normal;width:18px;text-align:center;color:#72cfff}.sideFoot{margin:15px 8px 6px;border-top:1px solid #16324b;padding-top:13px;display:grid;gap:7px}.sideFoot a{color:#7fa7c5;text-decoration:none;font-size:10px}.main{min-width:0}.top{position:sticky;top:0;z-index:15;min-height:66px;display:flex;align-items:center;gap:10px;padding:10px 18px;background:rgba(2,9,19,.9);backdrop-filter:blur(17px);border-bottom:1px solid #15344f}.menu{display:none}.search{flex:1;min-width:130px;max-width:390px;border:1px solid #224d72;background:#061527;color:#fff;border-radius:20px;padding:10px 14px;outline:none}.top select{border:1px solid #224d72;background:#061527;color:#dceeff;border-radius:9px;padding:9px 10px;max-width:180px}.demoTag{margin-left:auto;border:1px solid #7b5c28;background:#2a2212;color:#f3d38e;border-radius:8px;padding:7px 9px;font-size:9px;white-space:nowrap}.content{padding:20px;max-width:1600px;margin:auto}.hero,.pageHead{display:flex;justify-content:space-between;gap:22px;align-items:flex-start;border:1px solid rgba(65,145,210,.35);border-radius:17px;background:linear-gradient(135deg,rgba(10,40,70,.92),rgba(5,17,31,.92));padding:25px}.hero h1,.pageHead h1{font-size:32px;margin:4px 0 7px}.hero p,.pageHead p{color:#a8bfd1;max-width:850px;margin:0;line-height:1.55;font-size:12px}.eyebrow{font-size:9px;letter-spacing:.18em;color:#55cfff}.heroScore{min-width:180px;border-left:1px solid #28577c;padding-left:18px}.heroScore span,.heroScore small{font-size:9px;color:#8fa9c2}.heroScore b{font-size:42px;display:inline-block;margin:2px 4px 5px 0}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px}.kpi{border:1px solid #173e62;border-radius:12px;background:linear-gradient(145deg,#0a1d30,#06111d);padding:14px;min-height:105px}.kpi small{font-size:9px;color:#91abc1;display:block}.kpi strong{font-size:20px;display:block;margin:8px 0}.kpi span{font-size:9px;color:#7693ad}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.panel{border:1px solid #173e62;border-radius:13px;background:linear-gradient(145deg,#091c2e,#06111d);padding:15px}.panel h2{font-size:13px;margin:0}.panelHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.panelHead a{color:#63cfff;text-decoration:none;font-size:10px}.muted{color:#86a0b7;font-size:10px;line-height:1.5}.badge{display:inline-block;border:1px solid #315c7e;background:#0b253c;color:#a9d9fb;border-radius:999px;padding:4px 7px;font-size:8px;white-space:nowrap}.badge.ok{border-color:#28684d;background:#0e3024;color:#8bf1b7}.badge.warn{border-color:#765728;background:#2c2110;color:#f3d18b}.badge.bad{border-color:#7e3734;background:#331614;color:#ffaaa5}.progress{height:6px;background:#0c2337;border-radius:99px;overflow:hidden;margin-top:8px}.progress i{display:block;height:100%;background:linear-gradient(90deg,#2188ff,#5ce1ff);border-radius:99px}.bars{height:180px;display:flex;gap:9px;align-items:end;border-bottom:1px solid #173e62;padding:17px 7px 2px}.bars div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}.bars i{display:block;width:65%;background:linear-gradient(180deg,#5bd8ff,#236eea);border-radius:7px 7px 2px 2px}.bars small{font-size:8px;color:#7894ac;margin-top:5px}.mix{display:grid;grid-template-columns:1fr 40px;gap:4px;margin:12px 0;font-size:10px}.mix .progress{grid-column:1/3}.rowLink{display:flex;justify-content:space-between;align-items:center;gap:12px;text-decoration:none;color:#eef7ff;padding:10px;border-top:1px solid #14344f}.rowLink:first-of-type{border-top:0}.rowLink b{font-size:11px;display:block}.rowLink small{font-size:9px;color:#7898b3}.rowLink.static{cursor:default}.tableWrap{margin-top:12px;border:1px solid #173e62;border-radius:13px;overflow:auto;background:#06111d}table{border-collapse:collapse;width:100%;min-width:900px}th,td{padding:11px 10px;text-align:left;border-bottom:1px solid #12334d;vertical-align:top;font-size:10px}th{position:sticky;top:0;background:#0a1e30;color:#8faac0;font-size:8px;letter-spacing:.08em;text-transform:uppercase;z-index:2}td b{display:block;font-size:10px}td small{display:block;color:#7895ad;font-size:8px;margin-top:4px;max-width:220px;line-height:1.35}.num{text-align:right;font-variant-numeric:tabular-nums}.pos{color:#72e7a4}.neg{color:#ff9c94}.actions{white-space:nowrap}.actions button,button,.btn{border:1px solid #28567c;background:#0a2640;color:#cceaff;padding:6px 8px;border-radius:7px;font-size:8px;cursor:pointer;margin:1px;text-decoration:none;display:inline-block}.actions button:hover,button:hover,.btn:hover{border-color:#55c8ff;color:#fff}.actions button:disabled,button:disabled{opacity:.45;cursor:not-allowed}.wide{width:100%;margin-top:11px}.tools{display:flex;align-items:center;gap:10px;margin-top:12px}.tools input,.tools select{border:1px solid #224d72;background:#061527;color:#fff;border-radius:9px;padding:9px 10px}.tools input{flex:1}.tools span{font-size:9px;color:#7996af}.confidence{font-weight:700}.confidence.high{color:#6ee9a4}.confidence.mid{color:#ffd07b}.confidence.low{color:#ff8d85}.accountCard .bigMoney{font-size:29px;margin:11px 0}.quad{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}.quad span{font-size:8px;color:#7693aa;border:1px solid #153955;border-radius:8px;padding:7px}.quad b{display:block;color:#fff;font-size:12px;margin-top:4px}.detailBox{margin-top:12px}.ledger{margin-top:12px;display:grid;gap:8px}.ledger details{border:1px solid #173e62;border-radius:12px;background:#06111d;overflow:hidden}.ledger summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:14px;background:#0a1d2f}.ledger summary small{display:block;color:#7897af;font-size:8px}.ledgerRow{width:100%;border:0;border-top:1px solid #12334d;background:#071522;border-radius:0;display:flex;justify-content:space-between;padding:10px 14px;text-align:left}.notice{margin-top:12px;border:1px solid #775928;background:#2c2211;color:#efd08e;border-radius:10px;padding:11px;font-size:9px;line-height:1.5}.notice.strong{font-size:10px}.check{width:27px;height:27px;border-radius:50%;padding:0}.check.done{background:#0e3928;border-color:#2f7e58;color:#8cf1b6}.scoreMini b{font-size:28px}.scoreMini span{display:block;color:#819db5;font-size:8px}.scoreFactors{margin-top:12px}.scoreFactors>div{display:grid;grid-template-columns:220px 1fr;align-items:center;gap:10px;margin:9px 0;font-size:9px;color:#9fb4c5}.forecast{height:260px;display:flex;align-items:end;gap:7px;padding:14px 4px}.week{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:end;height:100%}.range{width:65%;min-height:30px;background:rgba(61,142,215,.18);border:1px solid rgba(84,165,229,.35);border-radius:7px;position:relative}.range i{position:absolute;left:15%;right:15%;height:4px;background:#61ddff;border-radius:99px}.week b{font-size:8px;margin-top:5px}.week small{font-size:7px;color:#7894aa}.legend{display:flex;gap:15px;font-size:8px;color:#8ca5b9}.legend i{display:inline-block;width:16px;height:5px;margin-right:5px}.legend .expected{background:#61ddff}.legend .band{background:rgba(61,142,215,.35)}.timeline{margin-top:12px;display:grid;gap:8px}.timeline article{display:grid;grid-template-columns:150px 1fr;gap:15px;border:1px solid #173e62;border-radius:11px;background:#061522;padding:13px}.timeline time{font-size:9px;color:#73bfe9}.timeline b{font-size:11px}.timeline small,.timeline p{display:block;font-size:9px;color:#829db3;margin:5px 0 0}.integration .icoBig{width:35px;height:35px;display:grid;place-items:center;border-radius:10px;background:#0c3151;color:#66d2ff;font-weight:700}.integration>small{color:#6f93ad;font-size:8px}.footer{margin-top:25px;display:flex;justify-content:space-between;gap:15px;border-top:1px solid #15344f;padding:15px 3px;color:#67849e;font-size:8px}.footer a{color:#82b8dc;text-decoration:none}@media(max-width:1150px){.kpis{grid-template-columns:repeat(3,1fr)}.cards{grid-template-columns:repeat(2,1fr)}.top select:nth-of-type(n+3){display:none}}@media(max-width:780px){.app{display:block}.side{display:none;position:fixed;z-index:30;left:0;top:0;width:250px}.side.open{display:block}.menu{display:inline-block}.top{flex-wrap:wrap}.search{order:5;max-width:none;width:100%}.content{padding:12px}.hero,.pageHead{display:block;padding:18px}.heroScore{border-left:0;border-top:1px solid #28577c;margin-top:14px;padding:12px 0 0}.kpis{grid-template-columns:repeat(2,1fr)}.grid2,.cards{grid-template-columns:1fr}.quad{grid-template-columns:repeat(2,1fr)}.forecast{overflow-x:auto}.week{min-width:45px}.scoreFactors>div{grid-template-columns:1fr}.timeline article{grid-template-columns:1fr}.demoTag{margin-left:0}.top select{max-width:48%}}`;

const CLIENT=`
(function(){
 var KEY='atlas_accounting_demo_v2';
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
 function write(s){localStorage.setItem(KEY,JSON.stringify(s))}
 var s=read();s.tx=s.tx||{};s.close=s.close||{};s.review=s.review||{};s.context=s.context||{};
 var entity=document.getElementById('entitySel'),range=document.getElementById('rangeSel'),autonomy=document.getElementById('autonomySel'),mode=document.getElementById('modeSel');
 [['entity',entity],['range',range],['autonomy',autonomy],['mode',mode]].forEach(function(p){var k=p[0],el=p[1];if(!el)return;if(s.context[k])el.value=s.context[k];el.addEventListener('change',function(){s.context[k]=el.value;write(s);applyContext()})});
 function applyContext(){var e=entity&&entity.value||'atl-hq';document.querySelectorAll('[data-entity]').forEach(function(row){row.style.display=(e==='all'||row.getAttribute('data-entity')===e)?'':'none'});filterTx()}
 var txSearch=document.getElementById('txSearch'),txStatus=document.getElementById('txStatus'),txCount=document.getElementById('txCount');
 function txState(id,row){var o=s.tx[id]||{};var st=o.status||((row.querySelector('.js-status .ok'))?'approved':'needs-review');return st}
 function renderTx(row){var id=row.getAttribute('data-tx'),o=s.tx[id]||{};var st=txState(id,row);var stat=row.querySelector('.js-status');if(stat){var cls=st==='approved'?'ok':st==='excluded'?'bad':st==='flagged'?'warn':'warn';stat.innerHTML='<span class="badge '+cls+'">'+st+'</span>'}if(o.category){row.querySelector('.js-cat').textContent=o.category}if(o.evidence){row.querySelector('.js-evidence').innerHTML='<span class="badge ok">'+o.evidence+'</span>'}}
 document.querySelectorAll('[data-tx]').forEach(renderTx);
 document.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-act]');if(b){var row=b.closest('[data-tx]'),id=row.getAttribute('data-tx'),a=b.getAttribute('data-act');s.tx[id]=s.tx[id]||{};if(a==='approve')s.tx[id].status='approved';if(a==='exclude')s.tx[id].status='excluded';if(a==='flag')s.tx[id].status='flagged';if(a==='evidence')s.tx[id].evidence='requested';if(a==='category'){var current=row.querySelector('.js-cat').textContent;var v=prompt('Demo category override',current);if(v)s.tx[id].category=v}write(s);renderTx(row);filterTx();return}
  var rc=ev.target.closest('[data-recon]');if(rc){var box=document.getElementById('reconDetail');box.innerHTML='<h2>'+rc.getAttribute('data-recon')+'</h2><p class="muted">Demo detail workspace opened. Match, exception, duplicate and timing-difference controls remain non-destructive until a live bank connector exists.</p>';return}
  var lr=ev.target.closest('[data-ledger]');if(lr){var ld=document.getElementById('ledgerDetail');ld.innerHTML='<h2>'+lr.getAttribute('data-ledger')+'</h2><p class="muted">Demo drilldown selected. In production this view traces account → transaction → source evidence → approval history.</p>';return}
  var ct=ev.target.closest('[data-close-toggle]');if(ct){var cid=ct.getAttribute('data-close-toggle'),tr=ct.closest('[data-close]');s.close[cid]=!(s.close[cid]===undefined?ct.classList.contains('done'):s.close[cid]);write(s);applyClose(tr,cid);recalcClose();return}
  var rv=ev.target.closest('[data-review-act]');if(rv){var rr=rv.closest('[data-review]'),rid=rr.getAttribute('data-review'),act=rv.getAttribute('data-review-act');s.review[rid]=s.review[rid]||{};if(act==='approve')s.review[rid].state='Approved';if(act==='note'){var note=prompt('Add a local demo reviewer note',s.review[rid].note||'');if(note!==null)s.review[rid].note=note}write(s);applyReview(rr,rid);return}
  var menu=ev.target.closest('.menu');if(menu){document.querySelector('.side').classList.toggle('open');return}
 });
 function filterTx(){if(!txSearch)return;var q=(txSearch.value||'').toLowerCase(),wanted=txStatus.value||'all',e=entity&&entity.value||'atl-hq',n=0;document.querySelectorAll('[data-tx]').forEach(function(row){var st=txState(row.getAttribute('data-tx'),row);var okQ=!q||row.getAttribute('data-search').indexOf(q)>=0;var okS=wanted==='all'||st===wanted;var okE=e==='all'||row.getAttribute('data-entity')===e;var show=okQ&&okS&&okE;row.style.display=show?'':'none';if(show)n++});if(txCount)txCount.textContent=n+' transactions'}
 if(txSearch)txSearch.addEventListener('input',filterTx);if(txStatus)txStatus.addEventListener('change',filterTx);
 function applyClose(tr,id){if(!tr)return;var base=tr.querySelector('.check').textContent==='✓';var done=s.close[id]===undefined?base:s.close[id];var btn=tr.querySelector('.check');btn.textContent=done?'✓':'○';btn.classList.toggle('done',done);tr.querySelector('.js-close-state').innerHTML='<span class="badge '+(done?'ok':'warn')+'">'+(done?'Complete':'Open')+'</span>'}
 document.querySelectorAll('[data-close]').forEach(function(tr){applyClose(tr,tr.getAttribute('data-close'))});
 function recalcClose(){var list=document.querySelectorAll('[data-close]');if(!list.length)return;var done=0;list.forEach(function(tr){if(tr.querySelector('.check').classList.contains('done'))done++});var score=Math.round(40+done/list.length*60);var el=document.getElementById('closeScore');if(el)el.textContent=score}
 function applyReview(rr,id){if(!rr)return;var o=s.review[id]||{};if(o.state){rr.querySelector('.js-review-state').innerHTML='<span class="badge ok">'+o.state+'</span>';var b=rr.querySelector('[data-review-act="approve"]');if(b)b.disabled=true}}
 document.querySelectorAll('[data-review]').forEach(function(rr){applyReview(rr,rr.getAttribute('data-review'))});
 var gs=document.getElementById('globalSearch');var commands=${JSON.stringify(NAV.map(n=>({label:n[1],path:n[0]})))};
 function command(){if(!gs)return;var q=gs.value.toLowerCase().trim();if(!q)return;var hit=commands.find(function(c){return c.label.toLowerCase().indexOf(q)>=0||c.path.toLowerCase().indexOf(q)>=0});if(hit)location.href=hit.path}
 if(gs){gs.addEventListener('keydown',function(e){if(e.key==='Enter')command()})}
 document.addEventListener('keydown',function(e){if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(gs){gs.focus();gs.select()}}});
 applyContext();recalcClose();
})();`;

function shell(path){
 const nav=NAV.map(n=>`<a class="nav ${n[0]===path?'on':''}" href="${n[0]}"><i>${n[2]}</i>${n[1]}</a>`).join('');
 const entityOptions=`<option value="all">All demo entities</option>`+ENTITIES.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
 return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ATLAS — ${esc(titleFor(path))}</title><style>${CSS}</style></head><body><div class="app"><aside class="side"><div class="brand"><div class="logo">△</div><div><b>ATLAS</b><small>AUTONOMOUS ACCOUNTING</small></div></div>${nav}<div class="sideFoot"><a href="/finance">← Finance & Accounting</a><a href="/dashboard">← ATLAS Dashboard</a><a href="/demos">Demo Center</a></div></aside><main class="main"><header class="top"><button class="menu">☰</button><input id="globalSearch" class="search" placeholder="Search accounting or press ⌘K…"><select id="entitySel">${entityOptions}</select><select id="rangeSel"><option>MTD</option><option>QTD</option><option>YTD</option><option>TTM</option></select><select id="autonomySel"><option value="observe">Observe</option><option value="suggest" selected>Suggest</option><option value="auto-low-risk">Auto-process low-risk</option><option value="review-required">Review-required</option></select><select id="modeSel"><option>Owner</option><option selected>Controller</option><option>Accountant</option><option>Reviewer</option></select><span class="demoTag">DEMO · NOT LIVE BOOKS</span></header><div class="content">${pageBody(path)}<footer class="footer"><span>ATLAS Autonomous Accounting · Clean-room accounting intelligence surface</span><span><a href="/security">Security</a> · <a href="/finance/controls">Controls</a> · <a href="/accounting/audit">Audit</a></span></footer></div></main></div><script>${CLIENT}</script></body></html>`;
}

export function handleAutonomousAccounting(request){
 const path=new URL(request.url).pathname.replace(/\/+$/,'')||'/';
 if(!NAV.some(n=>n[0]===path))return null;
 return new Response(shell(path),{headers:H});
}

export const autonomousAccountingRoutes=NAV.map(n=>n[0]);
