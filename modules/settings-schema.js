let ready=false,promise=null;
const statements=[
`CREATE TABLE IF NOT EXISTS workspace_preferences(id TEXT PRIMARY KEY,organization_id TEXT NOT NULL,dba_id TEXT NOT NULL,user_id TEXT NOT NULL DEFAULT '',preference_key TEXT NOT NULL,value_json TEXT NOT NULL,updated_by_user_id TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(organization_id,dba_id,user_id,preference_key))`,
`CREATE INDEX IF NOT EXISTS idx_workspace_preferences_scope ON workspace_preferences(organization_id,dba_id,user_id,preference_key)`
];
export async function ensureSettingsSchema(env){if(ready)return{ok:true,created:false};if(!env?.DB)return{ok:false,error:'identity_database_unavailable'};if(!promise)promise=(async()=>{for(const sql of statements)await env.DB.prepare(sql).run();ready=true;return{ok:true,created:true}})().catch(e=>{promise=null;throw e});return promise}
