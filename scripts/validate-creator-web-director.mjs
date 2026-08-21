import {handleCreatorWebDirector} from '../modules/creator-web-director-worker.js';

const checks=[];
function check(name,ok,detail=''){checks.push({name,ok:Boolean(ok),detail});}

const capabilitiesResponse=await handleCreatorWebDirector(new Request('https://atlas.local/api/studio/creator/web/capabilities'));
check('capabilities route responds',capabilitiesResponse instanceof Response&&capabilitiesResponse.status===200);
const capabilities=await capabilitiesResponse.json();
check('first-party provider contract',Array.isArray(capabilities.externalProviders)&&capabilities.externalProviders.length===0);
check('web capabilities declared',Array.isArray(capabilities.capabilities)&&capabilities.capabilities.some(x=>x.id==='public-boundary'));

const recipeResponse=await handleCreatorWebDirector(new Request('https://atlas.local/api/studio/creator/web/recipe',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
    purpose:'Render the ATLAS main dashboard before sign-in.',
    visualReference:'Approved split Orlando brand story plus dark dashboard preview.',
    route:'/',
    authEntry:'/identity',
    owner:'Platform · Public Web',
    modules:['Dashboard','Accounting','Operations','HR & Payroll','Transportation','CRM & Sales','Inventory','Projects','Reports & Analytics','Documents','Integrations','Settings'],
    publicBeforeSignIn:true,
    dataPolicy:'authorized-only'
  })
}));
check('recipe route responds',recipeResponse instanceof Response&&recipeResponse.status===200);
const recipe=await recipeResponse.json();
check('recipe classifies public main dashboard',recipe.classification?.screen==='Public Main Dashboard');
check('recipe targets root route',recipe.architecture?.route==='/');
check('recipe preserves auth boundary',recipe.architecture?.publicBeforeSignIn===true&&recipe.architecture?.authEntry==='/identity');
check('preview modules generated',Array.isArray(recipe.navigation?.previewModules)&&recipe.navigation.previewModules.length>=8);
check('no fabricated data policy',recipe.data?.policy==='authorized-only'&&recipe.data?.metrics==='never fabricate');
check('responsive contract complete',Array.isArray(recipe.responsive)&&recipe.responsive.length===3);
check('release test plan complete',Array.isArray(recipe.tests)&&recipe.tests.length>=8);
check('canonical file handoff',recipe.implementation?.targetFile==='modules/public-dashboard-home.js'&&recipe.implementation?.routingFile==='rideos-router.js');
check('quality gates pass',recipe.quality?.passed===recipe.quality?.total);
check('zero external builders',Array.isArray(recipe.externalProviders)&&recipe.externalProviders.length===0);

const pageResponse=await handleCreatorWebDirector(new Request('https://atlas.local/studio/creator/web'));
check('Web Director UI route responds',pageResponse instanceof Response&&pageResponse.status===200);
const html=await pageResponse.text();
check('UI describes visual implementation contract',html.includes('Visual product brief')&&html.includes('Build web implementation plan'));
check('UI hands recipe to Workbench',html.includes("localStorage.setItem('atlas.creator.web.recipe'")&&html.includes("location.href='/workbench'"));
check('UI states protected boundary',html.includes('never exposes protected module routes'));

const badResponse=await handleCreatorWebDirector(new Request('https://atlas.local/api/studio/creator/web/recipe',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'}));
check('invalid JSON rejected',badResponse?.status===400);

const failures=checks.filter(x=>!x.ok);
for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
if(failures.length){console.error(`\n${failures.length} Creator Web Director validation failure(s).`);process.exit(1);}
console.log('\nATLAS Creator Web Director validation passed.');
