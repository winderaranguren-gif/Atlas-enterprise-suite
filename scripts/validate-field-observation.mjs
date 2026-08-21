import {buildFieldObservation,handleCreatorFieldObservation} from '../modules/creator-field-observation-worker.js';

const visualContract={service:'atlas-visual-inspector',localOnly:true,file:{name:'field-photo.jpeg',width:864,height:1536,aspectRatio:.5625,orientation:'portrait'},signals:{averageLuminance:135,contrastStdDev:57.2,averageSaturationPercent:19.9,edgeDensityPercent:12.4,layoutSignal:'left-right split signal'}};
const plan=buildFieldObservation({
  location:'Disney Springs',
  zone:'waterfront promenade',
  category:'seasonal',
  tags:'signage, guest-experience, environment',
  brandCampaign:'Seasonal Fall into Magic banner observed in the field',
  signage:'Vertical seasonal banner attached to a pedestrian light pole',
  infrastructure:'Pedestrian railing, waterfront edge, lighting and shaded seating context',
  environment:'Outdoor guest area with post-rain conditions and a visible rainbow noted by the observer',
  opportunities:'seasonal signage inventory\nfield-to-digital-twin observation\nguest journey context capture',
  visualContract
});
if(plan.error)throw new Error(plan.error);
if(plan.service!=='atlas-field-observation')throw new Error('Service mismatch');
if(plan.owner!=='ATLAS Parks / Destinations')throw new Error('Parks ownership missing');
if(plan.classification.category!=='seasonal')throw new Error('Category mismatch');
if(plan.evidence.originalImageUploadedToServer!==false)throw new Error('Image upload boundary changed');
if(plan.evidence.automaticRecognitionClaimed!==false)throw new Error('Automatic recognition falsely claimed');
if(plan.evidence.visualContract?.file?.width!==864)throw new Error('Visual contract not preserved');
if(!plan.mission.prompt.includes('Disney Springs'))throw new Error('Location missing from mission prompt');
if(!plan.mission.pipeline.includes('UNIVERSAL CREATOR')||!plan.mission.pipeline.includes('PRODUCTION VERIFIED'))throw new Error('Mission pipeline incomplete');

const health=await handleCreatorFieldObservation(new Request('https://atlas.test/api/studio/field/health'));
if(health?.status!==200)throw new Error('Health route failed');
const caps=await (await handleCreatorFieldObservation(new Request('https://atlas.test/api/studio/field/capabilities'))).json();
const ready=(caps.capabilities||[]).filter(x=>x.state==='ready').map(x=>x.id);
for(const id of ['field-intake','visual-contract','evidence-boundary','parks-routing','opportunity-map','universal-handoff','mission-handoff'])if(!ready.includes(id))throw new Error(`Missing capability ${id}`);
const recognition=(caps.capabilities||[]).find(x=>x.id==='automatic-object-recognition');
if(recognition?.state!=='not-claimed')throw new Error('Recognition boundary not explicit');
const page=await handleCreatorFieldObservation(new Request('https://atlas.test/studio/field'));
if(page?.status!==200||(await page.text()).includes('href=""'))throw new Error('Field page failed');
const passthrough=await handleCreatorFieldObservation(new Request('https://atlas.test/studio/nope'));
if(passthrough!==null)throw new Error('Non-field route should pass through');
console.log('ATLAS Field Observation validation passed.');
