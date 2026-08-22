#!/usr/bin/env python3
import argparse
import json
import math
import os
import random
import re
from pathlib import Path

ROOT = Path.cwd()
FOUNDRY = Path(os.environ.get('ATLAS_FOUNDRY_ROOT', ROOT / '.atlas' / 'models' / 'foundry'))


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


def normalize_text(value):
    value = str(value or '').lower().strip()
    value = re.sub(r'\s+', ' ', value)
    return value


def metrics(refs, hyps):
    word_edits = word_total = char_edits = char_total = 0
    for ref, hyp in zip(refs, hyps):
        rw, hw = ref.split(), hyp.split()
        word_edits += edit_distance(rw, hw)
        word_total += max(1, len(rw))
        char_edits += edit_distance(list(ref), list(hyp))
        char_total += max(1, len(ref))
    return {'wer': word_edits / max(1, word_total), 'cer': char_edits / max(1, char_total)}


def dependency_status():
    result = {'torch': False, 'torchaudio': False, 'cuda': False, 'device': None}
    try:
        import torch
        result['torch'] = True
        result['cuda'] = bool(torch.cuda.is_available())
        result['device'] = torch.cuda.get_device_name(0) if result['cuda'] else None
    except Exception:
        return result
    try:
        import torchaudio
        result['torchaudio'] = True
    except Exception:
        pass
    return result


def resolve_items(manifest):
    items = []
    for i, raw in enumerate(manifest.get('items') or []):
        if isinstance(raw, str):
            continue
        audio = raw.get('audio') or raw.get('audioPath') or raw.get('source')
        text = normalize_text(raw.get('text') or raw.get('transcript'))
        if not audio or not text:
            continue
        path = Path(audio)
        if not path.is_absolute():
            path = (ROOT / path).resolve()
        items.append({'id': raw.get('id') or f'item-{i:06d}', 'audio': path, 'text': text, 'split': raw.get('split')})
    if len(items) < 2:
        raise RuntimeError('speech-to-text dataset needs at least two items containing audio/source and text/transcript')
    return items


def split_items(items, seed):
    explicit_train = [x for x in items if x.get('split') in ('train', 'training')]
    explicit_valid = [x for x in items if x.get('split') in ('valid', 'validation', 'dev', 'test')]
    if explicit_train and explicit_valid:
        return explicit_train, explicit_valid
    rows = list(items)
    random.Random(seed).shuffle(rows)
    cut = max(1, min(len(rows) - 1, int(round(len(rows) * 0.9))))
    return rows[:cut], rows[cut:]


def main():
    parser = argparse.ArgumentParser(description='ATLAS first-party CTC speech-to-text trainer')
    parser.add_argument('--job')
    parser.add_argument('--doctor', action='store_true')
    args = parser.parse_args()
    deps = dependency_status()
    if args.doctor:
        print(json.dumps({'service': 'ATLAS STT Trainer', 'dependencies': deps, 'externalProviders': []}, indent=2))
        return
    if not args.job:
        raise RuntimeError('--job is required')
    if not (deps['torch'] and deps['torchaudio'] and deps['cuda']):
        raise RuntimeError(f"ATLAS STT training requires torch + torchaudio + CUDA; detected {deps}")

    import torch
    import torchaudio
    from torch import nn

    jobs = load_json(FOUNDRY / 'jobs.json', [])
    recipes = load_json(FOUNDRY / 'recipes.json', [])
    datasets = load_json(FOUNDRY / 'datasets.json', [])
    job = find(jobs, args.job, 'job')
    if job.get('task') != 'speech-to-text':
        raise RuntimeError('trainer accepts only speech-to-text jobs')
    recipe = find(recipes, job.get('recipeId'), 'recipe')
    dataset = find(datasets, job.get('datasetId'), 'dataset')
    manifest = json.loads(Path(dataset['manifestPath']).read_text())
    items = resolve_items(manifest)
    cfg = recipe.get('config') or {}
    seed = int(cfg.get('seed', 42))
    random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    train_items, valid_items = split_items(items, seed)

    chars = sorted(set(''.join(x['text'] for x in train_items)))
    vocab = ['<blank>'] + chars
    char_to_id = {c: i for i, c in enumerate(vocab) if i}
    if not char_to_id:
        raise RuntimeError('training transcripts produced an empty vocabulary')

    sample_rate = int((cfg.get('input') or {}).get('sampleRate', 16000)) if isinstance(cfg.get('input'), dict) else 16000
    n_mels = int((cfg.get('input') or {}).get('nMels', 80)) if isinstance(cfg.get('input'), dict) else 80
    hidden = int((cfg.get('architecture') or {}).get('hidden', 256)) if isinstance(cfg.get('architecture'), dict) else 256
    layers = int((cfg.get('architecture') or {}).get('layers', 3)) if isinstance(cfg.get('architecture'), dict) else 3
    epochs = int(cfg.get('epochs', 10))
    learning_rate = float(cfg.get('learningRate', 1e-4))
    grad_accum = max(1, int(cfg.get('batchSize', 4)))
    device = torch.device('cuda:0')

    mel = torchaudio.transforms.MelSpectrogram(sample_rate=sample_rate, n_fft=400, hop_length=160, n_mels=n_mels).to(device)
    db = torchaudio.transforms.AmplitudeToDB(stype='power').to(device)

    class Model(nn.Module):
        def __init__(self):
            super().__init__()
            self.norm = nn.LayerNorm(n_mels)
            self.rnn = nn.GRU(n_mels, hidden, layers, batch_first=True, bidirectional=True, dropout=0.1 if layers > 1 else 0.0)
            self.head = nn.Linear(hidden * 2, len(vocab))

        def forward(self, x):
            x = self.norm(x)
            x, _ = self.rnn(x)
            return self.head(x)

    model = Model().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    ctc = nn.CTCLoss(blank=0, zero_infinity=True)

    def features(item):
        wave, sr = torchaudio.load(str(item['audio']))
        wave = wave.mean(dim=0, keepdim=True)
        if sr != sample_rate:
            wave = torchaudio.functional.resample(wave, sr, sample_rate)
        wave = wave.to(device)
        feat = db(mel(wave)).squeeze(0).transpose(0, 1)
        feat = (feat - feat.mean()) / (feat.std() + 1e-5)
        return feat

    def target(text):
        ids = [char_to_id[c] for c in text if c in char_to_id]
        if not ids:
            raise RuntimeError('transcript has no in-vocabulary characters')
        return torch.tensor(ids, dtype=torch.long, device=device)

    def decode(logits):
        ids = logits.argmax(-1).tolist()
        out, prev = [], None
        for idx in ids:
            if idx != 0 and idx != prev:
                out.append(vocab[idx])
            prev = idx
        return ''.join(out).strip()

    history = []
    for epoch in range(1, epochs + 1):
        model.train()
        random.Random(seed + epoch).shuffle(train_items)
        optimizer.zero_grad(set_to_none=True)
        losses = []
        for step, item in enumerate(train_items, 1):
            x = features(item).unsqueeze(0)
            y = target(item['text'])
            logits = model(x)
            log_probs = logits.log_softmax(-1).transpose(0, 1)
            input_lengths = torch.tensor([logits.size(1)], dtype=torch.long)
            target_lengths = torch.tensor([y.numel()], dtype=torch.long)
            loss = ctc(log_probs, y, input_lengths, target_lengths) / grad_accum
            loss.backward()
            losses.append(float(loss.detach().cpu()) * grad_accum)
            if step % grad_accum == 0 or step == len(train_items):
                nn.utils.clip_grad_norm_(model.parameters(), 5.0)
                optimizer.step()
                optimizer.zero_grad(set_to_none=True)

        model.eval()
        refs, hyps = [], []
        with torch.no_grad():
            for item in valid_items:
                x = features(item).unsqueeze(0)
                hyp = decode(model(x).squeeze(0))
                refs.append(item['text'])
                hyps.append(hyp)
        score = metrics(refs, hyps)
        row = {'epoch': epoch, 'loss': sum(losses) / max(1, len(losses)), **score}
        history.append(row)
        print(json.dumps({'event': 'epoch', **row}), flush=True)

    run_dir = FOUNDRY / 'runs' / args.job
    run_dir.mkdir(parents=True, exist_ok=True)
    checkpoint = run_dir / 'model.pt'
    torch.save({'model': model.state_dict(), 'vocab': vocab, 'sampleRate': sample_rate, 'nMels': n_mels, 'recipeId': recipe['id'], 'datasetId': dataset['id'], 'history': history}, checkpoint)
    final = history[-1]
    result = {
        'service': 'ATLAS STT Trainer',
        'jobId': args.job,
        'task': 'speech-to-text',
        'externalProviders': [],
        'architecture': 'ATLAS BiGRU CTC v1',
        'device': deps['device'],
        'trainItems': len(train_items),
        'validationItems': len(valid_items),
        'vocabSize': len(vocab),
        'metrics': {'wer': final['wer'], 'cer': final['cer'], 'loss': final['loss']},
        'checkpoint': str(checkpoint),
        'history': history,
        'state': 'candidate'
    }
    (run_dir / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'service': 'ATLAS STT Trainer', 'ok': False, 'error': str(exc)}))
        raise