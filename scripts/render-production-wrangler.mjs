import fs from 'node:fs';

const required=['ATLAS_D1_DATABASE_NAME','ATLAS_D1_DATABASE_ID','ATLAS_BACKUPS_BUCKET_NAME','GITHUB_SHA'];
for(const key of required){
  if(!process.env[key]) throw new Error(`Missing required deployment value: ${key}`);
}

const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
const d1=config.d1_databases?.find(x=>x.binding==='DB');
const r2=config.r2_buckets?.find(x=>x.binding==='BACKUPS');
if(!d1||!r2) throw new Error('Expected DB and BACKUPS bindings in wrangler.jsonc');
d1.database_name=process.env.ATLAS_D1_DATABASE_NAME;
d1.database_id=process.env.ATLAS_D1_DATABASE_ID;
r2.bucket_name=process.env.ATLAS_BACKUPS_BUCKET_NAME;
config.vars={...(config.vars||{}),ATLAS_DEPLOYED_SHA:process.env.GITHUB_SHA};
const output=JSON.stringify(config,null,2)+'\n';
if(output.includes('REPLACE_AT_DEPLOY_TIME')) throw new Error('Unresolved deployment placeholder');
fs.writeFileSync('wrangler.production.jsonc',output);
console.log('Rendered production Wrangler configuration');
