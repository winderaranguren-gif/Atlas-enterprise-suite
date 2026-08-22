# ATLAS GPU and Speech Training Foundation

ATLAS now includes a first-party execution path for Speech-to-Text model training.

Implemented components:

- `atlas/gpu-executor.mjs`: probes NVIDIA hardware, reads Neural Foundry jobs, plans execution, and starts the local trainer only when `--apply` is supplied.
- `atlas/trainers/stt_train.py`: CUDA PyTorch training pipeline using log-mel features, a bidirectional GRU encoder, CTC loss, WER/CER evaluation, checkpoint export, and local result metadata.
- `/studio/models/gpu`: GPU execution control surface.
- `/studio/models/stt`: Speech Training Lab.

The Cloudflare Worker does not claim to have a GPU. Training is available only on a node that passes the runtime hardware and dependency checks.

## Dataset contract

A registered Speech-to-Text manifest should contain authorized audio and transcript pairs:

```json
{
  "id": "atlas-stt-es-v1",
  "task": "speech-to-text",
  "license": "authorized",
  "items": [
    {"audio": "data/clip001.wav", "text": "hola atlas", "split": "train"},
    {"audio": "data/clip002.wav", "text": "crear video", "split": "validation"}
  ]
}
```

## Runtime flow

```text
DATASET
-> FOUNDRY REGISTER
-> TRAINING RECIPE
-> QUEUED JOB
-> GPU PROBE
-> EXECUTION PLAN
-> JOB RUN --apply
-> CUDA TRAINER
-> WER/CER
-> CHECKPOINT
-> ARTIFACT INTEGRITY
-> MODEL PROMOTION
```

## Commands

```bash
node atlas/gpu-executor.mjs status
node atlas/gpu-executor.mjs job plan JOB_ID
node atlas/gpu-executor.mjs job run JOB_ID
node atlas/gpu-executor.mjs job run JOB_ID --apply
python3 atlas/trainers/stt_train.py --doctor
```

The executor is infrastructure-neutral. Any compatible NVIDIA/CUDA machine can host the same ATLAS runtime.