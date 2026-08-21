import { WebSocketServer, WebSocket } from 'ws';

const DEFAULT_MAX_PEERS=12;
const DEFAULT_MAX_MESSAGE_BYTES=160000;
const ALLOWED_TYPES=new Set(['offer','answer','ice','hangup','media-state','ready','transcript','consent','note']);

const clean=(value,fallback,max,pattern=/[^A-Za-z0-9_-]/g)=>String(value||fallback).replace(pattern,'').slice(0,max)||fallback;
const cleanRoom=value=>clean(value,'',80);
const cleanPeer=value=>clean(value,crypto.randomUUID(),64);
const cleanChannel=value=>clean(value,'media',32);

function json(res,status,payload){
  const body=JSON.stringify(payload);
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(body)});
  res.end(body);
}
function safeSend(ws,payload){
  if(ws.readyState!==WebSocket.OPEN)return;
  try{ws.send(JSON.stringify(payload));}catch{}
}
function rejectUpgrade(socket,status,message){
  const body=String(message||'Rejected');
  try{socket.write(`HTTP/1.1 ${status} ${body}\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);}catch{}
  try{socket.destroy();}catch{}
}
function allowedOrigin(request){
  const origin=request.headers.origin;
  if(!origin)return true;
  const expected=String(request.headers['x-forwarded-host']||request.headers.host||'').split(',')[0].trim().toLowerCase();
  try{return Boolean(expected)&&new URL(origin).host.toLowerCase()===expected;}catch{return false;}
}

export function createVideoSignalServer({server,path='/api/video/signal',maxPeers=DEFAULT_MAX_PEERS,maxMessageBytes=DEFAULT_MAX_MESSAGE_BYTES}={}){
  if(!server)throw new Error('server is required');
  const wss=new WebSocketServer({noServer:true,maxPayload:maxMessageBytes,perMessageDeflate:false});
  const rooms=new Map();
  const meta=new WeakMap();
  let accepted=0;
  let rejected=0;

  function roomSet(room){let set=rooms.get(room);if(!set){set=new Set();rooms.set(room,set);}return set;}
  function sameChannel(room,channel,exclude=null){
    const set=rooms.get(room)||new Set();
    return [...set].filter(ws=>ws!==exclude&&meta.get(ws)?.channel===channel&&ws.readyState===WebSocket.OPEN);
  }
  function broadcast(room,channel,payload,exclude=null){for(const ws of sameChannel(room,channel,exclude))safeSend(ws,payload);}
  function remove(ws,event='peer-left'){
    const m=meta.get(ws);if(!m||m.removed)return;
    m.removed=true;
    const set=rooms.get(m.room);if(set){set.delete(ws);if(set.size===0)rooms.delete(m.room);}
    broadcast(m.room,m.channel,{type:event,peer:m.peer,channel:m.channel,at:Date.now()},ws);
  }

  wss.on('connection',(ws,request,initialMeta)=>{
    const m={...initialMeta,removed:false,connectedAt:Date.now()};
    meta.set(ws,m);
    roomSet(m.room).add(ws);
    const peers=sameChannel(m.room,m.channel,ws).length;
    safeSend(ws,{type:'welcome',peer:m.peer,channel:m.channel,peers,room:m.room});
    broadcast(m.room,m.channel,{type:'peer-joined',peer:m.peer,channel:m.channel,at:Date.now()},ws);

    ws.on('message',(raw,isBinary)=>{
      if(isBinary)return;
      const bytes=Buffer.isBuffer(raw)?raw:Buffer.from(raw);
      if(bytes.byteLength>maxMessageBytes){try{ws.close(1009,'Message too large');}catch{};return;}
      let data;try{data=JSON.parse(bytes.toString('utf8'));}catch{return;}
      if(data?.type==='ping'){safeSend(ws,{type:'pong',at:Date.now()});return;}
      if(!ALLOWED_TYPES.has(data?.type))return;
      const payload={...data,from:m.peer,channel:m.channel,at:Date.now()};
      delete payload.to;
      delete payload.room;
      broadcast(m.room,m.channel,payload,ws);
    });
    ws.on('close',()=>remove(ws,'peer-left'));
    ws.on('error',()=>remove(ws,'peer-left'));
  });

  const onUpgrade=(request,socket,head)=>{
    let url;try{url=new URL(request.url||'/',`http://${request.headers.host||'localhost'}`);}catch{rejected++;return rejectUpgrade(socket,400,'Bad Request');}
    if(url.pathname!==path)return;
    if(!allowedOrigin(request)){rejected++;return rejectUpgrade(socket,403,'Origin Rejected');}
    const room=cleanRoom(url.searchParams.get('room'));
    if(!room){rejected++;return rejectUpgrade(socket,400,'Room Required');}
    const peer=cleanPeer(url.searchParams.get('peer'));
    const channel=cleanChannel(url.searchParams.get('channel'));
    if(sameChannel(room,channel).length>=maxPeers){rejected++;return rejectUpgrade(socket,429,'Room Full');}
    wss.handleUpgrade(request,socket,head,ws=>{accepted++;wss.emit('connection',ws,request,{room,peer,channel});});
  };
  server.on('upgrade',onUpgrade);

  function handleHttpRequest(req,res){
    let url;try{url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{return false;}
    if(url.pathname!==path||!['GET','HEAD'].includes(req.method||'GET'))return false;
    const room=cleanRoom(url.searchParams.get('room'));
    const roomPeers=room?(rooms.get(room)?.size||0):[...rooms.values()].reduce((n,set)=>n+set.size,0);
    json(res,200,{ok:true,service:'ATLAS Portable Video Signaling',transport:'websocket',scope:'single-node',room:room||null,peers:roomPeers,rooms:rooms.size,accepted,rejected,maxPeers,maxMessageBytes});
    return true;
  }

  function close(){
    server.off('upgrade',onUpgrade);
    for(const set of rooms.values())for(const ws of set){try{ws.close(1001,'Server shutdown');}catch{}}
    rooms.clear();
    return new Promise(resolve=>wss.close(()=>resolve()));
  }

  return {handleHttpRequest,close,stats:()=>({rooms:rooms.size,peers:[...rooms.values()].reduce((n,set)=>n+set.size,0),accepted,rejected,maxPeers,maxMessageBytes})};
}
