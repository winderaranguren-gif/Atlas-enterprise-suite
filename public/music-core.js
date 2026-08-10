(()=>{
'use strict';

const catalog=Object.freeze([
  {id:'first-light',title:'First Light',mood:'uplifting',baseHz:220,bpm:84},
  {id:'horizon-rise',title:'Horizon Rise',mood:'cinematic',baseHz:196,bpm:76},
  {id:'pulse-core',title:'Pulse Core',mood:'energetic',baseHz:261.63,bpm:112},
  {id:'focus-flow',title:'Focus Flow',mood:'focused',baseHz:174.61,bpm:72},
  {id:'vector-drive',title:'Vector Drive',mood:'motion',baseHz:246.94,bpm:104},
  {id:'calm-room',title:'Calm Room',mood:'calm',baseHz:146.83,bpm:60}
].map(track=>Object.freeze({...track,rights:Object.freeze({owner:'ATLAS Originals',playback:'granted',atlasVideoSync:'granted',commercialReuse:'atlas-owned',externalProvider:false})})));

let context=null;
let active=[];
function audio(){const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)throw new Error('Web Audio is unavailable in this browser.');context=context||new Ctx();return context;}
function stop(){for(const node of active){try{node.stop?.();}catch{}try{node.disconnect?.();}catch{}}active=[];return true;}
function play(id,{duration=18,volume=.08}={}){
  const track=catalog.find(item=>item.id===id);if(!track)throw new Error('ATLAS Original not found.');stop();
  const ctx=audio();const master=ctx.createGain();master.gain.setValueAtTime(Math.max(0,Math.min(.2,volume)),ctx.currentTime);master.connect(ctx.destination);active.push(master);
  const ratios=[1,1.25,1.5,2];const beat=60/track.bpm;const end=ctx.currentTime+Math.max(3,Math.min(60,duration));
  ratios.forEach((ratio,index)=>{const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type=index%2?'sine':'triangle';osc.frequency.value=track.baseHz*ratio;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.18/(index+1),ctx.currentTime+.8);gain.gain.setValueAtTime(.18/(index+1),Math.max(ctx.currentTime+.8,end-.8));gain.gain.linearRampToValueAtTime(0,end);osc.connect(gain);gain.connect(master);osc.start();osc.stop(end);active.push(osc,gain);});
  const pulse=ctx.createOscillator();const pulseGain=ctx.createGain();pulse.type='sine';pulse.frequency.value=track.baseHz/2;pulseGain.gain.setValueAtTime(.02,ctx.currentTime);pulse.connect(pulseGain);pulseGain.connect(master);pulse.start();pulse.stop(end);active.push(pulse,pulseGain);
  window.dispatchEvent(new CustomEvent('atlas:music:playing',{detail:{track:{id:track.id,title:track.title},duration,beat}}));return {track,duration,beat};
}

window.ATLASMusicCore=Object.freeze({version:'1.1.0',mode:'atlas-originals',catalog:()=>catalog.map(item=>({...item,rights:{...item.rights}})),play,stop,status:()=>({active:true,providerIndependent:true,tracks:catalog.length,playing:active.length>0})});
})();