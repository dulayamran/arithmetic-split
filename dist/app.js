'use strict';
const E=window.Split, main=document.querySelector('#main'), storeKey='arithmetic-split-v1';
const $=id=>document.getElementById(id);
const encode=runs=>JSON.stringify({format:'arithmetic-split-v1',runs});
const saved=()=>E.decode(localStorage.getItem(storeKey)||encode([]));
let runs=[], storageOK=true, active=null, timer=0, noticeTimer=0, last=null;
let device=matchMedia('(pointer: coarse)').matches?'mobile':'laptop';
try { runs=saved(); device=localStorage.getItem('split-device')||device; } catch {storageOK=false;}
if(!E.devices.includes(device)) device='laptop';
const cap=s=>s[0].toUpperCase()+s.slice(1);
const tidy=(x,digits=1)=>x===null?'—':Number(x.toFixed(digits)).toLocaleString('en-GB');
const signed=(x,digits=1)=>x===null?'—':(x>0?'+':'')+tidy(x,digits);
const has=(r,d,m)=>runs.some(x=>x.round===r&&x.device===d&&x.mode===m);
function notify(message){$('notice').textContent=message;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').textContent='',5500);}
function next(){
  for(const r of E.rounds) for(const m of E.order(r,device)){
    if(!has(r,device,m)) return {round:r,mode:m,locked:r===4&&E.prediction(runs)===null};
  }
  return null;
}
function backup(r){
  const merged=E.merge(runs,r);
  try{
    const fresh=E.merge(saved(),merged);
    localStorage.setItem(storeKey,encode(fresh));runs=fresh;storageOK=true;
  } catch(err){
    if(err.message.includes('Two different runs')) throw err;
    runs=merged;storageOK=false;
  }
}
function download(name,content,type){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function transfers(){
  return '<div class="actions"><button data-action="import">Import JSON</button><button data-action="export" '+(!runs.length?'disabled':'')+'>Export JSON</button></div>';
}
function dashboard(){
  const n=next();
  const desc=!n?'All eight runs on this device are complete.':n.locked?
    'Import the other device’s calibration runs to unlock your prediction.':
    (n.mode==='solve'?'Solve each expression and type its answer.':'Copy the displayed number as quickly and accurately as you can.');
  const label=!n?'View results':n.locked?'Import calibration data':'Start '+n.mode+' run';
  return '<div class="dash"><section class="hero"><div><span class="kicker">Reported Zetamac averages</span><h1>The 13-answer gap</h1><p>How much of your mobile advantage survives when the arithmetic is taken away?</p></div>'+
    '<div class="bars" aria-label="Laptop 83 and mobile 96 answers"><span>Laptop</span><div class="rail"><i style="width:83%"></i></div><b>83</b><span>Mobile</span><div class="rail mobile"><i style="width:96%"></i></div><b>96</b></div></section>'+
    '<section class="card setup"><div class="between"><h2>Run a session</h2><span class="tag">2 min</span></div><p class="dim">Select the device you’re using.</p>'+
    '<div class="device" aria-label="Current device">'+E.devices.map(d=>'<button data-device="'+d+'" aria-pressed="'+(device===d)+'">'+cap(d)+'</button>').join('')+'</div>'+
    '<div class="kicker">'+(n?'Round '+n.round+' · '+(n.round===4?'Held-out test':'Calibration'):'Session complete')+'</div><p class="small">'+desc+'</p>'+
    '<button class="primary wide" data-action="'+(!n?'results':n.locked?'import':'begin')+'">'+label+'</button></section></div>'+
    (last?'<section class="card section"><div class="between"><h3>Last run</h3><strong>'+last.trials.length+' correct</strong></div><p>'+cap(last.device)+' · '+cap(last.mode)+' · Round '+last.round+'</p></section>':'')+
    '<section class="section card"><div class="between"><h2>Session log</h2>'+transfers()+'</div>'+
    '<div class="tablewrap"><table class="matrix"><thead><tr><th>Round</th><th>Laptop</th><th>Mobile</th></tr></thead><tbody>'+
    E.rounds.map(r=>'<tr><td><strong>'+String(r).padStart(2,'0')+'</strong> <span class="dim">'+(r===4?'Test':'Calibration')+'</span></td>'+
      E.devices.map(d=>'<td>'+E.order(r,d).map(m=>{const run=runs.find(x=>x.round===r&&x.device===d&&x.mode===m);
        return '<span class="pill '+(run?'ok':n&&n.round===r&&d===device&&n.mode===m&&!n.locked?'next':'')+'">'+cap(m)+(run?' '+run.trials.length:'')+'</span>';}).join('')+'</td>').join('')+'</tr>').join('')+
    '</tbody></table></div><p class="small dim" style="margin-top:16px">Data stays in this browser. Export from one device and import on the other to combine runs.</p></section>';
}
function results(){
  const pairs=E.rounds.filter(r=>E.devices.every(d=>E.modes.every(m=>has(r,d,m))));
  const train=pairs.filter(r=>r<4);
  const pred=E.prediction(runs);
  function table(rounds){
    const group=(d,m)=>E.summary(runs.filter(x=>rounds.includes(x.round)&&x.device===d&&x.mode===m));
    return '<div class="tablewrap"><table class="matrix"><thead><tr><th>Metric</th><th>Laptop</th><th>Mobile</th><th>Mobile − laptop</th></tr></thead><tbody>'+
      E.modes.map(m=>{const l=group('laptop',m),a=group('mobile',m);
        return '<tr><td colspan="4"><strong>'+cap(m)+'</strong></td></tr>'+
          [['Score','score',1,''],['First digit','first',1,' ms'],['Remaining entry','entry',1,' ms'],['Corrected trials','corrected',100,'%']].map(([title,k,scale,unit])=>{
            const lt=l[k]===null?null:l[k]*scale,mb=a[k]===null?null:a[k]*scale;
            const fmt=x=>x===null?'—':tidy(x)+unit;
            return '<tr><td>'+title+'</td><td>'+fmt(lt)+'</td><td>'+fmt(mb)+'</td><td>'+(lt===null||mb===null?'—':signed(mb-lt)+unit)+'</td></tr>';
          }).join('');
      }).join('')+'</tbody></table></div>';
  }
  const get=(d,m)=>runs.find(r=>r.round===4&&r.device===d&&r.mode===m);
  const lm=get('laptop','solve'),mm=get('mobile','solve');
  const observed=lm&&mm?mm.trials.length-lm.trials.length:null;
  const pace=(d,m)=>{
    const selected=runs.filter(r=>train.includes(r.round)&&r.device===d&&r.mode===m);
    const total=selected.reduce((acc,r)=>acc+r.trials.length,0);
    return total?selected.length*E.duration/total:null;
  };
  const gap=m=>pace('laptop',m)===null||pace('mobile',m)===null?null:pace('laptop',m)-pace('mobile',m);
  const paceText=train.length?'<div class="empty"><strong>Mobile time advantage per answer</strong><p>Solve: '+signed(gap('solve'),0)+' ms · Copy: '+signed(gap('copy'),0)+' ms</p><small>Two-minute run time divided by answers completed, pooled by device. Positive means faster on mobile.</small></div>':'';
  const calText=train.length?table(train):'<p class="empty">Complete and combine all four runs in one calibration round to see the comparison.</p>';
  return '<div class="top"><h1>Results</h1></div><div class="twocol"><section class="card stack"><div class="kicker">Calibration prediction</div><h2 class="metric">'+(pred===null?'Pending':signed(pred))+'</h2><p>'+(pred===null?'Unlock after three complete, paired calibration rounds.':'Predicted extra mobile answers in the next solve run. Frozen before the test.')+'</p></section>'+
    '<section class="card stack"><div class="kicker">Held-out solve gap</div><h2 class="metric">'+(observed===null?'Pending':signed(observed,0))+'</h2><p>'+(observed===null?'Complete round 4 solve runs on both devices and combine the files.':'Actual minus predicted gap: '+signed(observed-pred)+' answers.')+'</p></section></div>'+
    '<section class="section card stack"><h2>Paired calibration</h2><p class="dim">'+train.length+' of 3 paired rounds. Scores are averaged by run. Timings pool completed answers.</p>'+paceText+calText+'</section>'+
    (pairs.includes(4)?'<section class="section card stack"><h2>Held-out comparison</h2>'+table([4])+'</section>':'')+
    '<section class="section card stack"><h2>Take your data</h2><p>JSON combines devices. CSV gives one row per question, including the unfinished prompt at timeout.</p>'+transfers()+
    '<button data-action="csv" '+(!runs.length?'disabled':'')+'>Download trial CSV</button></section>';
}
function protocol(){
  return '<div class="top"><h1>Protocol</h1></div><article class="card protocol stack">'+
    '<h2>The question</h2><p>Your reported averages are 83 on laptop and 96 on mobile. This experiment measures its own scores using a Zetamac-style drill. It does not retrieve account history.</p>'+
    '<section class="stack"><h2>Run four matched rounds</h2><p>Each round contains one solve run and one copy run on each device. Allow eight minutes of timed work per round, plus breaks. Use the first three rounds to calibrate and the fourth to test.</p>'+
    '<p>Start rounds 1 and 3 on laptop and rounds 2 and 4 on mobile. Follow the suggested mode order on each device. Keep posture, breaks and time of day reasonably consistent. Use the same browser on each device throughout.</p></section>'+
    '<section class="stack"><h2>The arithmetic control</h2><p>Every block of 16 includes four questions per operation. Addition uses operands 2–100, multiplication uses 2–12 by 2–100, and subtraction and division reverse those operations. Copy mode displays the answer. Both devices see the same pool of numbers within each block in different orders. The last, partial block can differ.</p>'+
    '<p>The timer starts when the prompt appears. Type digits with your usual keyboard and use backspace to correct. A matching answer advances immediately. Switching tabs or hiding the page discards the active run.</p></section>'+
    '<section class="stack"><h2>Compare your devices</h2><p>On one device, export the JSON file after calibration and import it on the other. Export the combined file and import it back on the first device. Both will then have the same frozen prediction. Repeat the transfer after the test runs.</p>'+
    '<p>The forecast is the mean mobile-minus-laptop solve score across the three paired calibration rounds. The copy task measures the device gap when the answer is visible. Compare timing gaps in milliseconds: the time before the first digit includes reading, planning and movement, and cannot isolate mental calculation. A copied answer still needs to be read.</p>'+
    '<p>Corrections count edits that remove or replace earlier digits. Timing summaries use completed trials, while exports retain unfinished trials. Results describe your own performance under these conditions.</p></section></article>';
}
function render(){
  if(active)return;
  const page=['results','protocol'].includes(location.hash.slice(1))?location.hash.slice(1):'experiment';
  document.querySelectorAll('nav a').forEach(a=>a.getAttribute('href')==='#'+page?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
  main.innerHTML=(!storageOK?'<p class="empty">Browser storage is unavailable. Export your JSON before closing the page.</p>':'')+
    (page==='results'?results():page==='protocol'?protocol():dashboard());
}
function begin(){
  const n=next();if(!n||n.locked||active)return;
  document.body.classList.add('racing');
  main.innerHTML='<section class="card run"><div class="between"><div><span class="kicker">'+cap(device)+' · Round '+n.round+'</span><h2>'+cap(n.mode)+' run</h2></div><span class="time" id="clock">2:00</span></div>'+
    '<div class="progress"><i id="bar" style="width:100%"></i></div><p id="question" class="prompt"></p>'+
    '<input id="answer" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="12" aria-label="Numeric answer" autocomplete="off" autocapitalize="off" spellcheck="false">'+
    '<div class="between"><span id="score">0 correct</span><button data-action="discard">Discard run</button></div><div class="hint center" id="feedback"></div></section>';
  const input=$('answer');input.focus({preventScroll:true});
  const now=performance.now();active=new E.TrialClock(n.round,device,n.mode,now);showQuestion();
  input.addEventListener('beforeinput',e=>{if(e.inputType?.includes('Paste')||e.inputType?.includes('Drop'))e.preventDefault();});
  input.addEventListener('paste',e=>e.preventDefault());input.addEventListener('drop',e=>e.preventDefault());
  input.addEventListener('input',()=>{
    const t=performance.now();if(!active)return;
    if(t>=active.start+E.duration){end(true);return;}
    input.value=input.value.replace(/\D/g,'').slice(0,12);
    if(active.input(input.value,t)){input.value='';showQuestion();$('score').textContent=active.trials.length+' correct';}
    $('feedback').textContent=input.value&&!active.question.answer.startsWith(input.value)?'Check your entry':'';
  });
  function tick(){
    if(!active)return;
    const ms=active.start+E.duration-performance.now();
    if(ms<=0){end(true);return;}
    const sec=Math.ceil(ms/1000);
    $('clock').textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
    $('bar').style.width=100*ms/E.duration+'%';timer=requestAnimationFrame(tick);
  }
  tick();
}
function showQuestion(){ $('question').textContent=active.mode==='copy'?active.question.answer:active.question.expression; }
function end(keep){
  if(!active)return;
  cancelAnimationFrame(timer);const run=active;active=null;document.body.classList.remove('racing');
  if(keep){
    const record=run.finish();
    try{backup([record]);last=record;notify('Run recorded · '+record.trials.length+' correct');}
    catch(err){download('separate-run.json',encode(E.merge(runs.filter(x=>E.key(x.round,x.device,x.mode)!==E.key(record.round,record.device,record.mode)),[record])),'application/json');notify(err.message);}
  }else notify('Run discarded. The same slot is available again.');
  render();window.scrollTo(0,0);
}
function csv(){
  const rows=[['round','stage','device','mode','run_utc','trial','complete','expression','answer','elapsed_ms','first_digit_ms','remaining_entry_ms','corrections','events_json']];
  for(const r of runs) [...r.trials,r.unfinished].forEach((t,i)=>{
    const first=t.events[0]?.ms,done=i<r.trials.length;
    rows.push([r.round,r.round===4?'test':'calibration',r.device,r.mode,r.date,i+1,done,t.expression,t.answer,t.elapsed,first??'',done?t.elapsed-first:'',t.events.filter(e=>e.corrected).length,JSON.stringify(t.events)]);
  });
  download('arithmetic-split-trials.csv',rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n'),'text/csv');
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.device&&!active){device=b.dataset.device;try{localStorage.setItem('split-device',device);}catch{}render();return;}
  switch(b.dataset.action){
    case 'begin':begin();break;
    case 'discard':end(false);break;
    case 'export':download('arithmetic-split.json',encode(runs),'application/json');break;
    case 'import':$('file').click();break;
    case 'csv':csv();break;
    case 'results':location.hash='results';break;
  }
});
$('file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>20e6)throw Error('Choose a JSON file under 20 MB.');
    const imported=E.decode(await file.text()),old=runs.length;backup(imported);
    notify('Imported '+(runs.length-old)+' new runs.');render();
  }catch(err){notify('Import failed. '+err.message);}finally{e.target.value='';}
});
window.addEventListener('hashchange',()=>{if(active)end(false);render();window.scrollTo(0,0);});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)end(performance.now()>=active.start+E.duration);});
window.addEventListener('storage',e=>{if(e.key===storeKey){try{runs=E.merge(runs,saved());render();}catch(err){notify(err.message);}}});
render();
