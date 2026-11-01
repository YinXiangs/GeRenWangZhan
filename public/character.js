const actor=document.querySelector('#fei-actor');
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
let finish;
function play(state,duration){clearTimeout(finish);actor.dataset.state=reduceMotion.matches?'still':state;if(duration&&!reduceMotion.matches)finish=setTimeout(()=>actor.dataset.state='idle',duration)}
const sheet=new Image();sheet.src='/fei-actions.png';sheet.onload=()=>{actor.classList.add('sprites-loaded');play('enter',1400)};
actor.addEventListener('click',()=>play('pet',1600));
document.querySelector('#composer').addEventListener('submit',()=>{if(document.querySelector('#message').value.trim())play('talk',1800)},true);
document.querySelector('#message').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.target.value.trim())play('talk',1800)},true);
reduceMotion.addEventListener('change',()=>play('idle'));
document.addEventListener('visibilitychange',()=>actor.classList.toggle('paused',document.hidden));
