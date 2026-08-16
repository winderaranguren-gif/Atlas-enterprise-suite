import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const registryPath='architecture/genealogy/01-enterprise-operations.json';
const dossierPath='docs/branches/01_ENTERPRISE_OPERATIONS.md';
const masterPath='docs/ATLAS_MASTER_INDEX_GENEALOGY.md';
const registry=JSON.parse(await readFile(registryPath,'utf8'));
const dossier=await readFile(dossierPath,'utf8');
const master=await readFile(masterPath,'utf8');

const maturities=new Set(['working-fruit','ripe-fruit','green-fruit','seed','partner-bound','archive','artifact-verified']);
assert.equal(registry.schemaVersion,1,'genealogy_schema_version_invalid');
assert.equal(registry.branchNumber,1,'enterprise_branch_number_invalid');
assert.equal(registry.branchId,'01-enterprise-operations','enterprise_branch_id_invalid');
assert.equal(registry.parent,'atlas-os-core','enterprise_parent_invalid');
assert.ok(Array.isArray(registry.roots)&&registry.roots.length>=5,'enterprise_roots_incomplete');
assert.ok(Array.isArray(registry.trunkDependencies)&&registry.trunkDependencies.length>=6,'enterprise_trunk_dependencies_incomplete');
assert.ok(Array.isArray(registry.subbranches)&&registry.subbranches.length>=10,'enterprise_subbranches_incomplete');
assert.ok(dossier.includes('# Branch 01 — Enterprise & Operations'),'enterprise_dossier_heading_missing');
assert.ok(master.includes('## 8. ENTERPRISE & OPERATIONS'),'enterprise_master_index_anchor_missing');

const ids=new Set();
for(const branch of registry.subbranches){
  assert.ok(branch.id&&typeof branch.id==='string',`subbranch_id_missing:${branch.name||'unknown'}`);
  assert.ok(!ids.has(branch.id),`duplicate_subbranch_id:${branch.id}`);ids.add(branch.id);
  assert.ok(branch.name&&typeof branch.name==='string',`subbranch_name_missing:${branch.id}`);
  assert.ok(maturities.has(branch.maturity),`invalid_maturity:${branch.id}:${branch.maturity}`);
  assert.ok(Array.isArray(branch.routes),`routes_array_required:${branch.id}`);
  assert.ok(Array.isArray(branch.evidence)||Array.isArray(branch.requiredLineage),`evidence_or_lineage_required:${branch.id}`);

  if(['working-fruit','ripe-fruit'].includes(branch.maturity)){
    assert.ok(branch.systemOfRecord,`working_fruit_system_of_record_required:${branch.id}`);
    assert.ok(branch.evidence?.length,`working_fruit_evidence_required:${branch.id}`);
    assert.ok(branch.routes.length,`working_fruit_route_required:${branch.id}`);
    for(const path of branch.evidence||[]){
      await access(path).catch(()=>assert.fail(`working_fruit_evidence_file_missing:${branch.id}:${path}`));
    }
  }
  if(branch.maturity==='green-fruit'){
    assert.ok(branch.requiredLineage?.length||branch.evidence?.length,`green_fruit_lineage_required:${branch.id}`);
  }
  if(branch.systemOfRecord==='derived-read-only'){
    assert.ok(branch.derivesFrom?.length>=2,`derived_report_sources_required:${branch.id}`);
  }
}

for(const required of ['enterprise-administration','crm','operations','inventory','projects','transportation','documents','reports','commercial-orders','procurement'])assert.ok(ids.has(required),`required_enterprise_lineage_missing:${required}`);
for(const invariant of ['no-duplicate-core-identity','no-duplicate-financial-ledger','inventory-balance-derived-from-movements','reports-never-own-source-transactions'])assert.ok(registry.invariants.includes(invariant),`enterprise_invariant_missing:${invariant}`);
assert.ok(registry.nextFruitSequence?.[0]==='canonical-commercial-transaction-spine','enterprise_next_fruit_sequence_must_start_with_commercial_spine');
assert.ok(dossier.includes('WORKING FRUIT')&&dossier.includes('GREEN FRUIT')&&dossier.includes('Definition of ripe fruit'),'enterprise_dossier_maturity_contract_missing');

console.log(`ATLAS genealogy gate passed: Branch 01 has ${registry.subbranches.length} sub-branches, evidence-backed working fruit, explicit green fruit and canonical lineage invariants.`);
