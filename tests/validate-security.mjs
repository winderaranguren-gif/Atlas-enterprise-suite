import fs from 'node:fs';

const migration=fs.readFileSync('migrations/0008_security.sql','utf8');
const routes=fs.readFileSync('modules/security-emergency/routes.js','utf8');
const gateway=fs.readFileSync('modules/api-gateway/src/router.js','utf8');
const registry=fs.readFileSync('platform/module-registry.js','utf8');
const readme=fs.readFileSync('modules/security-emergency/README.md','utf8');
const ui=fs.readFileSync('public/security.html','utf8');
const client=fs.readFileSync('public/security.js','utf8');

const migrationMarkers=[
  'CREATE TABLE IF NOT EXISTS security_incidents',
  'CREATE TABLE IF NOT EXISTS security_incident_events',
  'organization_id TEXT NOT NULL',
  'dba_id TEXT NOT NULL',
  'prevent_security_incident_delete',
  'prevent_security_event_update',
  'prevent_security_event_delete'
];
for(const marker of migrationMarkers){
  if(!migration.includes(marker)) throw new Error(`Security migration invariant missing: ${marker}`);
}

const routeMarkers=[
  "requireScope(env,auth.session.user_id,organizationId,dbaId,roles)",
  "['owner','admin','member'],'security.incident.create'",
  "['owner','admin','auditor','member','viewer'],'security.posture.read'",
  "['acknowledge','contain','resolve','reopen']",
  "methodology:'ATLAS internal operational signal; not a compliance certification'",
  "decision:'deny'",
  "'/api/security/posture'",
  "'/api/security/incidents'"
];
for(const marker of routeMarkers){
  if(!routes.includes(marker)) throw new Error(`Security route invariant missing: ${marker}`);
}

const uiMarkers=['Operational Security Center','Security posture','Report an incident','Incident queue','/security.js'];
for(const marker of uiMarkers){
  if(!ui.includes(marker)) throw new Error(`Security UI invariant missing: ${marker}`);
}

const clientMarkers=["sessionStorage.getItem('atlas.session')","'/api/security/posture'","'/api/security/incidents'",'/actions','/events'];
for(const marker of clientMarkers){
  if(!client.includes(marker)) throw new Error(`Security client invariant missing: ${marker}`);
}

if(!gateway.includes("import { securityEmergencyRoutes } from '../../security-emergency/routes.js';")) throw new Error('Security gateway import missing');
if(!gateway.includes("['security-emergency', securityEmergencyRoutes]")) throw new Error('Security gateway registration missing');
if(!registry.includes("id: 'security-emergency'")) throw new Error('Security module registry entry missing');
if(!readme.includes('Original ATLAS implementation')) throw new Error('Originality statement missing');

console.log('ATLAS security validation passed');
