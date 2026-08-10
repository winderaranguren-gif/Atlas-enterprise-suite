import fs from 'node:fs';

const fail=(message)=>{console.error(`ATLAS Cloudflare validation failed: ${message}`);process.exit(1)};
if(fs.existsSync('wrangler.toml'))fail('multiple Wrangler sources detected; remove wrangler.toml and keep wrangler.jsonc as the production source of truth');
if(!fs.existsSync('wrangler.jsonc'))fail('missing wrangler.jsonc');

let config;
try{config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'))}catch(error){fail(`wrangler.jsonc is not valid JSON: ${error.message}`)}
if(config.name!=='atlas-enterprise-suite')fail('Worker name mismatch');
if(config.main!=='worker/index.js')fail('Worker entry point must be worker/index.js');
if(config.assets?.directory!=='./public'||config.assets?.binding!=='ASSETS'||config.assets?.run_worker_first!==true)fail('static assets binding contract is incomplete');
if(!Array.isArray(config.triggers?.crons)||!config.triggers.crons.includes('*/10 * * * *'))fail('self-repair cron is missing');

const db=(config.d1_databases||[]).find(item=>item.binding==='DB');
if(!db)fail('D1 binding DB is missing');
if(!db.database_name)fail('D1 binding DB requires database_name');
if(!db.database_id)fail('D1 binding DB requires database_id from the real Cloudflare D1 database');
if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(db.database_id))fail('D1 database_id is not a valid UUID');
if(db.migrations_dir!=='migrations')fail('D1 migrations_dir must be migrations');

console.log(`ATLAS Cloudflare validation passed: Worker ${config.name}, D1 ${db.database_name} (${db.database_id}), DB binding and assets verified.`);
