import { createServer } from 'node:http';
import { handleNodeRequest } from './portable-runtime.mjs';

const host=process.env.HOST||'0.0.0.0';
const port=Number(process.env.PORT||8080);
const server=createServer(async(req,res)=>{
  try{await handleNodeRequest(req,res);}catch(error){
    console.error('atlas_portable_server_error',{message:error instanceof Error?error.message:String(error)});
    if(!res.headersSent)res.writeHead(500,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
    res.end(JSON.stringify({ok:false,error:'ATLAS portable server failure'}));
  }
});
server.keepAliveTimeout=65000;
server.headersTimeout=66000;
server.requestTimeout=120000;
server.listen(port,host,()=>console.log(JSON.stringify({service:'ATLAS Portable Server',ok:true,host,port,runtime:'node-web-standard'})));

for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
