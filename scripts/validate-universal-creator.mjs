import {buildUniversalCreatorPlan,UNIVERSAL_CREATOR_PRESETS} from '../modules/creator-universal-worker.js';

const cases=[
  {prompt:'Create the ATLAS Venezuela website with accounting, POS and payments',want:'website',owner:'Accounting'},
  {prompt:'Build a mobile app for drivers and ride operations',want:'app',owner:'Ride'},
  {prompt:'Create a launch video for ATLAS Venezuela',want:'video'},
  {prompt:'Prepare the production release for /ve',want:'release'}
];
for(const c of cases){
  const plan=buildUniversalCreatorPlan({prompt:c.prompt});
  if(plan.error)throw new Error(`Unexpected error: ${plan.error}`);
  if(plan.classification.type!==c.want)throw new Error(`Expected ${c.want}, got ${plan.classification.type}`);
  if(c.owner&&plan.classification.owner!==c.owner)throw new Error(`Expected owner ${c.owner}, got ${plan.classification.owner}`);
  if(plan.data.fabricatedMetrics!==false)throw new Error('Fabricated metrics policy failed');
  if(!plan.permissions.authentication||!plan.permissions.rbac||!plan.permissions.tenantIsolation)throw new Error('Permission contract incomplete');
  if(plan.quality.passed<7)throw new Error('Universal Creator quality gates below threshold');
  if(!plan.pipeline.includes('PRODUCTION VERIFIED'))throw new Error('Production verification gate missing');
}
const forced=buildUniversalCreatorPlan({prompt:'anything',mode:'module'});
if(forced.classification.type!=='module'||forced.handoff.route!=='/workbench')throw new Error('Explicit module handoff failed');

const neutral=buildUniversalCreatorPlan({prompt:'Create a responsive dashboard through identity with security navigation and project summaries'});
if(neutral.classification.type!=='website')throw new Error('Neutral dashboard should classify as website');
if(neutral.classification.owner!=='Security')throw new Error(`Expected explicit security owner, got ${neutral.classification.owner}`);
const throughOnly=buildUniversalCreatorPlan({prompt:'Create a responsive dashboard through identity with navigation and project summaries'});
if(throughOnly.classification.owner!=='Enterprise')throw new Error(`Substring false positive detected: ${throughOnly.classification.owner}`);

if(!UNIVERSAL_CREATOR_PRESETS['main-dashboard'])throw new Error('Main Dashboard preset missing');
const main=buildUniversalCreatorPlan({preset:'main-dashboard'});
if(main.error)throw new Error(`Main Dashboard preset failed: ${main.error}`);
if(main.preset?.id!=='main-dashboard')throw new Error('Main Dashboard preset id missing');
if(main.classification.type!=='website')throw new Error('Main Dashboard must classify as website');
if(main.classification.owner!=='Enterprise')throw new Error(`Main Dashboard owner must be Enterprise, got ${main.classification.owner}`);
if(main.architecture.route!=='/')throw new Error('Main Dashboard canonical route must be /');
if(main.handoff.route!=='/studio/creator/web')throw new Error('Main Dashboard must hand off to Creator Web Director');
if(main.handoff.releaseRoute!=='/studio/release/main-dashboard')throw new Error('Main Dashboard release handoff missing');
if(!main.intake.prompt.includes('/identity'))throw new Error('Main Dashboard Identity boundary missing');
if(!main.intake.visualReference.includes('Orlando'))throw new Error('Main Dashboard visual contract missing Orlando reference');
if(main.data.policy!=='authorized-sources-only'||main.data.fabricatedMetrics!==false)throw new Error('Main Dashboard data integrity policy failed');
if(main.quality.passed!==main.quality.total)throw new Error('Main Dashboard preset quality gates must pass');

const empty=buildUniversalCreatorPlan({prompt:''});
if(!empty.error)throw new Error('Empty brief must fail');
console.log('ATLAS Universal Creator validation passed.');
