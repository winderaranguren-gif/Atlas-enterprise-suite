import fs from 'node:fs';

const source=fs.readFileSync(new URL('../modules/music-studio-worker.js',import.meta.url),'utf8');
const router=fs.readFileSync(new URL('../atlas-router.js',import.meta.url),'utf8');
const appRouter=fs.readFileSync(new URL('../rideos-router.js',import.meta.url),'utf8');
const checks=[
  ['exports handler',source.includes('export function handleMusicStudio')],
  ['music route',source.includes("p==='/studio/music'" )],
  ['health endpoint',source.includes('/api/studio/music/health')],
  ['capabilities endpoint',source.includes('/api/studio/music/capabilities')],
  ['home new radio search library studio taxonomy',['Home','New','Radio','Search','Your Library','Studio'].every(x=>source.includes(x))],
  ['library nomenclature',['Songs','Playlists','Albums','Artists','Podcasts','Audiobooks','Music Videos','Downloads','Favorites','Recently Played'].every(x=>source.includes(x))],
  ['player nomenclature',['Now Playing','Queue','Lyrics'].every(x=>source.includes(x))],
  ['browser audio element',source.includes('<audio id="audio"')],
  ['browser video element',source.includes('<video id="video"')],
  ['local audio video ingest',source.includes('accept="audio/*,video/*" multiple')],
  ['persistent indexeddb library',source.includes("indexedDB.open(DB,1)")&&source.includes("STORE='media'" )],
  ['playback seek',source.includes("$('progress').oninput")],
  ['favorites persistence',source.includes('atlas.music.favorites')],
  ['recent persistence',source.includes('atlas.music.recent')],
  ['playlist persistence',source.includes('atlas.music.playlists')],
  ['timed teleprompter',source.includes('function cues()')&&source.includes('updateCue()')],
  ['vocal cue language',source.includes('FALSETTO')&&source.includes('RESPIRA')&&source.includes('MIX')],
  ['audio output support',source.includes('setSinkId')&&source.includes('enumerateDevices')],
  ['local radio stations',source.includes('Favorites Radio')&&source.includes('Music Video Mix')],
  ['responsive mobile nav',source.includes('mobileNav')&&source.includes('mobileNow')],
  ['atlas router import',router.includes("import {handleMusicStudio} from './modules/music-studio-worker.js';")],
  ['atlas router dispatch',router.includes("url.pathname==='/studio/music'")&&router.includes('handleMusicStudio(request)')],
  ['application router import',appRouter.includes("import {handleMusicStudio} from './modules/music-studio-worker.js';")],
  ['music precedes generic studio fallback',appRouter.indexOf('if(isMusicPath(url.pathname))')>0&&appRouter.indexOf('if(isMusicPath(url.pathname))')<appRouter.indexOf('if(isStudioPath(url.pathname))')],
  ['global adaptive navigation',appRouter.includes('SMART_NAV_ITEMS')&&appRouter.includes('Adaptive navigation')&&appRouter.includes('atlas.smartNav.recent')],
  ['music surfaced in adaptive nav',appRouter.includes("['music','Music Studio','/studio/music'")],
  ['static studio link flood removed',!appRouter.includes("links.push('<a class=\"nav\" href=\"/studio/look\"")]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed){console.error(`Music Studio validation failed: ${failed}`);process.exit(1)}
console.log('ATLAS Music full audio/video + adaptive navigation validation passed.');
