const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../dist/engine.js');

function run(round,device,mode,n){
  const clock=new E.TrialClock(round,device,mode,0);
  for(let i=0;i<n;i++){
    const word=clock.question.answer;
    for(let j=0;j<word.length;j++) clock.input(word.slice(0,j+1),1000*(i+1)+10*j);
  }
  return clock.finish();
}
const wrap=runs=>JSON.stringify({format:'arithmetic-split-v1',runs});
test('sets match within each block, operations correspond to the solutions',()=>{
  for(const round of E.rounds)for(let i=0;i<3;i++){
    const ref=E.block(round,'laptop','solve',i);
    for(const dev of E.devices)for(const mode of E.modes){
      const batch=E.block(round,dev,mode,i);
      assert.deepEqual(batch.map(q=>JSON.stringify(q)).sort(),ref.map(q=>JSON.stringify(q)).sort());
      for(const q of batch){
        const [a,op,b]=q.expression.split(' ');
        const result={'+':Number(a)+Number(b),'−':a-b,'×':a*b,'÷':a/b}[op];
        assert.equal(q.answer,String(result));
      }
    }
  }
});
test('different order on the other device and in the other mode',()=>{
  const first=E.block(1,'laptop','solve',0);
  assert.notDeepEqual(first,E.block(1,'mobile','solve',0));
  assert.notDeepEqual(first,E.block(1,'laptop','copy',0));
  assert.deepEqual(E.order(1,'laptop'),['solve','copy']);
  assert.deepEqual(E.order(2,'laptop'),E.order(1,'mobile'));
});
test('first digit, entry duration, backspaces and deadline',()=>{
  const c=new E.TrialClock(1,'laptop','solve',100);
  c.input('9',150);c.input('',180);c.input(c.question.answer,450);
  c.input('7',500);
  assert.equal(c.input(c.question.answer,120100),false);
  const rec=c.finish();E.checkRun(rec);
  assert.equal(rec.trials.length,1);assert.equal(rec.unfinished.events.length,1);
  assert.deepEqual(E.summary([rec]),{score:1,first:50,entry:300,corrected:1});
});
test('freeze prediction before holdout, do not leak observed results into forecast',()=>{
  const records=[];
  for(let r=1;r<=3;r++)for(const d of E.devices)for(const m of E.modes)
    records.push(run(r,d,m,d==='mobile'?6+r:5));
  assert.equal(E.prediction(records.slice(0,-1)),null);
  assert.equal(E.prediction(records),3);
  const combined=E.merge(records,[run(4,'mobile','solve',0),run(4,'laptop','solve',20)]);
  assert.equal(E.prediction(combined),3);
  assert.deepEqual(E.decode(wrap(combined)),combined);
});
test('two device exports merge, repeated imports are idempotent, conflicts reject',()=>{
  const a=run(1,'mobile','solve',5),b=run(1,'laptop','solve',3);
  const both=E.merge(E.decode(wrap([a])),E.decode(wrap([b])));
  assert.deepEqual(E.merge(both,both),both);
  assert.throws(()=>E.merge(both,[run(1,'mobile','solve',2)]),/Two different/);
});
test('invalid files, altered scores and unmatched holdout are rejected',()=>{
  assert.throws(()=>E.decode('{}'));
  assert.throws(()=>E.decode(wrap([run(4,'mobile','copy',2)])),/calibration/);
  const bad=run(1,'laptop','solve',1);bad.trials[0].answer='000';
  assert.throws(()=>E.decode(wrap([bad])),/Invalid trial/);
});
