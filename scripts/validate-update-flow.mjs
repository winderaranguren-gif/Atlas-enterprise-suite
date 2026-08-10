import fs from 'node:fs';

const release=JSON.parse(fs.readFileSync(new URL('../public/atlas.release.json',import.meta.url),'utf8'));
const config=JSON.parse(fs.readFileSync(new URL('../public/atlas.config.json',import.meta.url),'utf8'));
const update=fs.readFileSync(new URL('../public/update-core.js',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../public/sw.js',import.meta.url),'utf8');

const checks=[
 ['candidate is not auto-applying',release.autoApply===false],
 ['candidate is not production ready',release.productionReady===false],
 ['candidate is not E2E verified',release.verifiedE2E===false],
 ['release uses ATLAS_BOOTSTRAP_TOKEN',release.commercialPilot?.requiredBindings?.includes('secret:ATLAS_BOOTSTRAP_TOKEN')],
 ['release requires D1',release.commercialPilot?.requiredBindings?.includes('D1:DB')],
 ['release requires R2 backups',release.commercialPilot?.requiredBindings?.includes('R2:BACKUPS')],
 ['update core checks productionReady',update.includes("release?.productionReady===true")],
 ['update core checks verifiedE2E',update.includes("release?.verifiedE2E===true")],
 ['update core checks autoApply',update.includes("release?.autoApply===true")],
 ['blocked update event exists',update.includes('atlas:update-blocked')],
 ['release manifest bypasses SW cache',sw.includes("url.pathname==='/atlas.config.json'||url.pathname==='/atlas.release.json'")],
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
