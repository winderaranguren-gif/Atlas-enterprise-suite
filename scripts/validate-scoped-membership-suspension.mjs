import fs from 'node:fs';

const core=fs.readFileSync(new URL('../worker/commercial-core.js',import.meta.url),'utf8');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};

check(core.includes("SELECT id,role,status FROM atlas_memberships WHERE user_id=? AND organization_id=? AND dba_id=?"),'membership updates must resolve the exact user + organization + DBA membership');
check(core.includes("UPDATE atlas_memberships SET role=?,status=?,updated_at=? WHERE id=?"),'membership changes must update only the resolved scoped membership row');
check(!core.includes("if(nextStatus==='suspended') await env.DB.prepare('UPDATE atlas_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL')"),'suspending one scoped membership must not globally revoke the user sessions');
check(core.includes("WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.status='active'"),'authentication must still enforce explicit session revocation/expiry and global user status');
check(core.includes("WHERE user_id=? AND organization_id=? AND dba_id=? AND status='active'"),'authorization must re-check active membership for every requested Organization/DBA scope');
check(core.includes("action:'update_membership'"),'scoped membership changes must remain auditable');

if(failures.length){
  console.error('Scoped membership suspension validation failed:');
  for(const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Scoped membership suspension isolation validation passed.');
