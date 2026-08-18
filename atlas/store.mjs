import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir=resolve(process.cwd(),'.atlas','store'); await mkdir(dir,{recursive:true});
const [cmd,collection,id,...rest]=process.argv.slice(2); if(!collection){console.error('collection required');process.exit(2)}
const file=resolve(dir,`${collection.replace(/[^a-z0-9_-]/gi,'_')}.json`); let rows={};try{rows=JSON.parse(await readFile(file,'utf8'))}catch{}
if(cmd==='put'&&id){let value;try{value=JSON.parse(rest.join(' '))}catch{value={value:rest.join(' ')}};rows[id]={...value,id,updatedAt:new Date().toISOString()};await writeFile(file,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows[id],null,2));}
else if(cmd==='get'&&id){console.log(JSON.stringify(rows[id]??null,null,2));}
else if(cmd==='list'){console.log(JSON.stringify(Object.values(rows),null,2));}
else if(cmd==='delete'&&id){const existed=Object.hasOwn(rows,id);delete rows[id];await writeFile(file,JSON.stringify(rows,null,2));console.log(JSON.stringify({deleted:existed,id}));}
else{console.error('Usage: store put|get|list|delete <collection> [id] [json]');process.exit(2)}
