import {randomInt,randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
export const ownerEmail='yin21649330441@outlook.com';
export function createEmailAuth(db,sendMail){
 const secret=randomBytes(32);
 db.exec('CREATE TABLE IF NOT EXISTS email_auth(email TEXT PRIMARY KEY,hash TEXT,expires INTEGER,tries INTEGER,sent INTEGER,window INTEGER,count INTEGER)');
 const digest=code=>createHmac('sha256',secret).update(code).digest('hex');
 const allowed=email=>typeof email==='string'&&email.trim().toLowerCase()===ownerEmail;
 return {
 async request(email){
  if(!allowed(email))return {status:403,error:'此邮箱没有编辑权限'};
  const now=Date.now(),row=db.prepare('SELECT * FROM email_auth WHERE email=?').get(ownerEmail);
  if(row&&now-row.sent<60000)return {status:429,error:'请等待60秒后再获取验证码'};
  const sameWindow=row&&now-row.window<3600000;
  if(sameWindow&&row.count>=5)return {status:429,error:'本小时发送次数已达上限，请稍后再试'};
  const code=String(randomInt(0,1000000)).padStart(6,'0');
  db.prepare('INSERT OR REPLACE INTO email_auth VALUES(?,?,?,?,?,?,?)').run(ownerEmail,digest(code),now+600000,0,now,sameWindow?row.window:now,sameWindow?row.count+1:1);
  try{await sendMail(ownerEmail,code)}catch{db.prepare('UPDATE email_auth SET hash=\'\',expires=0 WHERE email=? AND hash=?').run(ownerEmail,digest(code));return {status:503,error:'验证码发送失败，请检查邮件服务配置后重试'}}
  return {status:200,ok:true};
 },
 verify(email,code){
  if(!allowed(email))return false;
  const row=db.prepare('SELECT * FROM email_auth WHERE email=?').get(ownerEmail);
  if(!row||row.expires<=Date.now()||row.tries>=5||!row.hash)return false;
  db.prepare('UPDATE email_auth SET tries=tries+1 WHERE email=?').run(ownerEmail);
  if(typeof code!=='string'||!/^\d{6}$/.test(code)||!timingSafeEqual(Buffer.from(digest(code)),Buffer.from(row.hash)))return false;
  db.prepare('UPDATE email_auth SET hash=\'\',expires=0 WHERE email=?').run(ownerEmail);return true;
 }
 };
}
export async function sendLoginEmail(email,code){
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)throw Error('邮件服务尚未配置');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject:'YinXiangs 小站 · 登录验证码',text:`你的登录验证码是：${code}\n\n10分钟内有效，仅可使用一次。请勿将验证码告诉他人。如非本人操作，请忽略此邮件。`})});
 if(!response.ok)throw Error('邮件服务发送失败');
}
