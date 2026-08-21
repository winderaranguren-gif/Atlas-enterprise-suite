import {handleCreatorDirector} from '../modules/creator-director-worker.js';

const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail});}

const capabilitiesResponse=await handleCreatorDirector(new Request('https://atlas.local/api/studio/director/capabilities'));
check('capabilities route responds',capabilitiesResponse instanceof Response&&capabilitiesResponse.status===200);
const capabilities=await capabilitiesResponse.json();
check('first-party provider contract',Array.isArray(capabilities.externalProviders)&&capabilities.externalProviders.length===0);
check('director capabilities declared',Array.isArray(capabilities.capabilities)&&capabilities.capabilities.some(x=>x.id==='storyboard'));

const recipeResponse=await handleCreatorDirector(new Request('https://atlas.local/api/studio/director/recipe',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({mode:'reel',duration:15,format:'9:16',hook:'Stop scrolling.',script:'Here is the core idea. Here is the proof.',cta:'Open ATLAS.'})
}));
check('recipe route responds',recipeResponse instanceof Response&&recipeResponse.status===200);
const recipe=await recipeResponse.json();
check('recipe has storyboard',Array.isArray(recipe.shots)&&recipe.shots.length>=3);
check('recipe has quality gates',recipe.quality?.total>=5&&Array.isArray(recipe.quality?.gates));
check('recipe preserves zero external providers',Array.isArray(recipe.externalProviders)&&recipe.externalProviders.length===0);
check('recipe targets requested format',recipe.production?.format==='9:16');
check('recipe target duration',recipe.production?.duration===15);

const pageResponse=await handleCreatorDirector(new Request('https://atlas.local/studio/director'));
check('director UI route responds',pageResponse instanceof Response&&pageResponse.status===200);
const html=await pageResponse.text();
check('UI contains production handoff',html.includes("localStorage.setItem('atlas.creator.recipe'")&&html.includes("location.href='/studio/production'"));
check('UI does not advertise external creative provider',html.includes('0 external providers'));

const badResponse=await handleCreatorDirector(new Request('https://atlas.local/api/studio/director/recipe',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'}));
check('invalid JSON rejected',badResponse?.status===400);

const failures=checks.filter(x=>!x.ok);
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
if(failures.length){console.error(`\n${failures.length} Creator Director validation failure(s).`);process.exit(1);}
console.log('\nATLAS Creator Director validation passed.');
