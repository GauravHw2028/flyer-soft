import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {reserveJobSql,debitSql} from '../app/api/credit-sql.ts';
const db=new DatabaseSync(':memory:');
for(const name of ['0000_melted_silverclaw.sql','0001_illegal_ronan.sql'])db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
db.prepare('INSERT INTO credit_ledger VALUES (?,?,?,?,?)').run('fund','test',1,'Test funding','now');
function reserve(id,owner='test'){db.exec('BEGIN IMMEDIATE');try{const r=db.prepare(reserveJobSql).run(id,owner,'source','now',owner);db.prepare(debitSql).run('ai:'+id,owner,'Photo','now',id,owner);db.exec('COMMIT');return r.changes}catch(e){db.exec('ROLLBACK');throw e}}
const balance=()=>db.prepare("SELECT COALESCE(SUM(delta),0) AS n FROM credit_ledger WHERE owner='test'").get().n;
assert.equal(reserve('first'),1);assert.equal(balance(),0);
assert.equal(reserve('second'),0);assert.equal(balance(),0);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM enhancements WHERE id='second'").get().n,0);
assert.throws(()=>reserve('first'));assert.equal(balance(),0);
assert.equal(reserve('foreign','another-user'),0);
db.prepare('INSERT OR IGNORE INTO credit_ledger VALUES (?,?,?,?,?)').run('refund:first','test',1,'Refund','now');
db.prepare('INSERT OR IGNORE INTO credit_ledger VALUES (?,?,?,?,?)').run('refund:first','test',1,'Refund','now');
assert.equal(balance(),1);assert.equal(reserve('third'),1);assert.equal(balance(),0);
console.log('PASS: real reservation SQL prevents overdrafts, duplicate debits and cross-account spending; duplicate refunds credit once.');
