import {readFile} from 'node:fs/promises';
const files={
  gpu:await readFile('atlas/gpu-executor.mjs','utf8'),
  trainer:await readFile('atlas/trainers/stt_train.py','utf8'),
  lab:await readFile('modules/studio-model-lab-worker.js','utf8'),
  pkg:JSON.parse(await readFile('package.json','utf8'))
};
const must=(text,tokens,label)=>{for(const token of tokens)if(!text.includes(token))throw new Error(`${label} missing ${token}`)};
must(files.gpu,['ATLAS GPU Executor','nvidia-smi','externalProviders:[]','speech-to-text','spawn(plan.command[0]','--apply'],'gpu executor');
must(files.trainer,['ATLAS first-party CTC speech-to-text trainer','CTCLoss','MelSpectrogram','GRU(','torch.cuda.is_available','externalProviders'],'stt trainer');
must(files.lab,['/api/studio/models/gpu/capabilities','/studio/models/gpu','/studio/models/stt','ATLAS GPU Executor','ATLAS Speech Training Lab'],'model lab');
if(files.pkg.scripts['atlas:gpu']!=='node atlas/gpu-executor.mjs')throw new Error('atlas:gpu script missing');
if(files.pkg.scripts['check:gpu-stt']!=='node scripts/validate-gpu-stt-foundation.mjs')throw new Error('check:gpu-stt script missing');
if(/runpod|heygen|magnific|descript|adobe/i.test(files.gpu+files.trainer))throw new Error('creative/provider dependency leaked into first-party GPU/STT foundation');
console.log('ATLAS GPU Executor and first-party STT foundation validation passed');