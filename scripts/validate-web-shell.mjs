import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const required=['modules/web-shell.js','migrations/0006_web_launch.sql','worker.js','worker-crm.js'];
for(const file of required)await access(file);

const shell=await readFile('modules/web-shell.js','utf8');
for(const route of ['/login','/dashboard','/trust/status','/contact','/privacy','/terms','/security','/manifest.webmanifest','/sw.js','/robots.txt','/sitemap.xml','/api/web/contact','/api/web/telemetry'])assert.ok(shell.includes(route),`missing_web_route:${route}`);
for(const marker of ['content-security-policy','permissions-policy','referrer-policy','sessionStorage','ATLAS_VERSION','notFound','errorPage'])assert.ok(shell.includes(marker),`missing_web_control:${marker}`);
assert.ok(shell.includes("purpose:'any maskable'"),'pwa_maskable_icon_missing');
assert.ok(!/<script[^>]+src=/i.test(shell),'third_party_script_forbidden');
assert.ok(!/@import\s+url/i.test(shell),'third_party_css_import_forbidden');

const migration=await readFile('migrations/0006_web_launch.sql','utf8');
for(const table of ['public_contact_requests','web_telemetry_events'])assert.ok(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`),`missing_web_table:${table}`);

const worker=await readFile('worker.js','utf8');
assert.ok(worker.includes('webShellRoutes'),'web_shell_not_wired');
assert.ok(worker.includes("phase:'web-launch-readiness'"),'health_release_phase_missing');
assert.ok(worker.includes("qa:'native'"),'health_qa_state_missing');
assert.ok(worker.includes('notFound(url.pathname)'),'html_404_not_wired');
assert.ok(worker.includes('errorPage()'),'html_500_not_wired');

console.log('ATLAS Web Launch validation passed');
