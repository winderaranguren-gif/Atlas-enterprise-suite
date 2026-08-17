import { DatabaseSync } from 'node:sqlite';
import {
  GLOBAL_PROMO_PAYMENT_VALIDATE_TRIGGER_SQL,
  GLOBAL_PROMO_PAYMENT_APPLY_TRIGGER_SQL
} from '../modules/global-promo-finance-handoff.js';

function assert(condition,message){if(!condition)throw new Error(message)}
function expectError(fn,expected,message){try{fn();throw new Error(`${message}: expected ${expected}`)}catch(error){const actual=String(error?.message||error);if(!actual.includes(expected))throw new Error(`${message}: got ${actual}`)}}

const db=new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys=ON');
db.exec(`
CREATE TABLE finance_invoices(
 id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,total_cents INTEGER NOT NULL,received_cents INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'open',updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE finance_invoice_payments(
 id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,invoice_id TEXT NOT NULL,amount_cents INTEGER NOT NULL,payment_date TEXT NOT NULL,payment_method TEXT NOT NULL,reference TEXT,note TEXT,created_by_user_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(invoice_id) REFERENCES finance_invoices(id) ON DELETE RESTRICT,CHECK(amount_cents>0)
);
${GLOBAL_PROMO_PAYMENT_VALIDATE_TRIGGER_SQL};
${GLOBAL_PROMO_PAYMENT_APPLY_TRIGGER_SQL};
`);
const insertInvoice=db.prepare(`INSERT INTO finance_invoices(id,organization_id,dba_id,total_cents,status) VALUES(?,?,?,?,?)`);
const insertPayment=db.prepare(`INSERT INTO finance_invoice_payments(id,organization_id,dba_id,invoice_id,amount_cents,payment_date,payment_method) VALUES(?,?,?,?,?,?,?)`);
const invoice=db.prepare(`SELECT total_cents,received_cents,status FROM finance_invoices WHERE id=?`);

insertInvoice.run('inv1','org1','dba1',10000,'open');
insertPayment.run('p1','org1','dba1','inv1',4000,'2026-08-17','ach');
let row=invoice.get('inv1');
assert(Number(row.received_cents)===4000&&row.status==='partial','Partial payment must atomically update invoice state');
insertPayment.run('p2','org1','dba1','inv1',6000,'2026-08-17','ach');
row=invoice.get('inv1');
assert(Number(row.received_cents)===10000&&row.status==='paid','Full payment must atomically mark invoice paid');
expectError(()=>insertPayment.run('p3','org1','dba1','inv1',1,'2026-08-17','ach'),'invoice_not_payable','Paid invoice must reject another payment');

insertInvoice.run('inv2','org1','dba1',5000,'open');
insertPayment.run('p4','org1','dba1','inv2',4000,'2026-08-17','check');
expectError(()=>insertPayment.run('p5','org1','dba1','inv2',2000,'2026-08-17','check'),'payment_exceeds_invoice_balance','Overpayment must be rejected by database trigger');
expectError(()=>insertPayment.run('p6','org2','dba1','inv2',100,'2026-08-17','check'),'invoice_not_payable','Cross-tenant payment must be rejected');

insertInvoice.run('inv3','org1','dba1',5000,'void');
expectError(()=>insertPayment.run('p7','org1','dba1','inv3',100,'2026-08-17','cash'),'invoice_not_payable','Void invoice must reject payment');
expectError(()=>insertPayment.run('p8','org1','dba1','inv2',0,'2026-08-17','cash'),'CHECK constraint failed','Zero payment must fail amount constraint');

const ledgerTotal=db.prepare(`SELECT COALESCE(SUM(amount_cents),0) AS total FROM finance_invoice_payments WHERE invoice_id=?`).get('inv1');
assert(Number(ledgerTotal.total)===10000,'Ledger total must equal invoice received amount');
db.close();
console.log('Global Promo finance integrity tests passed: 8/8');