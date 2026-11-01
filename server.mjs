import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)), data=resolve(process.env.DATA_DIR||join(root,'data'));
mkdirSync(join(data,'uploads'),{recursive:true});
const db=new DatabaseSync(join(data,'journal.db'));
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,title TEXT,category TEXT,body TEXT,images TEXT,status TEXT,date TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,expires INTEGER)');
const ownerEmail='yin2164933041@outlook.com';
const credentialFile=join(data,'admin-credential.json');
let credential;
if(process.env.ADMIN_PASSWORD){const salt=randomBytes(16).toString('hex');credential={salt,hash:scryptSync(process.env.ADMIN_PASSWORD,salt,64).toString('hex')}}
else if(existsSync(credentialFile))credential=JSON.parse(readFileSync(credentialFile,'utf8'));
else throw Error('请配置 ADMIN_PASSWORD 或本机管理员凭据');
const loginLimits=new Map();
// Revoke sessions issued by the former password login, and on server restart.
db.exec('DELETE FROM sessions');
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value))};
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(Buffer.byteLength(s)>12*1024*1024)throw new Error('内容过大，单张图片请小于8MB')}return JSON.parse(s||'{}')}
function signedIn(req){const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('session='))?.slice(8);return token&&db.prepare('SELECT token FROM sessions WHERE token=? AND expires>?').get(createHash('sha256').update(token).digest('hex'),Date.now())}
function post(row){return {...row,images:JSON.parse(row.images)}}
const server=http.createServer(async(req,res)=>{try{
res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
const url=new URL(req.url,'http://localhost'),path=url.pathname,admin=!!signedIn(req);
if(path.startsWith('/api/')){
res.setHeader('Cache-Control','no-store');
if(!['GET','HEAD'].includes(req.method)&&req.headers.origin&&req.headers.origin!==`${process.env.PUBLIC_ORIGIN||`http://${req.headers.host}`}`)return json(res,403,{error:'请求来源不匹配'});
if(path==='/api/session'&&req.method==='GET')return json(res,200,{admin});
if(path==='/api/login'&&req.method==='POST'){
const b=await body(req),time=Date.now(),entry=loginLimits.get('owner');
if(entry&&entry.until>time&&entry.count>=5)return json(res,429,{error:'尝试次数过多，请15分钟后重试'});
const inputHash=scryptSync(String(b.password||'').slice(0,1024),credential.salt,64);
if(typeof b.email!=='string'||b.email.trim().toLowerCase()!==ownerEmail||!timingSafeEqual(inputHash,Buffer.from(credential.hash,'hex'))){loginLimits.set('owner',{count:entry&&entry.until>time?entry.count+1:1,until:time+900000});return json(res,401,{error:'账号或密码不正确'})}
loginLimits.delete('owner');
const now=Date.now();db.prepare('DELETE FROM sessions WHERE expires<?').run(now);const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES(?,?)').run(createHash('sha256').update(token).digest('hex'),now+86400000);res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${process.env.PUBLIC_ORIGIN?.startsWith('https:')?'; Secure':''}`);return json(res,200,{ok:true})}
if(path==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').match(/(?:^|;\s*)session=([^;]+)/)?.[1];if(token)db.prepare('DELETE FROM sessions WHERE token=?').run(createHash('sha256').update(token).digest('hex'));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true})}
if(path==='/api/posts'&&req.method==='GET'){const rows=db.prepare(admin?'SELECT * FROM posts ORDER BY date DESC':'SELECT * FROM posts WHERE status=\'published\' ORDER BY date DESC').all();return json(res,200,rows.map(post))}
if(!admin)return json(res,401,{error:'请先登录'});
if(path==='/api/uploads'&&req.method==='POST'){const b=await body(req),bytes=Buffer.from(b.content||'','base64');let ext;if(bytes.subarray(0,3).toString('hex')==='ffd8ff')ext='jpg';else if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')ext='png';else if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')ext='webp';else return json(res,400,{error:'仅支持 JPG、PNG、WebP 图片'});if(bytes.length>8*1024*1024)return json(res,400,{error:'图片不能超过8MB'});const name=randomBytes(16).toString('hex')+'.'+ext;writeFileSync(join(data,'uploads',name),bytes);return json(res,200,{url:'/media/'+name})}
if(path==='/api/posts'&&req.method==='POST'){const b=await body(req);if(!String(b.title||'').trim()||!['life','study','art','photo'].includes(b.category)||!['draft','published'].includes(b.status)||String(b.body||'').length>100000||!Array.isArray(b.images)||b.images.length>30||b.images.some(x=>!/^\/media\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(x)))return json(res,400,{error:'请检查标题、分类及图片（最多30张）'});const id=b.id||randomBytes(12).toString('hex');db.prepare('INSERT INTO posts VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,body=excluded.body,images=excluded.images,status=excluded.status').run(id,String(b.title).trim().slice(0,200),b.category,String(b.body||''),JSON.stringify(b.images),b.status,new Date().toISOString());return json(res,200,{id})}
if(path.startsWith('/api/posts/')&&req.method==='DELETE'){db.prepare('DELETE FROM posts WHERE id=?').run(path.split('/').pop());return json(res,200,{ok:true})}return json(res,404,{error:'接口不存在'})}
if(path.startsWith('/media/')){const name=path.slice(7);if(!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(name))return res.writeHead(404).end();const file=join(data,'uploads',name);if(!existsSync(file))return res.writeHead(404).end();res.setHeader('Content-Type',name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':'image/webp');res.setHeader('Cache-Control','public, max-age=86400');return res.end(readFileSync(file))}
if(path==='/avatar.jpg'){res.setHeader('Content-Type','image/jpeg');res.setHeader('Cache-Control','public,max-age=3600');return res.end(readFileSync(join(root,'public','avatar.jpg')))}
if(path==='/hero.png'){res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public,max-age=3600');return res.end(readFileSync(join(root,'public','hero.png')))}
const file=['/app.js','/style.css','/theme.css','/motion.css','/motion.js','/dark.css'].includes(path)?path.slice(1):'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(readFileSync(join(root,'public',file)));
}catch(e){json(res,400,{error:e.message||'请求失败'})}});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('个人记录站已启动'));
