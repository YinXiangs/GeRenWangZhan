import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createEmailAuth,ownerEmail} from './auth.mjs';
test('邮箱白名单、单次验证、过期、错误次数、重发限制、发送失败',async()=>{
 const db=new DatabaseSync(':memory:');let code,recipient;
 const auth=createEmailAuth(db,async(email,value)=>{recipient=email;code=value});
 assert.equal((await auth.request('other@example.com')).status,403);
 assert.equal((await auth.request(ownerEmail)).status,200);assert.equal(recipient,ownerEmail);assert.match(code,/^\d{4}$/);
 assert.equal((await auth.request(ownerEmail)).status,429);
 assert.equal(auth.verify('other@example.com',code),false);
 assert.equal(auth.verify(ownerEmail,code),true);assert.equal(auth.verify(ownerEmail,code),false);
 db.exec('DELETE FROM email_auth');await auth.request(ownerEmail);for(let i=0;i<5;i++)assert.equal(auth.verify(ownerEmail,'invalid'),false);assert.equal(auth.verify(ownerEmail,code),false);
 db.exec('DELETE FROM email_auth');await auth.request(ownerEmail);db.exec('UPDATE email_auth SET expires=0');assert.equal(auth.verify(ownerEmail,code),false);
 db.exec('DELETE FROM email_auth');const failed=createEmailAuth(db,async()=>{throw Error('unavailable')});assert.equal((await failed.request(ownerEmail)).status,503);assert.equal(failed.verify(ownerEmail,code),false);
 db.close();
});
