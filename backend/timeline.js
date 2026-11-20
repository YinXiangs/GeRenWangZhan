function renderTimeline(){
 document.querySelectorAll('.left-sidebar,.right-sidebar').forEach(e=>e.hidden=true);
 $('.toolbar').hidden=true;$('#featured').innerHTML='';$('#heading').textContent='我的成长轨迹';
 for(const id of ['home-pagination','gallery-pagination'])if(document.getElementById(id))document.getElementById(id).hidden=true;
 $('#new').hidden=true;$('#account').textContent=admin?'退出管理 ↗':'管理登录 ↗';
 let controls=document.getElementById('timeline-controls');if(!controls){controls=document.createElement('div');controls.id='timeline-controls';$('.section-heading').append(controls)}
 controls.innerHTML=admin?'<button class="primary" id="timeline-add">＋ 编辑轨迹 / 新增节点</button>':'<span class="timeline-note">登录管理后可编辑轨迹</span>';
 if(admin)$('#timeline-add').onclick=()=>editor({title:'',category:'timeline',body:'',images:[],date:new Date().toISOString()});
 const entries=posts.filter(p=>p.category==='timeline').sort((a,b)=>new Date(a.date)-new Date(b.date));
 $('#grid').innerHTML=entries.length?entries.map(p=>`<article class="timeline-stop ${Number(new Intl.DateTimeFormat('en-US',{day:'numeric',timeZone:'Asia/Shanghai'}).format(new Date(p.date)))%2===0?'day-even':'day-odd'}"><time>${new Date(p.date).toLocaleDateString('zh-CN')}</time><span class="timeline-dot"></span><button class="timeline-card" data-timeline="${escape(p.id)}">${p.images[0]?`<img src="${escape(p.images[0])}" alt="${escape(p.title)}">`:'<div class="timeline-placeholder">下一程，由你书写</div>'}<div><h3>${escape(p.title)}</h3><p>${escape(p.body.slice(0,100))}</p><span>查看详情 ↗</span></div></button>${admin?`<button class="outline" data-edit-timeline="${escape(p.id)}">编辑节点</button>`:''}</article>`).join(''):'<div class="empty"><h3>从这里，记录新的旅程</h3><p>毕业、实习、第一次完成项目……把值得记住的时间留在这里。</p></div>';
 document.querySelectorAll('[data-timeline]').forEach(b=>b.onclick=()=>openPost(b.dataset.timeline));
 document.querySelectorAll('[data-edit-timeline]').forEach(b=>b.onclick=()=>editor(posts.find(p=>p.id===b.dataset.editTimeline)));
}
