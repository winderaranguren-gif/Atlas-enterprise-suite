import assert from 'node:assert/strict';
import { buildProgram, loadGenealogy } from './atlas-fruit-promotion.mjs';

const branches=await loadGenealogy();
const program=buildProgram(branches);

assert.equal(program.schemaVersion,1,'fruit_program_schema_version_invalid');
assert.equal(program.branchCount,15,'fruit_program_requires_all_15_branches');
assert.ok(program.fruitCount>=150,'fruit_program_inventory_unexpectedly_small');
assert.ok(program.verifyToRipe.length>0,'fruit_program_requires_working_fruit_verification_queue');
assert.ok(program.promoteToWorking.length>0,'fruit_program_requires_promotion_queue');
assert.ok(program.partnerBound.length>0,'fruit_program_requires_partner_bound_boundary_visibility');
assert.equal(program.nextByBranch.length,15,'fruit_program_requires_next_sequence_for_each_branch');
for(const branch of program.nextByBranch)assert.ok(branch.nextFruitSequence.length>=3,`fruit_program_branch_next_sequence_incomplete:${branch.branchId}`);
for(const fruit of program.verifyToRipe){
  assert.equal(fruit.maturity,'working-fruit',`verification_queue_contains_wrong_maturity:${fruit.id}`);
  assert.ok(fruit.systemOfRecord,`working_fruit_missing_system_of_record:${fruit.branchId}:${fruit.id}`);
  assert.ok(fruit.evidence.length>0,`working_fruit_missing_evidence:${fruit.branchId}:${fruit.id}`);
  assert.ok(fruit.routes.length>0,`working_fruit_missing_route:${fruit.branchId}:${fruit.id}`);
}
for(const fruit of program.partnerBound)assert.equal(fruit.maturity,'partner-bound',`partner_queue_contains_non_partner_fruit:${fruit.id}`);
for(const fruit of program.promoteToWorking)assert.ok(['green-fruit','artifact-verified','seed'].includes(fruit.maturity),`promotion_queue_contains_invalid_maturity:${fruit.id}`);

const allQueued=new Set([...program.verifyToRipe,...program.promoteToWorking,...program.partnerBound,...program.ripe].map(f=>`${f.branchId}:${f.id}`));
const expectedNonArchive=branches.flatMap(b=>(b.subbranches||[]).filter(s=>s.maturity!=='archive').map(s=>`${b.branchId}:${s.id}`));
for(const id of expectedNonArchive)assert.ok(allQueued.has(id),`fruit_missing_from_program:${id}`);

console.log(`ATLAS Fruit Promotion gate passed: ${program.branchCount} branches, ${program.fruitCount} fruits, ${program.verifyToRipe.length} verification candidates, ${program.promoteToWorking.length} promotion candidates, ${program.partnerBound.length} partner-bound fruits.`);
