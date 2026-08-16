import { Script } from 'node:vm';
import { streamSubscriptionRoutes } from '../modules/stream-subscription-control.js';

const fail=message=>{throw new Error(`[stream-subscription-control] ${message}`)};
const assert=(condition,message)=>{if(!condition)fail(message)};
const makeUrl=path=>new URL(`https://atlas.validation.local${path}`);
const call=async path=>streamSubscriptionRoutes(new Request(makeUrl(path),{method:'GET'}),{},makeUrl(path));
const compile=async(path,markers)=>{
  const response=await call(path);
  assert(response?.status===200,`${path} must return 200`);
  const body=await response.text();
  for(const marker of markers)assert(body.includes(marker),`${path} missing ${marker}`);
  const scripts=[...body.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
  assert(scripts.length===1,`${path} must have exactly one local browser script`);
  try{new Script(scripts[0],{filename:path.replaceAll('/','_')+'.browser.js'})}catch(error){fail(`${path} browser script does not compile: ${error.message}`)}
  return body;
};

const stream=await compile('/platform/stream-control',['ATLAS Stream Control','Session library','Picture in picture','Save position','No third-party catalog']);
for(const marker of ['URL.createObjectURL','localStorage','requestPictureInPicture','requestFullscreen'])assert(stream.includes(marker),`Stream Control missing browser-native ${marker}`);
for(const prohibited of ['fetch(','/api/upload','cloud upload enabled','third-party catalog connected'])assert(!stream.includes(prohibited),`Stream Control must not imply remote media handling: ${prohibited}`);

const subscriptions=await compile('/platform/subscriptions',['ATLAS Subscription Control','Monthly equivalent','Annualized','Due within 30 days','Copy CSV']);
for(const marker of ['localStorage','navigator.clipboard','monthly','quarterly','yearly'])assert(subscriptions.includes(marker),`Subscription Control missing ${marker}`);
for(const prohibited of ['checkout','charge card','cancelSubscription','/api/billing'])assert(!subscriptions.includes(prohibited),`Subscription Control must not imply payment/cancellation integration: ${prohibited}`);

const miss=await call('/platform/not-stream-subscriptions');
assert(miss===null,'unrelated protected route must fall through');
console.log('ATLAS Stream + Subscription Control gate passed: protected browser workspaces, local-only behavior and scripts verified.');
