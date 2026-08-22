import fs from 'node:fs';

const source=fs.readFileSync(new URL('../modules/music-studio-worker.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../atlas-router.js',import.meta.url),'utf8');
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
  ['router import',router.includes("import {handleMusicStudio} from './modules/music-studio-worker.js';")],
  ['router dispatch',router.includes("url.pathname==='/studio/music'")&&router.includes('handleMusicStudio(request)')]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`Music Studio validation failed: ${failed}`);process.exit(1)}
console.log('ATLAS Music Studio validation passed.');
