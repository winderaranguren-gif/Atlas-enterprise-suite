import fs from 'node:fs';

const release=JSON.parse(fs.readFileSync(new URL('../public/atlas.release.json',import.meta.url),'utf8'));
const config=JSON.parse(fs.readFileSync(new URL('../public/atlas.config.json',import.meta.url),'utf8'));
const update=fs.readFileSync(new URL('../public/update-core.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../worker/router.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');

const checks=[
 ['candidate is not auto-applying',release.autoApply===false],
 ['candidate is not production ready',release.productionReady===false],
 ['candidate is not E2E verified',release.verifiedE2E===false],
 ['candidate has no unverified expected SHA',release.expectedSourceSha===null],
 ['runtime fingerprint is mandatory',release.runtimeFingerprintRequired===true],
 ['release uses ATLAS_BOOTSTRAP_TOKEN',release.commercialPilot?.requiredBindings?.includes('secret:ATLAS_BOOTSTRAP_TOKEN')],
 ['release requires D1',release.commercialPilot?.requiredBindings?.includes('D1:DB')],
 ['release requires R2 backups',release.commercialPilot?.requiredBindings?.includes('R2:BACKUPS')],
 ['release requires deployed SHA runtime var',release.commercialPilot?.requiredBindings?.includes('var:ATLAS_DEPLOYED_SHA')],
 ['release names readiness endpoint',release.commercialPilot?.readinessEndpoint==='/api/system/readiness'],
 ['promotion gate names fingerprint endpoint',release.promotionGate?.runtimeFingerprintEndpoint==='/api/system/release-fingerprint'],
 ['promotion gate requires readiness',release.promotionGate?.runtimeReadinessEndpoint==='/api/system/readiness'&&release.promotionGate?.readinessPassRequired===true],
 ['update core checks productionReady',update.includes("release?.productionReady===true")],
 ['update core checks verifiedE2E',update.includes("release?.verifiedE2E===true")],
 ['update core checks autoApply',update.includes("release?.autoApply===true")],
 ['update core requires expected SHA',update.includes("release?.expectedSourceSha")&&update.includes("[0-9a-f]{40}")],
 ['update core fetches runtime fingerprint',update.includes("/api/system/release-fingerprint")],
 ['update core fetches runtime readiness',update.includes("/api/system/readiness")],
 ['update core compares runtime SHA and readiness',update.includes('release_runtime_sha_or_readiness_mismatch')&&update.includes('fingerprint.sourceSha')&&update.includes('readiness.operational===true')],
 ['worker exposes runtime fingerprint',router.includes("url.pathname==='/api/system/release-fingerprint'")&&router.includes('env.ATLAS_DEPLOYED_SHA')],
 ['worker exposes aggregate readiness',router.includes("url.pathname==='/api/system/readiness'")&&router.includes('atlas_backup_manifests')&&router.includes('accounting_journal_entries')&&router.includes('atlas_document_versions')],
 ['worker readiness checks required bindings',router.includes('bootstrapSecret')&&router.includes('r2Backups')&&router.includes('deployedSha')],
 ['worker refuses to verify malformed SHA',router.includes("/^[0-9a-f]{40}$/i.test(sourceSha)")],
 ['blocked update event exists',update.includes('atlas:update-blocked')],
 ['release manifest bypasses SW cache',sw.includes("url.pathname==='/atlas.config.json'||url.pathname==='/atlas.release.json'")],
 ['API readiness/fingerprint bypass SW',sw.includes("url.pathname.startsWith('/api/')")],
 ['public config is truthful',config.commercialPilot?.status==='implemented-not-operational'],
 ['English is default',config.defaultLanguage==='en'],
 ['language selector is enabled',config.languageSelector===true]
];
const failed=checks.filter(([,ok])=>!ok);
if(failed.length){
  for(const [name] of failed) console.error(`ATLAS Update Fabric validation failed: ${name}`);
  process.exit(1);
}
console.log(`ATLAS Update Fabric promotion contract passed (${checks.length} checks).`);
