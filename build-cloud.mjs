import {readFileSync,writeFileSync} from 'node:fs';
let app=readFileSync('public/app.js','utf8');
const start=app.indexOf('async function api('),end=app.indexOf('function modal(',start);
app=app.slice(0,start)+readFileSync('backend/cloud-api.js','utf8')+'\n'+app.slice(end);
app=app.replace("if(location.pathname.startsWith('/post/'))history.pushState({},'', '/');","if(new URLSearchParams(location.search).has('post')){const url=new URL(location.href);url.searchParams.delete('post');history.pushState({},'',url)}");
app=app.replace("if(push)history.pushState({},'', '/post/'+p.id);","if(push){const url=new URL(location.href);url.searchParams.set('post',p.id);history.pushState({},'',url)}");
app=app.replace("location.origin+'/post/'+p.id","(()=>{const url=new URL(location.href);url.searchParams.set('post',p.id);return url.href})()");
app=app.replaceAll("location.pathname.startsWith('/post/')","new URLSearchParams(location.search).has('post')").replaceAll("location.pathname.split('/')[2]","new URLSearchParams(location.search).get('post')");
app=app.replaceAll('href="/?','href="./?');
app=app.replace('placeholder="输入管理邮箱"','value="yin2164933041@outlook.com" placeholder="输入管理邮箱"');
const boot=app.lastIndexOf('(async()=>{try{admin=');
if(boot<0)throw Error('Startup block missing');
app=app.slice(0,boot)+`(async()=>{
 let shown=false;
 try{const r=await fetch('./posts.json?v=public-20261102-5',{cache:'no-store'});if(!r.ok)throw Error('公开文章加载失败');posts=await r.json();render();shown=true;const id=new URLSearchParams(location.search).get('post');if(id)openPost(id,false)}catch(e){toast(e.message)}
 try{admin=(await api('session')).admin;await refresh();if(!shown){const id=new URLSearchParams(location.search).get('post');if(id)openPost(id,false)}}catch(e){if(!shown)$('#grid').innerHTML='<div class="empty">暂时无法加载，请刷新重试。</div>'}
})();`;
writeFileSync('static-site/app.js',app);
writeFileSync('static-site/index.html',readFileSync('public/index.html','utf8').replaceAll('href="/','href="./').replaceAll('src="/','src="./').replace('src="./app.js"','src="./app.js?v=cloud-20261102-5"'));
const posts=JSON.parse(readFileSync('static-site/posts.json','utf8'));
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const sql=`begin;\ncreate or replace function public.can_edit_journal() returns boolean language sql stable security invoker set search_path='' as $$ select private.is_site_admin(); $$;\nrevoke all on function public.can_edit_journal() from public;\ngrant execute on function public.can_edit_journal() to anon, authenticated;\n`+posts.map(p=>`insert into public.journal_posts(id,title,category,body,images,status,date) values(${[p.id,p.title,p.category,p.body,JSON.stringify(p.images),p.status,p.date].map(quote).join(',')}) on conflict(id) do nothing;`).join('\n')+'\ncommit;';
writeFileSync('../../outputs/YinXiangs-cloud-content.sql',sql);
console.log('Cloud site built; SQL includes '+posts.length+' existing posts');
