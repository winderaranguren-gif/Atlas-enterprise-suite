import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REGISTRY_DIR='architecture/genealogy';
const ACTIVE=new Set(['working-fruit','ripe-fruit','green-fruit','seed','artifact-verified','partner-bound','archive']);

export async function loadGenealogy(dir=REGISTRY_DIR){
  const files=(await readdir(dir)).filter(name=>/^\d{2}-.+\.json$/.test(name)).sort();
  const branches=[];
  for(const file of files){
    const registry=JSON.parse(await readFile(`${dir}/${file}`,'utf8'));
    branches.push({...registry,file:`${dir}/${file}`});
  }
  return branches;
}

function score(item){
  const evidence=Array.isArray(item.evidence)?item.evidence.length:0;
  const lineage=Array.isArray(item.requiredLineage)?item.requiredLineage.length:0;
  const routes=Array.isArray(item.routes)?item.routes.length:0;
  const limitations=Array.isArray(item.limitations)?item.limitations.length:0;
  const base={
    'ripe-fruit':100,
    'working-fruit':80,
    'green-fruit':50,
    'artifact-verified':45,
    'seed':20,
    'partner-bound':10,
    'archive':0
  }[item.maturity]??0;
  return base+Math.min(evidence,5)*3+Math.min(lineage,5)*2+Math.min(routes,3)*2-Math.min(limitations,8)*2;
}

export function buildProgram(branches){
  const fruits=[];
  const maturityCounts={};
  for(const branch of branches){
    for(const sub of branch.subbranches||[]){
      if(!ACTIVE.has(sub.maturity))continue;
      maturityCounts[sub.maturity]=(maturityCounts[sub.maturity]||0)+1;
      fruits.push({
        branchNumber:branch.branchNumber,
        branchId:branch.branchId,
        branchName:branch.name,
        id:sub.id,
        name:sub.name,
        maturity:sub.maturity,
        score:score(sub),
        routes:sub.routes||[],
        evidence:sub.evidence||[],
        requiredLineage:sub.requiredLineage||[],
        limitations:sub.limitations||[],
        systemOfRecord:sub.systemOfRecord??null
      });
    }
  }
  const byScore=(a,b)=>b.score-a.score||a.branchNumber-b.branchNumber||a.id.localeCompare(b.id);
  const verifyToRipe=fruits.filter(f=>f.maturity==='working-fruit').sort(byScore);
  const promoteToWorking=fruits.filter(f=>['green-fruit','artifact-verified','seed'].includes(f.maturity)).sort(byScore);
  const partnerBound=fruits.filter(f=>f.maturity==='partner-bound').sort(byScore);
  const ripe=fruits.filter(f=>f.maturity==='ripe-fruit').sort(byScore);
  const nextByBranch=branches.map(branch=>({branchNumber:branch.branchNumber,branchId:branch.branchId,branchName:branch.name,nextFruitSequence:branch.nextFruitSequence||[]}));
  return {
    schemaVersion:1,
    generatedFrom:'architecture/genealogy/*.json',
    branchCount:branches.length,
    fruitCount:fruits.length,
    maturityCounts,
    ripe,
    verifyToRipe,
    promoteToWorking,
    partnerBound,
    nextByBranch
  };
}

const cell=value=>String(value??'').replaceAll('|','\\|').replace(/\s+/g,' ').trim();
export function toMarkdown(program,{limit=30}={}){
  const counts=Object.entries(program.maturityCounts).sort().map(([k,v])=>`- **${k}:** ${v}`).join('\n');
  const rows=program.promoteToWorking.slice(0,limit).map((f,i)=>`| ${i+1} | ${String(f.branchNumber).padStart(2,'0')} · ${cell(f.branchName)} | ${cell(f.name)} | ${f.maturity} | ${f.score} | ${cell(f.limitations.join('; ')||'—')} |`).join('\n');
  const verify=program.verifyToRipe.slice(0,limit).map((f,i)=>`| ${i+1} | ${String(f.branchNumber).padStart(2,'0')} · ${cell(f.branchName)} | ${cell(f.name)} | ${f.score} | ${cell(f.systemOfRecord||'—')} |`).join('\n');
  const partner=program.partnerBound.slice(0,limit).map(f=>`- **${String(f.branchNumber).padStart(2,'0')} · ${cell(f.branchName)} → ${cell(f.name)}** — requires authorized partner/provider boundary.`).join('\n');
  return `# ATLAS Fruit Promotion Program\n\n**Source:** all ${program.branchCount} canonical genealogy branches  \n**Fruits/sub-branches indexed:** ${program.fruitCount}\n\n## Maturity inventory\n${counts}\n\n## Promotion queue — GREEN / ARTIFACT / SEED → WORKING\n\nThis is an engineering-priority queue, not a claim that the item is already ready. Higher score means more existing evidence/lineage/routes and fewer declared blockers.\n\n| # | Branch | Fruit | Current maturity | Priority | Known limitations |\n|---|---|---|---|---:|---|\n${rows||'| — | — | — | — | — | — |'}\n\n## Verification queue — WORKING → RIPE\n\nA WORKING fruit must earn RIPE status through environment-appropriate verification, not by renaming its state.\n\n| # | Branch | Fruit | Priority | System of record |\n|---|---|---|---:|---|\n${verify||'| — | — | — | — | — |'}\n\n## Partner-bound queue\n${partner||'- None declared.'}\n\n## Operating law\n1. Genealogy defines ownership and lineage; this program defines promotion order.\n2. No fruit may skip its branch invariants or authoritative system of record.\n3. Partner-bound work is designed and integrated by ATLAS but not represented as self-executed regulation.\n4. Working does not mean production-LIVE; RIPE requires explicit evidence for the intended environment.\n5. The queue is recalculated from the branch registries, so architecture changes automatically change priorities.\n`;
}

async function main(){
  const branches=await loadGenealogy();
  const program=buildProgram(branches);
  if(process.argv.includes('--json'))process.stdout.write(JSON.stringify(program,null,2)+'\n');
  else process.stdout.write(toMarkdown(program,{limit:Number(process.env.ATLAS_FRUIT_LIMIT||30)}));
}

const invoked=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(invoked)main().catch(error=>{console.error(error);process.exit(1)});
