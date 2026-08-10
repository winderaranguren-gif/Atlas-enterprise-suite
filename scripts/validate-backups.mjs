import fs from 'node:fs';

const worker=fs.readFileSync(new URL('../worker/backups.js',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../migrations/0014_backups.sql',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../worker/router.js',import.meta.url),'utf8');
const required=[
 ['R2 binding fail-closed',worker.includes("R2 binding BACKUPS is not configured")],
 ['scoped auth',worker.includes('organization_id=? AND dba_id=?')],
 ['snapshot format',worker.includes("ATLAS_SCOPED_BACKUP")],
 ['SHA-256 verification',worker.includes("digest!==m.sha256")||worker.includes("digest===m.sha256")],
 ['non-destructive restore test',worker.includes('actual_restore_performed:false')],
 ['backup audit',worker.includes("resource_type,resource_id")&&worker.includes("'backup'")],
 ['manifest table',migration.includes('CREATE TABLE IF NOT EXISTS atlas_backup_manifests')],
 ['scope index',migration.includes('idx_backup_manifests_scope')],
 ['router integration',router.includes("handleBackups")&&router.includes("/api/backups"))
];
const failed=required.filter(([,ok])=>!ok);
if(failed.length){
 for(const [name] of failed) console.error(`ATLAS Backups validation failed: ${name}`);
 process.exit(1);
}
console.log(`ATLAS Backups structural contract passed (${required.length} checks).`);
