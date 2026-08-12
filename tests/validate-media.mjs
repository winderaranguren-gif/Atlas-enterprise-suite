import assert from 'node:assert/strict';
import { SUPPORTED_MEDIA_KINDS, normalizeGenerationRequest } from '../modules/media/service.js';

assert.deepEqual(SUPPORTED_MEDIA_KINDS,['music','audio','video']);

const request=normalizeGenerationRequest({
  kind:'music',
  prompt:'Create an original instrumental theme.',
  duration_seconds:90,
  style:'cinematic'
});

assert.equal(request.kind,'music');
assert.equal(request.duration_seconds,90);
assert.equal(request.style,'cinematic');

assert.throws(
  ()=>normalizeGenerationRequest({kind:'image',prompt:'x'}),
  /unsupported_media_kind/
);

assert.throws(
  ()=>normalizeGenerationRequest({kind:'audio',prompt:''}),
  /media_prompt_required/
);

assert.throws(
  ()=>normalizeGenerationRequest({kind:'video',prompt:'x',duration_seconds:0}),
  /invalid_media_duration/
);

console.log('ATLAS media generation contract valid');
