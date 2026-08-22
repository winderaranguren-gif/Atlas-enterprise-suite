# ATLAS Neural Creator Suite

ATLAS Neural Creator is the first-party orchestration layer that turns Neural Foundry jobs into GPU training plans for the media models consumed by ATLAS Studio.

## Goal

The goal is not to simulate a trained model. The goal is to let ATLAS own the dataset contract, training recipe, executor, checkpoint, evaluation metrics, artifact integrity and promotion decision for each neural media capability.

`externalProviders: []` is a capability contract, not a claim that ATLAS owns the physical GPU. A rented or on-premise NVIDIA machine may host the ATLAS process, while the training code, datasets and model artifacts remain under ATLAS control.

## Pipeline

1. Speech-to-Text
   - Runtime: `atlas/trainers/stt_train.py`
   - Architecture: ATLAS BiGRU CTC v1
   - Metrics: WER, CER

2. Phoneme Recognition
   - Runtime: `atlas/trainers/creator_train.py`
   - Architecture: ATLAS BiGRU Phoneme CTC v1
   - Metric: PER

3. Voice Synthesis
   - Runtime: `atlas/trainers/creator_train.py`
   - Architecture: ATLAS Spectrogram Voice v1
   - Metric: mel MAE
   - Current checkpoint predicts mel spectrograms. A neural waveform vocoder is not claimed by this version.

4. Voice Clone
   - Same spectrogram foundation with speaker conditioning.
   - Consent is mandatory through Neural Foundry.

5. Facial Lip Sync
   - Runtime: `atlas/trainers/creator_train.py`
   - Architecture: ATLAS Audio-to-Mouth-Landmarks v1
   - Metric: landmark MSE
   - Current checkpoint predicts mouth landmarks. Pixel-level facial rendering is not claimed by this version.

6. Neural Super Resolution
   - Runtime: `atlas/trainers/creator_train.py`
   - Architecture: residual blocks + PixelShuffle
   - Metric: PSNR

7. Neural Video Restyle
   - Runtime: `atlas/trainers/creator_train.py`
   - Architecture: paired image U-Net foundation
   - Metric: validation L1
   - Current version trains on paired frames. A full temporal diffusion/video generator is not claimed by this version.

## Digital Twin

Digital Twin is modeled as a composite capability rather than a single hidden model. Its first production gate requires validated artifacts for:

- `voice-clone`
- `facial-lipsync`
- `video-restyle`

This makes the identity-bearing pieces independently revocable and auditable. All three are subject to consent requirements.

## Creator Video composite

A fully neural ATLAS Creator video is considered model-ready only when validated artifacts exist for:

- speech-to-text
- phoneme-recognition
- voice-synthesis
- facial-lipsync
- super-resolution
- video-restyle

The local DSP, editing, caption, timeline, look, subject and QC engines remain separate and can operate without these models.

## Commands

```bash
npm run atlas:neural-create -- status
npm run atlas:neural-create -- tasks
npm run atlas:neural-create -- plan creator-video
npm run atlas:neural-create -- plan digital-twin
npm run atlas:neural-create -- run JOB_ID
npm run atlas:neural-create -- run JOB_ID --apply
```

GPU status:

```bash
npm run atlas:gpu -- status
```

Trainer dependency check:

```bash
python3 atlas/trainers/creator_train.py --doctor
```

## Execution policy

Training is dry-run by default. `--apply` is required to start a real job. The GPU Executor verifies `nvidia-smi` and Python before execution. Neural Foundry remains the system of record for job state, datasets, recipes and model artifacts.

An artifact is not usable merely because training exits successfully. It must be registered with SHA-256 integrity, evaluation metrics and any required consent attestation, then promoted through Neural Foundry to `validated`.

## Current boundaries

The code can now plan and execute all seven ATLAS neural media tasks on a compatible NVIDIA node. The repository does not contain trained production weights. Cloudflare Workers are not GPU training nodes. A physical or rented NVIDIA machine with CUDA PyTorch, torchaudio, torchvision and Pillow is still required to create real checkpoints.
