import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config', 'atlas-workstreams.json');
const allowedStates = new Set(['design', 'build', 'integrated', 'tested', 'production-ready']);
const allowedPriorities = new Set(['P0', 'P1', 'P2', 'P3']);

function fail(message) {
  console.error(`ATLAS Integration Gate: FAIL — ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`ATLAS Integration Gate: PASS — ${message}`);
}

if (!fs.existsSync(configPath)) {
  fail('missing config/atlas-workstreams.json');
  process.exit();
}

const registry = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const streams = Array.isArray(registry.workstreams) ? registry.workstreams : [];
const ids = new Set(streams.map((stream) => stream.id));

if (registry.executionModel !== 'parallel') fail('executionModel must be parallel');
if (!streams.length) fail('no workstreams registered');

for (const stream of streams) {
  if (!stream.id || !stream.name) fail('every workstream requires id and name');
  if (!allowedPriorities.has(stream.priority)) fail(`${stream.id}: invalid priority ${stream.priority}`);
  if (!allowedStates.has(stream.state)) fail(`${stream.id}: invalid readiness state ${stream.state}`);
  if (!Array.isArray(stream.owns) || !stream.owns.length) fail(`${stream.id}: must own at least one capability`);
  if (!Array.isArray(stream.dependsOn)) fail(`${stream.id}: dependsOn must be an array`);

  for (const dependency of stream.dependsOn || []) {
    if (!ids.has(dependency)) fail(`${stream.id}: unknown dependency ${dependency}`);
    if (dependency === stream.id) fail(`${stream.id}: cannot depend on itself`);
  }
}

const capabilityOwner = new Map();
for (const stream of streams) {
  for (const capability of stream.owns || []) {
    const existing = capabilityOwner.get(capability);
    if (existing) fail(`capability ${capability} has multiple owners: ${existing}, ${stream.id}`);
    capabilityOwner.set(capability, stream.id);
  }
}

const visiting = new Set();
const visited = new Set();
function visit(id) {
  if (visiting.has(id)) return fail(`dependency cycle detected at ${id}`);
  if (visited.has(id)) return;
  visiting.add(id);
  const stream = streams.find((item) => item.id === id);
  for (const dependency of stream?.dependsOn || []) visit(dependency);
  visiting.delete(id);
  visited.add(id);
}
for (const id of ids) visit(id);

const sharedContracts = new Set(registry.sharedContracts || []);
for (const required of ['identity', 'permissions', 'audit', 'data-fabric', 'event-fabric', 'agent-fabric', 'design-system', 'update-fabric']) {
  if (!sharedContracts.has(required)) fail(`missing shared contract ${required}`);
}

if (!process.exitCode) {
  pass(`${streams.length} parallel workstreams validated`);
  pass(`${capabilityOwner.size} capability ownership assignments are unique`);
  pass('dependency graph is acyclic');
  pass('shared platform contracts are present');
}
