const actor=document.querySelector('#fei-actor');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let finish;
let animation,ready=false;
const surface=actor.querySelector('.sprite-surface');
const states={enter:{start:0,duration:1500},idle:{start:18,duration:3600},talk:{start:36,duration:1600},pet:{start:54,duration:1800}};
function play(state,duration){
 clearTimeout(finish);animation?.cancel();actor.dataset.state=reduceMotion.matches?'still':state;
 if(!ready||reduceMotion.matches)return;
 const config=states[state];
 const frames=Array.from({length:18},(_,i)=>{const index=config.start+i;return {backgroundPosition:`${index%9/8*100}% ${Math.floor(index/9)/7*100}%`,offset:i/18,easing:'steps(1,end)'}});
 frames.push({...frames[17],offset:1});
 animation=surface.animate(frames,{duration:config.duration,iterations:state==='idle'||state==='talk'?Infinity:1,fill:'forwards'});
 if(duration)finish=setTimeout(()=>play('idle'),duration);
}
const sheet=new Image();sheet.src='/fei-actions-72.png';sheet.onload=()=>{ready=true;actor.classList.add('sprites-loaded');play('enter',1500)};
actor.addEventListener('click',()=>play('pet',1800));
document.querySelector('#composer').addEventListener('submit',()=>{if(document.querySelector('#message').value.trim())play('talk',3200)},true);
document.querySelector('#message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target.value.trim())play('talk',3200)},true);
reduceMotion.addEventListener('change',()=>play('idle'));
document.addEventListener('visibilitychange',()=>{if(document.hidden)animation?.pause();else animation?.play()});
