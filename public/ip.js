const $=s=>document.querySelector(s),key='yinxiangs-ip-preview-v1';
const messages=$('#messages'),welcome=$('#welcome');
let history=[];
try{const stored=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(stored))history=stored.filter(m=>typeof m==='string'&&m.length<=4000).slice(-60)}catch{}
function bubble(text,role){const row=document.createElement('div');row.className='message '+role;const badge=document.createElement('div');badge.className='message-badge';badge.textContent=role==='user'?'你':'✦';const content=document.createElement('div');content.className='message-content';const name=document.createElement('span');name.textContent=role==='user'?'你':'界面演示';const body=document.createElement('p');body.textContent=text;content.append(name,body);row.append(badge,content);messages.append(row)}
function render(){messages.querySelectorAll('.message').forEach(m=>m.remove());welcome.hidden=history.length>0;for(const text of history){bubble(text,'user');bubble('已在本机保存这条演示消息。AI 还没有接入，目前不会生成智能回复。','assistant')}messages.scrollTop=messages.scrollHeight}
function update(){$('#send').disabled=!$('#message').value.trim();$('#counter').textContent=$('#message').value.length+' / 4000'}
function send(){const value=$('#message').value.trim();if(!value)return;history.push(value);history=history.slice(-60);try{localStorage.setItem(key,JSON.stringify(history))}catch{}$('#message').value='';update();render()}
$('#composer').onsubmit=e=>{e.preventDefault();send()};$('#message').oninput=update;$('#message').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};
document.querySelectorAll('[data-prompt]').forEach(button=>button.onclick=()=>{$('#message').value=button.dataset.prompt;update();$('#message').focus()});
$('#clear').onclick=()=>{if(!history.length){$('#message').focus();return}$('#clear-dialog').showModal()};$('#cancel-clear').onclick=()=>$('#clear-dialog').close();$('#confirm-clear').onclick=()=>{history=[];try{localStorage.removeItem(key)}catch{}render();$('#clear-dialog').close();$('#message').focus()};render();
