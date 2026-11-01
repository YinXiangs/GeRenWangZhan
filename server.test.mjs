import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
test('管理登录、草稿隔离、公开发布和权限',async()=>{
const dir=mkdtempSync(join(tmpdir(),'journal-test-'));const port=18327;
const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,ADMIN_PASSWORD:'integration-test-password',DATA_DIR:dir,PORT:String(port)},stdio:['ignore','pipe','pipe']});
try{await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('exit',code=>reject(Error('服务器启动失败 '+code)))});
const request=(path,method='GET',value,cookie='',origin)=>fetch(`http://localhost:${port}/api/${path}`,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{}),...(origin?{origin}:{})},body:value?JSON.stringify(value):undefined});
assert.equal((await request('posts','POST',{})).status,401);
assert.equal((await request('login','POST',{username:'admin',password:'wrong'})).status,401);
assert.equal((await request('auth/request-code','POST',{email:'yin2164933041@outlook.com'})).status,401);
assert.equal((await request('login','POST',{email:'other@example.com',password:'integration-test-password'})).status,401);
let r=await request('login','POST',{email:'yin2164933041@outlook.com',password:'integration-test-password'});assert.equal(r.status,200);const cookie=r.headers.get('set-cookie').split(';')[0];
const p={title:'测试记录',category:'life',body:'今天的记录',images:[],status:'draft'};r=await request('posts','POST',p,cookie);const{id}=await r.json();assert.ok(id);
assert.equal((await(await request('posts')).json()).length,0);assert.equal((await(await request('posts','GET',undefined,cookie)).json()).length,1);
assert.equal((await request('posts','POST',{...p,id,status:'published'},cookie,'https://attacker.example')).status,403);
assert.equal((await request('posts','POST',{...p,id,status:'published'},cookie)).status,200);
assert.equal((await(await request('posts')).json())[0].title,p.title);
assert.equal((await request('uploads','POST',{content:Buffer.from('<svg/>').toString('base64')},cookie)).status,400);
assert.equal((await fetch(`http://localhost:${port}/post/${id}`)).status,200);
assert.equal((await request('posts/'+id,'DELETE',undefined,cookie)).status,200);
assert.equal((await request('logout','POST',{},cookie)).status,200);assert.equal((await request('posts','POST',p,cookie)).status,401);
}finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));rmSync(dir,{recursive:true,force:true})}
});
