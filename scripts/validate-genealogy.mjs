import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';

const registryDir='architecture/genealogy';
const masterPath='docs/ATLAS_MASTER_INDEX_GENEALOGY.md';
const branchIndexPath='docs/branches/README.md';
const master=await readFile(masterPath,'utf8');
const branchIndex=await readFile(branchIndexPath,'utf8');
const files=(await readdir(registryDir)).filter(name=>/^\d{2}-.+\.json$/.test(name)).sort();
const maturities=new Set(['working-fruit','ripe-fruit','green-fruit','seed','partner-bound','archive','artifact-verified']);
const seenBranchIds=new Set(),seenBranchNumbers=new Set();
const requiredByBranch={
  '01-enterprise-operations':['enterprise-administration','crm','operations','inventory','projects','transportation','documents','reports','commercial-orders','procurement'],
  '02-accounting-finance-tax':['chart-of-accounts','general-ledger','accounts-payable','accounts-receivable','banking-ledger','reconciliations','budgets','financial-statements','accounting-periods','tax-obligations','fixed-assets','tax-compliance','tax-pro','efile-government-transmission']
};
const invariantByBranch={
  '01-enterprise-operations':['no-duplicate-core-identity','no-duplicate-financial-ledger','inventory-balance-derived-from-movements','reports-never-own-source-transactions'],
  '02-accounting-finance-tax':['posted-journal-must-balance','financial-statements-derive-from-posted-ledger','closed-period-blocks-new-journal-posting','reconciliation-requires-zero-difference','regulated-execution-requires-authorized-provider']
};

assert.ok(files.length>=2,'genealogy_requires_at_least_two_structured_branches');
for(const file of files){
  const path=`${registryDir}/${file}`,registry=JSON.parse(await readFile(path,'utf8'));
  assert.equal(registry.schemaVersion,1,`genealogy_schema_version_invalid:${file}`);
  assert.ok(Number.isInteger(registry.branchNumber)&&registry.branchNumber>0,`branch_number_invalid:${file}`);
  assert.ok(/^\d{2}-[a-z0-9-]+$/.test(registry.branchId||''),`branch_id_invalid:${file}`);
  assert.ok(!seenBranchIds.has(registry.branchId),`duplicate_branch_id:${registry.branchId}`);seenBranchIds.add(registry.branchId);
  assert.ok(!seenBranchNumbers.has(registry.branchNumber),`duplicate_branch_number:${registry.branchNumber}`);seenBranchNumbers.add(registry.branchNumber);
  assert.equal(registry.parent,'atlas-os-core',`branch_parent_invalid:${registry.branchId}`);
  assert.ok(registry.dossier&&typeof registry.dossier==='string',`branch_dossier_required:${registry.branchId}`);
  assert.ok(registry.masterSection&&typeof registry.masterSection==='string',`branch_master_section_required:${registry.branchId}`);
  await access(registry.dossier).catch(()=>assert.fail(`branch_dossier_missing:${registry.branchId}:${registry.dossier}`));
  const dossier=await readFile(registry.dossier,'utf8');
  assert.ok(master.includes(registry.masterSection),`master_index_section_missing:${registry.branchId}`);
  assert.ok(dossier.includes(`Branch ${String(registry.branchNumber).padStart(2,'0')}`),`dossier_branch_heading_missing:${registry.branchId}`);
  assert.ok(Array.isArray(registry.roots)&&registry.roots.length>=5,`branch_roots_incomplete:${registry.branchId}`);
  assert.ok(Array.isArray(registry.trunkDependencies)&&registry.trunkDependencies.length>=5,`branch_trunk_dependencies_incomplete:${registry.branchId}`);
  assert.ok(Array.isArray(registry.subbranches)&&registry.subbranches.length>=8,`branch_subbranches_incomplete:${registry.branchId}`);
  assert.ok(Array.isArray(registry.invariants)&&registry.invariants.length>=4,`branch_invariants_incomplete:${registry.branchId}`);
  assert.ok(Array.isArray(registry.nextFruitSequence)&&registry.nextFruitSequence.length>=3,`branch_next_fruit_sequence_incomplete:${registry.branchId}`);
  assert.ok(branchIndex.includes(registry.dossier.split('/').pop()),`branch_index_dossier_missing:${registry.branchId}`);
  assert.ok(branchIndex.includes(path),`branch_index_registry_missing:${registry.branchId}`);

  const ids=new Set();
  for(const branch of registry.subbranches){
    assert.ok(branch.id&&typeof branch.id==='string',`subbranch_id_missing:${registry.branchId}:${branch.name||'unknown'}`);
    assert.ok(!ids.has(branch.id),`duplicate_subbranch_id:${registry.branchId}:${branch.id}`);ids.add(branch.id);
    assert.ok(branch.name&&typeof branch.name==='string',`subbranch_name_missing:${registry.branchId}:${branch.id}`);
    assert.ok(maturities.has(branch.maturity),`invalid_maturity:${registry.branchId}:${branch.id}:${branch.maturity}`);
    assert.ok(Array.isArray(branch.routes),`routes_array_required:${registry.branchId}:${branch.id}`);
    assert.ok(Array.isArray(branch.evidence)||Array.isArray(branch.requiredLineage),`evidence_or_lineage_required:${registry.branchId}:${branch.id}`);

    if(['working-fruit','ripe-fruit'].includes(branch.maturity)){
      assert.ok(branch.systemOfRecord,`working_fruit_system_of_record_required:${registry.branchId}:${branch.id}`);
      assert.ok(branch.evidence?.length,`working_fruit_evidence_required:${registry.branchId}:${branch.id}`);
      assert.ok(branch.routes.length,`working_fruit_route_required:${registry.branchId}:${branch.id}`);
      for(const evidencePath of branch.evidence||[])await access(evidencePath).catch(()=>assert.fail(`working_fruit_evidence_file_missing:${registry.branchId}:${branch.id}:${evidencePath}`));
    }
    if(['green-fruit','seed','partner-bound','artifact-verified'].includes(branch.maturity))assert.ok(branch.requiredLineage?.length||branch.evidence?.length,`nonripe_lineage_or_evidence_required:${registry.branchId}:${branch.id}`);
    if(branch.systemOfRecord==='derived-read-only')assert.ok(branch.derivesFrom?.length>=2,`derived_report_sources_required:${registry.branchId}:${branch.id}`);
  }

  for(const required of requiredByBranch[registry.branchId]||[])assert.ok(ids.has(required),`required_lineage_missing:${registry.branchId}:${required}`);
  for(const invariant of invariantByBranch[registry.branchId]||[])assert.ok(registry.invariants.includes(invariant),`required_invariant_missing:${registry.branchId}:${invariant}`);
  assert.ok(dossier.includes('WORKING FRUIT')&&dossier.includes('GREEN FRUIT')&&/Definition of ripe fruit/i.test(dossier),`dossier_maturity_contract_missing:${registry.branchId}`);
}

const ordered=[...seenBranchNumbers].sort((a,b)=>a-b);for(let i=0;i<ordered.length;i++)assert.equal(ordered[i],i+1,`genealogy_branch_sequence_gap_at:${i+1}`);
console.log(`ATLAS genealogy gate passed: ${files.length} primary branches validated from dossiers to evidence-backed fruits.`);
