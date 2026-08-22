import fs from 'node:fs';

const source=fs.readFileSync(new URL('../modules/music-studio-worker.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../atlas-router.js',import.meta.url),'utf8');
const appRouter=fs.readFileSync(new URL('../rideos-router.js',import.meta.url),'utf8');
const checks=[
  ['exports handler',source.includes('export function handleMusicStudio')],
  ['music route',source.includes("url.pathname==='/studio/music'")],
  ['health endpoint',source.includes('/api/studio/music/health')],
  ['capabilities endpoint',source.includes('/api/studio/music/capabilities')],
  ['browser audio element',source.includes('<audio id="audio"')],
  ['local audio ingest',source.includes('type="file" accept="audio/*" multiple')],
  ['playback seek',source.includes("$('progress').oninput")],
  ['like dislike persistence',source.includes('atlas.music.ratings')],
  ['timed teleprompter',source.includes('parseCues')&&source.includes('updateCue')],
  ['vocal cue language',source.includes('FALSETTO')&&source.includes('RESPIRA')&&source.includes('MIX')],
  ['audio output support',source.includes('setSinkId')&&source.includes('enumerateDevices')],
  ['adaptive contextual menu',source.includes('syncAdaptive')&&source.includes('Recommended now')&&source.includes('recentTools')],
  ['compact mobile dock',source.includes('bottomDock')&&source.includes('data-dock="more"')],
  ['atlas router import',router.includes("import {handleMusicStudio} from './modules/music-studio-worker.js';")],
  ['atlas router dispatch',router.includes("url.pathname==='/studio/music'")&&router.includes('handleMusicStudio(request)')],
  ['application router import',appRouter.includes("import {handleMusicStudio} from './modules/music-studio-worker.js';")],
  ['music precedes generic studio fallback',appRouter.indexOf('if(isMusicPath(url.pathname))')>0&&appRouter.indexOf('if(isMusicPath(url.pathname))')<appRouter.indexOf('if(isStudioPath(url.pathname))')],
  ['global adaptive navigation',appRouter.includes('SMART_NAV_ITEMS')&&appRouter.includes('Adaptive navigation')&&appRouter.includes('atlas.smartNav.recent')],
  ['static studio link flood removed',!appRouter.includes("links.push('<a class=\"nav\" href=\"/studio/look\"")]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`Music Studio validation failed: ${failed}`);process.exit(1)}
console.log('ATLAS Music Studio + adaptive navigation validation passed.');
