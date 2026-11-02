const cloudURL='https://ceuvupbyuufjpilltimi.supabase.co';
const cloudKey='sb_publishable_C7AZf3Ec9xqDNk3lfA4MUw_DlezGj7a';
const sessionKey='yinxiangs-cloud-session';
let cloudSession=null,refreshing=null;
try{cloudSession=JSON.parse(sessionStorage.getItem(sessionKey)||'null')}catch{}
const imageKeys=new Map();
function saveSession(value){cloudSession=value;if(value)sessionStorage.setItem(sessionKey,JSON.stringify(value));else sessionStorage.removeItem(sessionKey)}
async function requestCloud(path,method='GET',body,extra={}){
 const headers={apikey:cloudKey,...extra};if(cloudSession?.access_token)headers.Authorization='Bearer '+cloudSession.access_token;
 if(body!==undefined&&!(body instanceof Blob)){headers['Content-Type']='application/json';body=JSON.stringify(body)}
 const r=await fetch(cloudURL+path,{method,headers,body,signal:AbortSignal.timeout(20000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}
 if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||data?.error||'云端操作失败，请稍后重试');return data;
}
async function ensureSession(){
 if(!cloudSession||cloudSession.expires_at>Date.now()/1000+60)return;
 if(!refreshing)refreshing=requestCloud('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:cloudSession.refresh_token}).then(saveSession).catch(e=>{saveSession(null);throw e}).finally(()=>refreshing=null);
 await refreshing;
}
async function displayImage(path){
 if(/^\.\/media\/[a-f0-9]{32,40}\.(jpg|png|webp)$/.test(path))return path;
 if(!/^uploads\/[a-f0-9-]+\.(jpg|png|webp)$/.test(path))throw Error('图片路径无效');
 const result=await requestCloud('/storage/v1/object/sign/journal-media/'+path,'POST',{expiresIn:3600});
 const url=cloudURL+'/storage/v1'+result.signedURL;imageKeys.set(url,path);return url;
}
async function api(path,method='GET',value){
 try{await ensureSession()}catch(e){if(path!=='session')throw e}
 if(path==='session')return {admin:cloudSession?await requestCloud('/rest/v1/rpc/can_edit_journal','POST',{}):false};
 if(path==='login'){
  const session=await requestCloud('/auth/v1/token?grant_type=password','POST',value);saveSession(session);
  try{if(!await requestCloud('/rest/v1/rpc/can_edit_journal','POST',{}))throw Error('这个账号没有编辑权限')}catch(e){saveSession(null);throw e}return {admin:true};
 }
 if(path==='logout'){try{await requestCloud('/auth/v1/logout','POST')}catch{}finally{saveSession(null)}return {ok:true}}
 if(path==='posts'&&method==='GET'){
  let rows;
  try{rows=await requestCloud('/rest/v1/journal_posts?select=*&order=date.desc')}catch(e){
   if(cloudSession||!(e instanceof TypeError||e.name==='TimeoutError'))throw e;
   const cached=await fetch('./posts.json',{cache:'no-store'});if(!cached.ok)throw e;
   toast('云端暂时无法连接，正在显示原有相册。登录上传需要网络恢复。');return cached.json();
  }
  try{const r=await fetch('./repository-posts.json',{cache:'no-store'});if(r.ok){const extra=await r.json();const ids=new Set(rows.map(p=>p.id));rows.push(...extra.filter(p=>!ids.has(p.id)));rows.sort((a,b)=>new Date(b.date)-new Date(a.date))}}catch{}
  rows=rows.map(p=>p.category==='photo'&&p.body.startsWith('[album:travel]\n')?{...p,category:'travel',body:p.body.slice(15)}:p);
  let failed=false;
  const resolved=await Promise.all(rows.map(async p=>({...p,images:await Promise.all(p.images.map(async path=>{
   try{return await displayImage(path)}catch{
    failed=true;const placeholder='./avatar.jpg?unavailable='+encodeURIComponent(path);imageKeys.set(placeholder,path);return placeholder;
   }
  }))})));
  if(failed)toast('部分图片暂时无法显示，文章仍可正常阅读。');
  return resolved;
 }
 if(path==='posts'&&method==='POST'){
  const id=value.id||crypto.randomUUID();const row={...value,id,date:posts.find(p=>p.id===id)?.date||new Date().toISOString(),images:value.images.map(url=>imageKeys.get(url)||url)};
  if(row.category==='travel'){row.category='photo';row.body='[album:travel]\n'+row.body}
  await requestCloud('/rest/v1/journal_posts?on_conflict=id','POST',row,{Prefer:'resolution=merge-duplicates,return=minimal'});return {id};
 }
 if(path.startsWith('posts/')&&method==='DELETE'){await requestCloud('/rest/v1/journal_posts?id=eq.'+encodeURIComponent(path.slice(6)),'DELETE');return {ok:true}}
 if(path==='uploads'){
  const bytes=Uint8Array.from(atob(value.content),c=>c.charCodeAt(0));if(bytes.length>8388608)throw Error('单张图片不能超过8MB');
  let ext,type;if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){ext='jpg';type='image/jpeg'}else if(bytes.slice(0,8).join() ==='137,80,78,71,13,10,26,10'){ext='png';type='image/png'}else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){ext='webp';type='image/webp'}else throw Error('只支持 JPG、PNG、WebP 图片');
  const key='uploads/'+crypto.randomUUID()+'.'+ext;await requestCloud('/storage/v1/object/journal-media/'+key,'POST',new Blob([bytes],{type}),{'Content-Type':type});return {url:await displayImage(key)};
 }
 throw Error('不支持的操作');
}
