import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const output=resolve(root,'static-site');mkdirSync(join(output,'media'),{recursive:true});
const db=new DatabaseSync(join(root,'data/journal.db'),{readOnly:true});
const rows=db.prepare("SELECT id,title,category,body,images,status,date FROM posts WHERE status='published' ORDER BY date DESC").all();db.close();
const posts=rows.map(row=>({...row,images:JSON.parse(row.images).map(path=>{if(!/^\/media\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(path))throw Error('非法图片路径');copyFileSync(join(root,'data/uploads',path.slice(7)),join(output,path.slice(1)));return './'+path.slice(1)})}));
for(const file of ['style.css','journal.css','journal-dark.css','hero.png','avatar.jpg']){
 if(file.endsWith('.css'))writeFileSync(join(output,file),readFileSync(join(root,'public',file),'utf8').replaceAll("url('/","url('./").replaceAll('url("/','url("./'));
 else copyFileSync(join(root,'public',file),join(output,file));
}
let html=readFileSync(join(root,'public/index.html'),'utf8').replaceAll('href="/','href="./').replaceAll('src="/','src="./').replace('id="account"','id="account" hidden');
writeFileSync(join(output,'index.html'),html);writeFileSync(join(output,'.nojekyll'),'');
writeFileSync(join(output,'posts.json'),JSON.stringify(posts));
let app=readFileSync(join(root,'public/app.js'),'utf8');
const apiStart=app.indexOf('async function api('),apiEnd=app.indexOf('function modal(',apiStart);
app=app.slice(0,apiStart)+"async function api(path){if(path==='session')return {admin:false};if(path==='posts'){const response=await fetch('./posts.json');if(!response.ok)throw Error('内容加载失败');return response.json()}throw Error('静态网站不提供编辑功能')}\n"+app.slice(apiEnd);
const loginStart=app.indexOf("$('#account').onclick="),loginEnd=app.indexOf('function openPost(',loginStart);app=app.slice(0,loginStart)+app.slice(loginEnd);
const editorStart=app.indexOf('function editor(');app=app.slice(0,editorStart)+`window.onpopstate=()=>{const id=new URLSearchParams(location.search).get('post');if(id)openPost(id,false);else $('#dialog').close()};
(async()=>{try{await refresh();const id=new URLSearchParams(location.search).get('post');if(id)openPost(id,false)}catch(e){toast(e.message)}})();`;
app=app.replace("if(location.pathname.startsWith('/post/'))history.pushState({},'', '/');","if(new URLSearchParams(location.search).has('post')){const url=new URL(location.href);url.searchParams.delete('post');history.pushState({},'',url)}");
app=app.replace("if(push)history.pushState({},'', '/post/'+p.id);","if(push){const url=new URL(location.href);url.searchParams.set('post',p.id);history.pushState({},'',url)}");
app=app.replace("location.origin+'/post/'+p.id","(()=>{const url=new URL(location.href);url.searchParams.set('post',p.id);return url.href})()");
app=app.replaceAll('href="/?','href="./?');
// Remove unreachable management actions from the public bundle.
app=app.replace(/\$\{admin\?'<button class="primary" id="edit">编辑记录<\/button><button class="outline" id="delete">删除<\/button>':''\}/,'');
const management=app.indexOf("if(admin){$('#edit')");if(management>=0){const next=app.indexOf('\nwindow.onpopstate',management);app=app.slice(0,management)+'}\n'+app.slice(next)}
writeFileSync(join(output,'app.js'),app);
console.log(JSON.stringify({output,publishedPosts:posts.length,images:posts.reduce((n,p)=>n+p.images.length,0)}));
