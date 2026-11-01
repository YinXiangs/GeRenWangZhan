const hero=document.querySelector('.hero');
const preference=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const atmosphere=document.createElement('div');
atmosphere.className='atmosphere';
atmosphere.setAttribute('aria-hidden','true');
atmosphere.innerHTML='<div class="light-ribbon ribbon-one"></div><div class="light-ribbon ribbon-two"></div>'+Array.from({length:18},(_,i)=>`<i class="firefly"></i>`).join('');
hero.prepend(atmosphere);
let frame=0, pendingX=0,pendingY=0;
function reset(){cancelAnimationFrame(frame);frame=0;hero.style.setProperty('--drift-x','0px');hero.style.setProperty('--drift-y','0px')}
hero.addEventListener('pointermove',event=>{
 if(preference.matches||!finePointer.matches||event.pointerType==='touch')return;
 const bounds=hero.getBoundingClientRect();
 pendingX=(event.clientX-bounds.left-bounds.width/2)/bounds.width*10;
 pendingY=(event.clientY-bounds.top-bounds.height/2)/bounds.height*6;
 if(!frame)frame=requestAnimationFrame(()=>{hero.style.setProperty('--drift-x',`${pendingX}px`);hero.style.setProperty('--drift-y',`${pendingY}px`);frame=0});
});
hero.addEventListener('pointerleave',reset);
preference.addEventListener('change',reset);
finePointer.addEventListener('change',reset);
const observer=new IntersectionObserver(([entry])=>hero.classList.toggle('motion-paused',!entry.isIntersecting));observer.observe(hero);
document.addEventListener('visibilitychange',()=>hero.classList.toggle('page-hidden',document.hidden));
