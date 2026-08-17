import { DatabaseSync } from 'node:sqlite';
import {
  GLOBAL_PROMO_ASSET_SCHEMA_SQL,
  GLOBAL_PROMO_ASSET_CHUNK_BYTES,
  GLOBAL_PROMO_ASSET_MAX_BYTES,
  globalPromoArtworkAssetFileName,
  globalPromoArtworkAssetAllowed,
  globalPromoArtworkAssetReferenceId,
  globalPromoArtworkAssetChunks,
  globalPromoArtworkAssetBlobBytes,
  globalPromoArtworkAssetSha256
} from '../modules/global-promo-assets.js';

function assert(condition,message){if(!condition)throw new Error(message)}
const cases=[];const check=(condition,message)=>{assert(condition,message);cases.push(message)};

check(globalPromoArtworkAssetFileName('../../Client Logo?.PNG')==='Client Logo_.PNG','Filename sanitation removes paths and unsafe characters');
check(globalPromoArtworkAssetAllowed('logo.PNG')===true,'PNG artwork is allowed');
check(globalPromoArtworkAssetAllowed('machine.dst')===true,'DST embroidery file is allowed');
check(globalPromoArtworkAssetAllowed('payload.exe')===false,'Executable file is rejected');
check(globalPromoArtworkAssetReferenceId('asset:12345678')==='12345678','Private asset reference parses');
check(globalPromoArtworkAssetReferenceId('asset:bad id')===null,'Malformed private asset reference is rejected');
check(GLOBAL_PROMO_ASSET_CHUNK_BYTES===1000000&&GLOBAL_PROMO_ASSET_MAX_BYTES===8*1024*1024,'Vault limits are explicit');

const sample=new Uint8Array(2100007);for(let i=0;i<sample.length;i++)sample[i]=i%251;const chunks=globalPromoArtworkAssetChunks(sample);
check(chunks.length===3&&chunks[0].length===1000000&&chunks[1].length===1000000&&chunks[2].length===100007,'Binary data is split below D1 row BLOB limit');
const restored=new Uint8Array(sample.length);let offset=0;for(const chunk of chunks){restored.set(globalPromoArtworkAssetBlobBytes(chunk),offset);offset+=chunk.length}
check(restored.length===sample.length&&restored[0]===sample[0]&&restored[2000006]===sample[2000006],'Chunk reconstruction preserves bytes');
const hash1=await globalPromoArtworkAssetSha256(sample),hash2=await globalPromoArtworkAssetSha256(restored);
check(hash1===hash2&&/^[0-9a-f]{64}$/.test(hash1),'SHA-256 is deterministic and canonical hex');

const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(`CREATE TABLE global_promo_jobs(id TEXT PRIMARY KEY); INSERT INTO global_promo_jobs(id) VALUES('job1');`);for(const sql of GLOBAL_PROMO_ASSET_SCHEMA_SQL)db.exec(sql);
const assetId='asset-test-0001';db.prepare(`INSERT INTO global_promo_artwork_assets(id,organization_id,dba_id,job_id,file_name,content_type,byte_size,sha256_hex,chunk_count,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(assetId,'org1','dba1','job1','logo.png','image/png',sample.length,hash1,chunks.length,'user1');
const insertChunk=db.prepare(`INSERT INTO global_promo_artwork_asset_chunks(asset_id,chunk_index,byte_size,data_blob) VALUES(?,?,?,?)`);chunks.forEach((chunk,index)=>insertChunk.run(assetId,index,chunk.length,chunk));
const meta=db.prepare(`SELECT byte_size,chunk_count,storage_mode FROM global_promo_artwork_assets WHERE id=?`).get(assetId),stored=db.prepare(`SELECT chunk_index,byte_size,data_blob FROM global_promo_artwork_asset_chunks WHERE asset_id=? ORDER BY chunk_index`).all(assetId);
check(Number(meta.byte_size)===sample.length&&Number(meta.chunk_count)===3&&meta.storage_mode==='d1_chunked','Vault metadata persists with chunk count and storage mode');
check(stored.length===3&&globalPromoArtworkAssetBlobBytes(stored[2].data_blob).length===100007,'SQLite BLOB chunks round-trip');
let oversizedRejected=false;try{db.prepare(`INSERT INTO global_promo_artwork_asset_chunks(asset_id,chunk_index,byte_size,data_blob) VALUES(?,?,?,?)`).run(assetId,9,1000001,new Uint8Array(1))}catch{oversizedRejected=true}
check(oversizedRejected,'Schema rejects chunk metadata above 1 MB');
db.close();
console.log(`Global Promo Artwork Asset Vault tests passed: ${cases.length}/${cases.length}`);