const hero=document.querySelector('.hero');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const camera=document.createElement('div');
camera.className='hero-camera';camera.setAttribute('aria-hidden','true');
camera.innerHTML='<div class="hero-scene"></div>';
hero.prepend(camera);
hero.classList.add('motion-ready');
const atmosphere=document.createElement('div');
atmosphere.className='atmosphere';
atmosphere.setAttribute('aria-hidden','true');
atmosphere.innerHTML='<div class="light-ribbon ribbon-one"></div><div class="light-ribbon ribbon-two"></div><div class="ambient-bloom"></div>'+Array.from({length:18},()=>'<i class="firefly"></i>').join('');
hero.prepend(atmosphere);
let frame=0, pendingX=0,pendingY=0,currentX=0,currentY=0;
function tick(){currentX+=(pendingX-currentX)*.065;currentY+=(pendingY-currentY)*.065;camera.style.transform=`translate3d(${currentX}px,${currentY}px,0)`;if(Math.abs(pendingX-currentX)+Math.abs(pendingY-currentY)>.02)frame=requestAnimationFrame(tick);else frame=0}
function reset(){pendingX=0;pendingY=0;if(preference.matches){cancelAnimationFrame(frame);frame=0;currentX=currentY=0;camera.style.transform='none'}else if(!frame)frame=requestAnimationFrame(tick)}
hero.addEventListener('pointermove',event=>{
 if(preference.matches||!finePointer.matches||event.pointerType==='touch')return;
 const bounds=hero.getBoundingClientRect();
 pendingX=(event.clientX-bounds.left-bounds.width/2)/bounds.width*-18;
 pendingY=(event.clientY-bounds.top-bounds.height/2)/bounds.height*-10;
 if(!frame)frame=requestAnimationFrame(tick);
});
hero.addEventListener('pointerleave',reset);
preference.addEventListener('change',reset);
finePointer.addEventListener('change',reset);
const observer=new IntersectionObserver(([entry])=>hero.classList.toggle('motion-paused',!entry.isIntersecting));observer.observe(hero);
document.addEventListener('visibilitychange',()=>hero.classList.toggle('page-hidden',document.hidden));
const revealObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target)}},{threshold:.06});
function reveal(){if(preference.matches)return;document.querySelectorAll('.panel:not(.reveal),.section-heading:not(.reveal),.toolbar:not(.reveal),.card:not(.reveal),.empty:not(.reveal)').forEach(el=>{el.classList.add('reveal');revealObserver.observe(el)})}
reveal();new MutationObserver(reveal).observe(document.querySelector('#grid'),{childList:true});
