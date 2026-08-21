import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { WebSocket } from 'ws';
import { createVideoSignalServer } from '../atlas/video-signal-server.mjs';

let signaling;
const server=createServer((req,res)=>{
  if(signaling?.handleHttpRequest(req,res))return;
  res.writeHead(404,{'content-type':'text/plain'});res.end('not found');
});
signaling=createVideoSignalServer({server});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const address=server.address();
const port=typeof address==='object'&&address?address.port:0;
assert.ok(port>0);

function client(peer){
  const ws=new WebSocket(`ws://127.0.0.1:${port}/api/video/signal?room=portable-test&channel=media&peer=${peer}`);
  const queue=[];
  const waiters=[];
  ws.on('message',raw=>{
    let payload;try{payload=JSON.parse(String(raw));}catch{return;}
    const index=waiters.findIndex(waiter=>waiter.predicate(payload));
    if(index>=0){const [waiter]=waiters.splice(index,1);clearTimeout(waiter.timer);waiter.resolve(payload);}else queue.push(payload);
  });
  const open=new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  function next(predicate,timeout=2000){
    const index=queue.findIndex(predicate);
    if(index>=0)return Promise.resolve(queue.splice(index,1)[0]);
    return new Promise((resolve,reject)=>{
      const waiter={predicate,resolve,reject,timer:null};
      waiter.timer=setTimeout(()=>{const i=waiters.indexOf(waiter);if(i>=0)waiters.splice(i,1);reject(new Error('Timed out waiting for WebSocket message'));},timeout);
      waiters.push(waiter);
    });
  }
  return {ws,open,next};
}

let a,b;
try{
  a=client('peer-a');
  await a.open;
  const welcomeA=await a.next(x=>x.type==='welcome');
  assert.equal(welcomeA.peer,'peer-a');
  assert.equal(welcomeA.peers,0);

  b=client('peer-b');
  await b.open;
  const [welcomeB,joined]=await Promise.all([
    b.next(x=>x.type==='welcome'),
    a.next(x=>x.type==='peer-joined'&&x.peer==='peer-b')
  ]);
  assert.equal(welcomeB.peers,1);

  a.ws.send(JSON.stringify({type:'ready',to:'peer-b',payload:{codec:'opus'}}));
  const relayed=await b.next(x=>x.type==='ready');
  assert.equal(relayed.from,'peer-a');
  assert.equal(relayed.channel,'media');
  assert.equal(relayed.to,undefined,'target field must be stripped to preserve room broadcast semantics');
  assert.deepEqual(relayed.payload,{codec:'opus'});

  a.ws.send(JSON.stringify({type:'ping'}));
  const pong=await a.next(x=>x.type==='pong');
  assert.equal(typeof pong.at,'number');

  const healthResponse=await fetch(`http://127.0.0.1:${port}/api/video/signal?room=portable-test`);
  assert.equal(healthResponse.status,200);
  const health=await healthResponse.json();
  assert.equal(health.service,'ATLAS Portable Video Signaling');
  assert.equal(health.peers,2);
  assert.equal(health.scope,'single-node');

  const peerLeft=a.next(x=>x.type==='peer-left'&&x.peer==='peer-b');
  b.ws.close(1000,'test complete');
  await peerLeft;
  console.log('ATLAS portable video signaling validation passed.');
}finally{
  try{a?.ws.close(1000,'test shutdown');}catch{}
  try{b?.ws.close(1000,'test shutdown');}catch{}
  await new Promise(resolve=>setTimeout(resolve,25));
  await signaling.close().catch(()=>{});
  await new Promise(resolve=>server.close(resolve));
}
