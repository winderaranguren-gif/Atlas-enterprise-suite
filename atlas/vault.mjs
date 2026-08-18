import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
const dir=resolve(process.cwd(),'.atlas','vault'); const file=resolve(dir,'secrets.json'); await mkdir(dir,{recursive:true});
const [cmd,key,...rest]=process.argv.slice(2); const value=rest.join(' ');
let data={}; try{data=JSON.parse(await readFile(file,'utf8'));}catch{}
if(cmd==='set'&&key&&value){data[key]=value;await writeFile(file,JSON.stringify(data,null,2),{mode:0o600});try{await chmod(file,0o600)}catch{};console.log(JSON.stringify({stored:true,key}));}
else if(cmd==='has'&&key){console.log(JSON.stringify({key,present:Object.hasOwn(data,key)}));}
else if(cmd==='list'){console.log(JSON.stringify({keys:Object.keys(data)}));}
else {console.error('Usage: vault set <key> <value> | vault has <key> | vault list');process.exit(2);}
