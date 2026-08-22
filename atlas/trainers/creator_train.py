#!/usr/bin/env python3
import argparse
import json
import math
import os
import random
from pathlib import Path

ROOT = Path.cwd()
FOUNDRY = Path(os.environ.get('ATLAS_FOUNDRY_ROOT', ROOT / '.atlas' / 'models' / 'foundry'))
SUPPORTED = {
    'phoneme-recognition',
    'voice-synthesis',
    'voice-clone',
    'facial-lipsync',
    'super-resolution',
    'video-restyle',
}


def load_json(path, fallback):
    try:
        return json.loads(Path(path).read_text())
    except Exception:
        return fallback


def find(rows, key, label):
    for row in rows:
        if row.get('id') == key:
            return row
    raise RuntimeError(f'{label} not found: {key}')


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(cur[-1] + 1, prev[j] + 1, prev[j - 1] + (0 if x == y else 1)))
        prev = cur
    return prev[-1]


def dependency_status():
    out = {'torch': False, 'torchaudio': False, 'torchvision': False, 'pillow': False, 'cuda': False, 'device': None}
    try:
        import torch
        out['torch'] = True
        out['cuda'] = bool(torch.cuda.is_available())
        out['device'] = torch.cuda.get_device_name(0) if out['cuda'] else None
    except Exception:
        return out
    try:
        import torchaudio
        out['torchaudio'] = True
    except Exception:
        pass
    try:
        import torchvision
        out['torchvision'] = True
    except Exception:
        pass
    try:
        from PIL import Image
        out['pillow'] = True
    except Exception:
        pass
    return out


def load_job(job_id):
    jobs = load_json(FOUNDRY / 'jobs.json', [])
    recipes = load_json(FOUNDRY / 'recipes.json', [])
    datasets = load_json(FOUNDRY / 'datasets.json', [])
    job = find(jobs, job_id, 'job')
    if job.get('task') not in SUPPORTED:
        raise RuntimeError(f"creator trainer does not support task {job.get('task')}")
    recipe = find(recipes, job.get('recipeId'), 'recipe')
    dataset = find(datasets, job.get('datasetId'), 'dataset')
    if recipe.get('task') != job.get('task') or dataset.get('task') != job.get('task'):
        raise RuntimeError('job, recipe and dataset task mismatch')
    manifest = json.loads(Path(dataset['manifestPath']).read_text())
    return job, recipe, dataset, manifest


def split_rows(rows, seed):
    train = [x for x in rows if x.get('split') in ('train', 'training')]
    valid = [x for x in rows if x.get('split') in ('valid', 'validation', 'dev', 'test')]
    if train and valid:
        return train, valid
    rows = list(rows)
    if len(rows) < 2:
        raise RuntimeError('training requires at least two usable dataset items')
    random.Random(seed).shuffle(rows)
    cut = max(1, min(len(rows) - 1, int(round(len(rows) * 0.9))))
    return rows[:cut], rows[cut:]


def audio_path(item):
    value = item.get('audio') or item.get('audioPath') or item.get('source')
    if not value:
        raise RuntimeError('audio item is missing audio/audioPath/source')
    path = Path(value)
    return path if path.is_absolute() else (ROOT / path).resolve()


def image_path(item, *keys):
    value = None
    for key in keys:
        if item.get(key):
            value = item[key]
            break
    if not value:
        raise RuntimeError(f'image item is missing one of {keys}')
    path = Path(value)
    return path if path.is_absolute() else (ROOT / path).resolve()


def run_dir(job_id):
    path = FOUNDRY / 'runs' / job_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_result(job_id, result):
    path = run_dir(job_id) / 'result.json'
    path.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


def train_phoneme(job_id, cfg, manifest, deps):
    if not (deps['torch'] and deps['torchaudio'] and deps['cuda']):
        raise RuntimeError('phoneme training requires CUDA PyTorch and torchaudio')
    import torch
    import torchaudio
    from torch import nn

    rows = []
    for i, item in enumerate(manifest.get('items') or []):
        if not isinstance(item, dict):
            continue
        phones = item.get('phonemes') or item.get('phones')
        if isinstance(phones, str):
            phones = [p for p in phones.strip().split() if p]
        if not phones:
            continue
        rows.append({'id': item.get('id') or f'item-{i:06d}', 'audio': audio_path(item), 'phones': list(phones), 'split': item.get('split')})
    seed = int(cfg.get('seed', 42))
    train, valid = split_rows(rows, seed)
    vocab = ['<blank>'] + sorted({p for r in train for p in r['phones']})
    ids = {p: i for i, p in enumerate(vocab) if i}
    sample_rate = 16000
    n_mels = 80
    hidden = 256
    device = torch.device('cuda:0')
    mel = torchaudio.transforms.MelSpectrogram(sample_rate=sample_rate, n_fft=400, hop_length=160, n_mels=n_mels).to(device)
    db = torchaudio.transforms.AmplitudeToDB(stype='power').to(device)

    class Model(nn.Module):
        def __init__(self):
            super().__init__()
            self.norm = nn.LayerNorm(n_mels)
            self.rnn = nn.GRU(n_mels, hidden, 3, batch_first=True, bidirectional=True, dropout=0.1)
            self.head = nn.Linear(hidden * 2, len(vocab))
        def forward(self, x):
            x = self.norm(x)
            x, _ = self.rnn(x)
            return self.head(x)

    def feat(row):
        wave, sr = torchaudio.load(str(row['audio']))
        wave = wave.mean(0, keepdim=True)
        if sr != sample_rate:
            wave = torchaudio.functional.resample(wave, sr, sample_rate)
        x = db(mel(wave.to(device))).squeeze(0).transpose(0, 1)
        return (x - x.mean()) / (x.std() + 1e-5)

    def target(row):
        return torch.tensor([ids[p] for p in row['phones'] if p in ids], dtype=torch.long, device=device)

    def decode(logits):
        seq = logits.argmax(-1).tolist()
        out, prev = [], None
        for idx in seq:
            if idx and idx != prev:
                out.append(vocab[idx])
            prev = idx
        return out

    model = Model().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=float(cfg.get('learningRate', 1e-4)))
    ctc = nn.CTCLoss(blank=0, zero_infinity=True)
    epochs = int(cfg.get('epochs', 10))
    history = []
    for epoch in range(1, epochs + 1):
        model.train(); losses = []
        random.Random(seed + epoch).shuffle(train)
        for row in train:
            x, y = feat(row).unsqueeze(0), target(row)
            logits = model(x)
            loss = ctc(logits.log_softmax(-1).transpose(0, 1), y, torch.tensor([logits.size(1)]), torch.tensor([y.numel()]))
            opt.zero_grad(set_to_none=True); loss.backward(); nn.utils.clip_grad_norm_(model.parameters(), 5.0); opt.step()
            losses.append(float(loss.detach().cpu()))
        model.eval(); edits = total = 0
        with torch.no_grad():
            for row in valid:
                hyp = decode(model(feat(row).unsqueeze(0)).squeeze(0))
                edits += edit_distance(row['phones'], hyp); total += max(1, len(row['phones']))
        metric = {'epoch': epoch, 'loss': sum(losses) / max(1, len(losses)), 'per': edits / max(1, total)}
        history.append(metric); print(json.dumps({'event': 'epoch', **metric}), flush=True)
    checkpoint = run_dir(job_id) / 'model.pt'
    torch.save({'model': model.state_dict(), 'vocab': vocab, 'history': history}, checkpoint)
    write_result(job_id, {'service': 'ATLAS Neural Creator', 'task': 'phoneme-recognition', 'jobId': job_id, 'externalProviders': [], 'architecture': 'ATLAS BiGRU Phoneme CTC v1', 'device': deps['device'], 'metrics': {'per': history[-1]['per'], 'loss': history[-1]['loss']}, 'checkpoint': str(checkpoint), 'state': 'candidate'})


def train_voice(job_id, task, cfg, manifest, deps):
    if not (deps['torch'] and deps['torchaudio'] and deps['cuda']):
        raise RuntimeError('voice training requires CUDA PyTorch and torchaudio')
    import torch
    import torchaudio
    import torch.nn.functional as F
    from torch import nn

    rows = []
    for i, item in enumerate(manifest.get('items') or []):
        if not isinstance(item, dict):
            continue
        text = str(item.get('text') or item.get('transcript') or '').strip().lower()
        if not text:
            continue
        rows.append({'id': item.get('id') or f'item-{i:06d}', 'audio': audio_path(item), 'text': text, 'speaker': str(item.get('speaker') or 'default'), 'split': item.get('split')})
    seed = int(cfg.get('seed', 42)); train, valid = split_rows(rows, seed)
    chars = ['<pad>'] + sorted({c for row in train for c in row['text']})
    char_ids = {c: i for i, c in enumerate(chars)}
    speakers = sorted({row['speaker'] for row in train})
    speaker_ids = {s: i for i, s in enumerate(speakers)}
    device = torch.device('cuda:0'); sample_rate = 22050; n_mels = 80
    mel_fn = torchaudio.transforms.MelSpectrogram(sample_rate=sample_rate, n_fft=1024, hop_length=256, n_mels=n_mels).to(device)
    db = torchaudio.transforms.AmplitudeToDB(stype='power').to(device)

    class Model(nn.Module):
        def __init__(self):
            super().__init__()
            self.embed = nn.Embedding(len(chars), 192, padding_idx=0)
            self.encoder = nn.GRU(192, 256, 2, batch_first=True, bidirectional=True, dropout=0.1)
            self.speaker = nn.Embedding(max(1, len(speakers)), 512) if task == 'voice-clone' else None
            self.proj = nn.Sequential(nn.Linear(512, 384), nn.ReLU(), nn.Linear(384, n_mels))
        def forward(self, tokens, frames, speaker_id=0):
            x, _ = self.encoder(self.embed(tokens))
            if self.speaker is not None:
                x = x + self.speaker(torch.tensor([speaker_id], device=x.device)).unsqueeze(1)
            x = F.interpolate(x.transpose(1, 2), size=frames, mode='linear', align_corners=False).transpose(1, 2)
            return self.proj(x)

    def target_mel(row):
        wave, sr = torchaudio.load(str(row['audio'])); wave = wave.mean(0, keepdim=True)
        if sr != sample_rate: wave = torchaudio.functional.resample(wave, sr, sample_rate)
        return db(mel_fn(wave.to(device))).squeeze(0).transpose(0, 1)

    def tokens(row):
        values = [char_ids[c] for c in row['text'] if c in char_ids]
        return torch.tensor(values or [0], dtype=torch.long, device=device).unsqueeze(0)

    model = Model().to(device); opt = torch.optim.AdamW(model.parameters(), lr=float(cfg.get('learningRate', 2e-4)))
    epochs = int(cfg.get('epochs', 10)); history = []
    for epoch in range(1, epochs + 1):
        model.train(); losses = []
        random.Random(seed + epoch).shuffle(train)
        for row in train:
            target = target_mel(row); sid = speaker_ids.get(row['speaker'], 0)
            pred = model(tokens(row), target.size(0), sid).squeeze(0)
            loss = F.l1_loss(pred, target)
            opt.zero_grad(set_to_none=True); loss.backward(); nn.utils.clip_grad_norm_(model.parameters(), 5.0); opt.step(); losses.append(float(loss.detach().cpu()))
        model.eval(); maes = []
        with torch.no_grad():
            for row in valid:
                target = target_mel(row); pred = model(tokens(row), target.size(0), speaker_ids.get(row['speaker'], 0)).squeeze(0)
                maes.append(float(F.l1_loss(pred, target).detach().cpu()))
        metric = {'epoch': epoch, 'loss': sum(losses)/max(1,len(losses)), 'mel_mae': sum(maes)/max(1,len(maes))}
        history.append(metric); print(json.dumps({'event':'epoch', **metric}), flush=True)
    checkpoint = run_dir(job_id) / 'model.pt'
    torch.save({'model': model.state_dict(), 'chars': chars, 'speakers': speakers, 'sampleRate': sample_rate, 'nMels': n_mels, 'history': history}, checkpoint)
    write_result(job_id, {'service':'ATLAS Neural Creator','task':task,'jobId':job_id,'externalProviders':[],'architecture':'ATLAS Spectrogram Voice v1','device':deps['device'],'metrics':{'mel_mae':history[-1]['mel_mae'],'loss':history[-1]['loss']},'checkpoint':str(checkpoint),'outputRepresentation':'mel-spectrogram','waveformVocoderIncluded':False,'state':'candidate'})


def train_lipsync(job_id, cfg, manifest, deps):
    if not (deps['torch'] and deps['torchaudio'] and deps['cuda']):
        raise RuntimeError('lip-sync training requires CUDA PyTorch and torchaudio')
    import torch
    import torchaudio
    import torch.nn.functional as F
    from torch import nn

    rows = []
    for i, item in enumerate(manifest.get('items') or []):
        if not isinstance(item, dict): continue
        target = item.get('landmarks') or item.get('mouthLandmarks')
        if isinstance(target, str): target = load_json((ROOT / target).resolve(), None)
        if not isinstance(target, list) or not target: continue
        rows.append({'id':item.get('id') or f'item-{i:06d}','audio':audio_path(item),'landmarks':target,'split':item.get('split')})
    seed=int(cfg.get('seed',42)); train,valid=split_rows(rows,seed); device=torch.device('cuda:0'); sample_rate=16000; n_mels=80
    dim=len(train[0]['landmarks'][0]) if isinstance(train[0]['landmarks'][0],list) else 0
    if dim < 2: raise RuntimeError('mouth landmarks must be a list of numeric vectors')
    mel_fn=torchaudio.transforms.MelSpectrogram(sample_rate=sample_rate,n_fft=400,hop_length=160,n_mels=n_mels).to(device)
    class Model(nn.Module):
        def __init__(self):
            super().__init__(); self.rnn=nn.GRU(n_mels,256,3,batch_first=True,bidirectional=True,dropout=0.1); self.head=nn.Sequential(nn.Linear(512,256),nn.ReLU(),nn.Linear(256,dim))
        def forward(self,x,frames):
            x,_=self.rnn(x); x=F.interpolate(x.transpose(1,2),size=frames,mode='linear',align_corners=False).transpose(1,2); return self.head(x)
    def feat(row):
        wave,sr=torchaudio.load(str(row['audio'])); wave=wave.mean(0,keepdim=True)
        if sr!=sample_rate: wave=torchaudio.functional.resample(wave,sr,sample_rate)
        x=torch.log1p(mel_fn(wave.to(device))).squeeze(0).transpose(0,1); return (x-x.mean())/(x.std()+1e-5)
    def tgt(row): return torch.tensor(row['landmarks'],dtype=torch.float32,device=device)
    model=Model().to(device); opt=torch.optim.AdamW(model.parameters(),lr=float(cfg.get('learningRate',1e-4))); epochs=int(cfg.get('epochs',10)); history=[]
    for epoch in range(1,epochs+1):
        model.train(); losses=[]
        for row in train:
            y=tgt(row); pred=model(feat(row).unsqueeze(0),y.size(0)).squeeze(0); loss=F.mse_loss(pred,y); opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); losses.append(float(loss.detach().cpu()))
        model.eval(); vals=[]
        with torch.no_grad():
            for row in valid:
                y=tgt(row); vals.append(float(F.mse_loss(model(feat(row).unsqueeze(0),y.size(0)).squeeze(0),y).detach().cpu()))
        metric={'epoch':epoch,'loss':sum(losses)/max(1,len(losses)),'landmark_mse':sum(vals)/max(1,len(vals))}; history.append(metric); print(json.dumps({'event':'epoch',**metric}),flush=True)
    checkpoint=run_dir(job_id)/'model.pt'; torch.save({'model':model.state_dict(),'landmarkDim':dim,'history':history},checkpoint)
    write_result(job_id,{'service':'ATLAS Neural Creator','task':'facial-lipsync','jobId':job_id,'externalProviders':[],'architecture':'ATLAS Audio-to-Mouth-Landmarks v1','device':deps['device'],'metrics':{'landmark_mse':history[-1]['landmark_mse'],'loss':history[-1]['loss']},'checkpoint':str(checkpoint),'rendersFacePixels':False,'state':'candidate'})


def image_tensor(path, device, size=256):
    from PIL import Image
    import torch
    import torchvision.transforms.functional as TF
    image=Image.open(path).convert('RGB')
    image=TF.resize(image,[size,size],antialias=True)
    return TF.to_tensor(image).to(device)


def train_superres(job_id, cfg, manifest, deps):
    if not (deps['torch'] and deps['torchvision'] and deps['pillow'] and deps['cuda']):
        raise RuntimeError('super-resolution training requires CUDA PyTorch, torchvision and Pillow')
    import torch
    import torch.nn.functional as F
    from torch import nn
    rows=[]
    for i,item in enumerate(manifest.get('items') or []):
        if not isinstance(item,dict): continue
        try: high=image_path(item,'high','target','image')
        except Exception: continue
        low=None
        try: low=image_path(item,'low','source')
        except Exception: pass
        rows.append({'id':item.get('id') or f'item-{i:06d}','high':high,'low':low,'split':item.get('split')})
    seed=int(cfg.get('seed',42)); train,valid=split_rows(rows,seed); device=torch.device('cuda:0'); scale=int(cfg.get('scale',2) or 2); scale=2 if scale not in (2,4) else scale
    class ResBlock(nn.Module):
        def __init__(self): super().__init__(); self.net=nn.Sequential(nn.Conv2d(64,64,3,1,1),nn.ReLU(),nn.Conv2d(64,64,3,1,1))
        def forward(self,x): return x+self.net(x)
    class Model(nn.Module):
        def __init__(self):
            super().__init__(); self.head=nn.Conv2d(3,64,5,1,2); self.body=nn.Sequential(*[ResBlock() for _ in range(6)]); self.up=nn.Sequential(nn.Conv2d(64,64*scale*scale,3,1,1),nn.PixelShuffle(scale),nn.ReLU(),nn.Conv2d(64,3,3,1,1))
        def forward(self,x): return torch.sigmoid(self.up(self.body(self.head(x))))
    def pair(row):
        high=image_tensor(row['high'],device,256)
        if row['low']:
            low=image_tensor(row['low'],device,256//scale)
        else:
            low=F.interpolate(high.unsqueeze(0),scale_factor=1/scale,mode='bicubic',align_corners=False).squeeze(0)
        return low.unsqueeze(0),high.unsqueeze(0)
    model=Model().to(device); opt=torch.optim.AdamW(model.parameters(),lr=float(cfg.get('learningRate',1e-4))); epochs=int(cfg.get('epochs',10)); history=[]
    for epoch in range(1,epochs+1):
        model.train(); losses=[]
        for row in train:
            x,y=pair(row); pred=model(x); loss=F.l1_loss(pred,y); opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); losses.append(float(loss.detach().cpu()))
        model.eval(); psnrs=[]
        with torch.no_grad():
            for row in valid:
                x,y=pair(row); mse=float(F.mse_loss(model(x),y).detach().cpu()); psnrs.append(99.0 if mse<=1e-12 else 10*math.log10(1.0/mse))
        metric={'epoch':epoch,'loss':sum(losses)/max(1,len(losses)),'psnr':sum(psnrs)/max(1,len(psnrs))}; history.append(metric); print(json.dumps({'event':'epoch',**metric}),flush=True)
    checkpoint=run_dir(job_id)/'model.pt'; torch.save({'model':model.state_dict(),'scale':scale,'history':history},checkpoint)
    write_result(job_id,{'service':'ATLAS Neural Creator','task':'super-resolution','jobId':job_id,'externalProviders':[],'architecture':'ATLAS Residual PixelShuffle SR v1','device':deps['device'],'metrics':{'psnr':history[-1]['psnr'],'loss':history[-1]['loss']},'checkpoint':str(checkpoint),'scale':scale,'state':'candidate'})


def train_restyle(job_id, cfg, manifest, deps):
    if not (deps['torch'] and deps['torchvision'] and deps['pillow'] and deps['cuda']):
        raise RuntimeError('video-restyle training requires CUDA PyTorch, torchvision and Pillow')
    import torch
    import torch.nn.functional as F
    from torch import nn
    rows=[]
    for i,item in enumerate(manifest.get('items') or []):
        if not isinstance(item,dict): continue
        try: source=image_path(item,'source','sourceFrame'); target=image_path(item,'target','targetFrame')
        except Exception: continue
        rows.append({'id':item.get('id') or f'item-{i:06d}','source':source,'target':target,'split':item.get('split')})
    seed=int(cfg.get('seed',42)); train,valid=split_rows(rows,seed); device=torch.device('cuda:0'); size=int(cfg.get('imageSize',256) or 256)
    class Block(nn.Module):
        def __init__(self,a,b): super().__init__(); self.net=nn.Sequential(nn.Conv2d(a,b,3,1,1),nn.GroupNorm(8,b),nn.SiLU(),nn.Conv2d(b,b,3,1,1),nn.GroupNorm(8,b),nn.SiLU())
        def forward(self,x): return self.net(x)
    class Model(nn.Module):
        def __init__(self):
            super().__init__(); self.e1=Block(3,64); self.e2=Block(64,128); self.mid=Block(128,128); self.d1=Block(128+64,64); self.out=nn.Conv2d(64,3,1)
        def forward(self,x):
            a=self.e1(x); b=self.e2(F.avg_pool2d(a,2)); m=self.mid(b); u=F.interpolate(m,size=a.shape[-2:],mode='bilinear',align_corners=False); return torch.sigmoid(self.out(self.d1(torch.cat([u,a],1))))
    def pair(row): return image_tensor(row['source'],device,size).unsqueeze(0),image_tensor(row['target'],device,size).unsqueeze(0)
    def edge(x): return torch.mean(torch.abs(x[:,:,:,1:]-x[:,:,:,:-1]))+torch.mean(torch.abs(x[:,:,1:,:]-x[:,:,:-1,:]))
    model=Model().to(device); opt=torch.optim.AdamW(model.parameters(),lr=float(cfg.get('learningRate',1e-4))); epochs=int(cfg.get('epochs',10)); history=[]
    for epoch in range(1,epochs+1):
        model.train(); losses=[]
        for row in train:
            x,y=pair(row); pred=model(x); loss=F.l1_loss(pred,y)+0.05*torch.abs(edge(pred)-edge(y)); opt.zero_grad(set_to_none=True); loss.backward(); opt.step(); losses.append(float(loss.detach().cpu()))
        model.eval(); vals=[]
        with torch.no_grad():
            for row in valid:
                x,y=pair(row); vals.append(float(F.l1_loss(model(x),y).detach().cpu()))
        metric={'epoch':epoch,'loss':sum(losses)/max(1,len(losses)),'validation_l1':sum(vals)/max(1,len(vals))}; history.append(metric); print(json.dumps({'event':'epoch',**metric}),flush=True)
    checkpoint=run_dir(job_id)/'model.pt'; torch.save({'model':model.state_dict(),'imageSize':size,'history':history},checkpoint)
    write_result(job_id,{'service':'ATLAS Neural Creator','task':'video-restyle','jobId':job_id,'externalProviders':[],'architecture':'ATLAS Paired Restyle U-Net v1','device':deps['device'],'metrics':{'validation_l1':history[-1]['validation_l1'],'loss':history[-1]['loss']},'checkpoint':str(checkpoint),'temporalGeneratorIncluded':False,'state':'candidate'})


def main():
    parser=argparse.ArgumentParser(description='ATLAS first-party neural creator trainer suite')
    parser.add_argument('--job')
    parser.add_argument('--doctor',action='store_true')
    args=parser.parse_args(); deps=dependency_status()
    if args.doctor:
        print(json.dumps({'service':'ATLAS Neural Creator Trainers','supportedTasks':sorted(SUPPORTED),'dependencies':deps,'externalProviders':[]},indent=2)); return
    if not args.job: raise RuntimeError('--job is required')
    job,recipe,dataset,manifest=load_job(args.job); cfg=recipe.get('config') or {}; task=job['task']
    if task=='phoneme-recognition': train_phoneme(args.job,cfg,manifest,deps)
    elif task in ('voice-synthesis','voice-clone'): train_voice(args.job,task,cfg,manifest,deps)
    elif task=='facial-lipsync': train_lipsync(args.job,cfg,manifest,deps)
    elif task=='super-resolution': train_superres(args.job,cfg,manifest,deps)
    elif task=='video-restyle': train_restyle(args.job,cfg,manifest,deps)
    else: raise RuntimeError(f'unsupported task {task}')


if __name__=='__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'service':'ATLAS Neural Creator Trainers','ok':False,'error':str(exc)}))
        raise
