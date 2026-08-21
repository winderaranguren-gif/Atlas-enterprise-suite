import { handleNodeRequest } from '../atlas/portable-runtime.mjs';

export default async function handler(req,res){
  const base=`https://${req.headers['x-forwarded-host']||req.headers.host||'localhost'}`;
  const incoming=new URL(req.url||'/',base);
  const rewritten=incoming.searchParams.get('__atlas_path');
  if(rewritten){
    incoming.searchParams.delete('__atlas_path');
    const suffix=incoming.searchParams.toString();
    req.url=`${rewritten}${suffix?`?${suffix}`:''}`;
  }
  return handleNodeRequest(req,res,{origin:base});
}
