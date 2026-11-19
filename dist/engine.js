/* Shared experiment rules. Works directly in a browser and in Node's test runner. */
(function (root) {
  'use strict';
  const duration = 120000;
  const devices = ['laptop', 'mobile'];
  const modes = ['solve', 'copy'];
  const rounds = [1, 2, 3, 4];
  const key = (r, d, m) => [r, d, m].join('/');
  const mean = xs => xs.length ? xs.reduce((a,b)=>a+b,0) / xs.length : null;
  function random(seed) {
    return () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }
  function shuffle(array, rng) {
    for (let i=array.length-1; i>0; i--) {
      const j=Math.floor(rng()*(i+1));
      [array[i],array[j]]=[array[j],array[i]];
    }
    return array;
  }
  function block(round, device, mode, index) {
    const seed = 14591 + 7411*round + 961*index;
    const rng = random(seed);
    const pick = (min,max) => min+Math.floor(rng()*(max-min+1));
    const rows = Array.from({length:16}, (_,i)=>{
      const op = i%4;
      const a = op < 2 ? pick(2,100) : pick(2,12);
      const b = op < 2 ? pick(2,100) : pick(2,100);
      const tuples = [[a,'+',b,a+b],[a+b,'−',a,b],[a,'×',b,a*b],[a*b,'÷',a,b]];
      const [left,symbol,right,answer] = tuples[op];
      return {expression:left+' '+symbol+' '+right, answer:String(answer)};
    });
    return shuffle(rows,random(seed+3571*(1+devices.indexOf(device)*2+modes.indexOf(mode))));
  }
  function order(round, device) {
    return (round+devices.indexOf(device))%2 === 1 ? modes : [...modes].reverse();
  }
  class TrialClock {
    constructor(round,device,mode,start) {
      Object.assign(this,{round,device,mode,start,trials:[],events:[],opened:start,value:''});
      this.advance();
    }
    advance() {
      const i=this.trials.length;
      if (i%16===0) this.batch=block(this.round,this.device,this.mode,i/16);
      this.question=this.batch[i%16];
    }
    input(value,now) {
      if (now >= this.start+duration || this.value===value || !/^\d{0,12}$/.test(value)) return false;
      const corrected=this.value.length>0 && !value.startsWith(this.value);
      this.events.push({ms:Math.round(now-this.opened),value,corrected});
      this.value=value;
      if (value!==this.question.answer) return false;
      this.trials.push(this.row(now));
      this.events=[]; this.opened=now; this.value=''; this.advance();
      return true;
    }
    row(now) {
      return {expression:this.question.expression,answer:this.question.answer,
              elapsed:Math.round(now-this.opened),events:this.events.slice()};
    }
    finish() {
      return {round:this.round,device:this.device,mode:this.mode,date:new Date().toISOString(),
              trials:this.trials.slice(),unfinished:this.row(this.start+duration)};
    }
  }
  function summary(runs) {
    const trials=runs.flatMap(r=>r.trials);
    return {score:mean(runs.map(r=>r.trials.length)), first:mean(trials.map(t=>t.events[0].ms)),
      entry:mean(trials.map(t=>t.elapsed-t.events[0].ms)),
      corrected:mean(trials.map(t=>+t.events.some(e=>e.corrected)))};
  }
  function merge(...groups) {
    const byKey=new Map();
    for (const r of groups.flat()) {
      const id=key(r.round,r.device,r.mode), before=byKey.get(id);
      if (before && JSON.stringify(before)!==JSON.stringify(r)) throw Error('Two different runs use slot '+id+'. Keep those experiments separate.');
      byKey.set(id,r);
    }
    return [...byKey.values()].sort((a,b)=>key(a.round,a.device,a.mode).localeCompare(key(b.round,b.device,b.mode)));
  }
  function prediction(runs) {
    const calibration=runs.filter(r=>r.round<4);
    if (calibration.length!==12) return null;
    const gap=r=>r.find(x=>x.device==='mobile').trials.length-r.find(x=>x.device==='laptop').trials.length;
    return mean([1,2,3].map(i=>gap(calibration.filter(r=>r.round===i&&r.mode==='solve'))));
  }
  function checkRun(r) {
    if (!r || !rounds.includes(r.round)||!devices.includes(r.device)||!modes.includes(r.mode)||
        !Array.isArray(r.trials)||r.trials.length>5000||!Number.isFinite(Date.parse(r.date))) throw Error('Invalid run data.');
    let elapsed=0, pack;
    [...r.trials,r.unfinished].forEach((t,i)=>{
      if (i%16===0) pack=block(r.round,r.device,r.mode,i/16);
      const expected=pack[i%16], complete=i<r.trials.length;
      if (!t || t.answer!==expected.answer || t.expression!==expected.expression ||
          !Number.isInteger(t.elapsed)||t.elapsed<0||t.elapsed>duration||!Array.isArray(t.events)) throw Error('Invalid trial data.');
      let last=-1, prev='';
      for(const [j,e] of t.events.entries()){
        if(!e||!Number.isInteger(e.ms)||e.ms<last||e.ms>t.elapsed||typeof e.value!=='string'||
           !/^\d{0,12}$/.test(e.value)||prev===e.value||e.corrected!==(prev.length>0&&!e.value.startsWith(prev))||
           (e.value===t.answer&&(!complete||j!==t.events.length-1))) throw Error('Invalid timing event.');
        last=e.ms;prev=e.value;
      }
      if(complete && (prev!==t.answer||last!==t.elapsed)) throw Error('Incomplete answer in a scored trial.');
      elapsed+=t.elapsed;
    });
    if(Math.abs(elapsed-duration)>(r.trials.length+1)*.51) throw Error('Invalid run duration.');
  }
  function decode(raw){
    const file=JSON.parse(raw);
    if(file.format!=='arithmetic-split-v1'||!Array.isArray(file.runs)||file.runs.length>16) throw Error('Choose an Arithmetic Split JSON export.');
    file.runs.forEach(checkRun);
    const clean=merge(file.runs);
    if(clean.some(r=>r.round===4)&&prediction(clean)===null) throw Error('Test data needs its calibration records.');
    return clean;
  }
  const api={duration,devices,modes,rounds,key,mean,block,order,TrialClock,summary,merge,prediction,checkRun,decode};
  if(typeof module!=='undefined') module.exports=api;
  root.Split=api;
})(globalThis);
