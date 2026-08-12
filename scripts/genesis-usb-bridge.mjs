#!/usr/bin/env node
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const VERSION = 1;
const DIRECTORY = '.atlas-genesis';
const KEY_FILE = 'genesis-key.json';
const KDF_ITERATIONS = 600_000;

function usage() {
  console.log(`ATLAS Genesis USB Bridge\n\nUsage:\n  node scripts/genesis-usb-bridge.mjs init <usb-mount-path>\n  node scripts/genesis-usb-bridge.mjs verify <usb-mount-path>\n  node scripts/genesis-usb-bridge.mjs fingerprint <usb-mount-path>\n\nThe bridge never exports or copies a WebAuthn/passkey credential.\nIt stores only an ATLAS Genesis secret encrypted with AES-256-GCM.`);
}

function targetFile(mountPath) {
  return path.join(path.resolve(mountPath), DIRECTORY, KEY_FILE);
}

async function assertMountExists(mountPath) {
  await access(path.resolve(mountPath));
}

async function readSecret(promptText) {
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    const line = await new Promise(resolve => rl.once('line', resolve));
    rl.close();
    return String(line ?? '');
  }

  return await new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';
    stdout.write(promptText);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const onData = key => {
      if (key === '\u0003') {
        cleanup();
        reject(new Error('cancelled'));
      } else if (key === '\r' || key === '\n') {
        cleanup();
        resolve(value);
      } else if (key === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += key;
      }
    };

    stdin.on('data', onData);
  });
}

function deriveKey(passphrase, salt, iterations = KDF_ITERATIONS) {
  return pbkdf2Sync(passphrase, salt, iterations, 32, 'sha256');
}

function encryptSecret(secret, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(passphrase, salt);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    iterations: KDF_ITERATIONS,
  };
}

function decryptSecret(envelope, passphrase) {
  const salt = Buffer.from(envelope.salt, 'base64');
  const iv = Buffer.from(envelope.iv, 'base64');
  const tag = Buffer.from(envelope.tag, 'base64');
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  const key = deriveKey(passphrase, salt, envelope.iterations);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function fingerprint(secret) {
  return createHash('sha256').update(secret).digest('hex').slice(0, 24).toUpperCase();
}

async function init(mountPath) {
  await assertMountExists(mountPath);
  const file = targetFile(mountPath);
  try {
    await access(file);
    throw new Error(`Genesis key already exists at ${file}. Refusing to overwrite it.`);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const passphrase = await readSecret('Create Genesis USB passphrase: ');
  if (passphrase.length < 12) throw new Error('Passphrase must contain at least 12 characters.');
  const confirm = await readSecret('Confirm passphrase: ');
  if (confirm !== passphrase) throw new Error('Passphrases do not match.');

  const secret = randomBytes(32);
  const envelope = encryptSecret(secret, passphrase);
  const payload = {
    format: 'atlas-genesis-usb',
    version: VERSION,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    cipher: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    ...envelope,
  };

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  console.log(`Genesis USB initialized.\nFile: ${file}\nFingerprint: ${fingerprint(secret)}`);
}

async function unlock(mountPath) {
  await assertMountExists(mountPath);
  const file = targetFile(mountPath);
  const payload = JSON.parse(await readFile(file, 'utf8'));
  if (payload.format !== 'atlas-genesis-usb' || payload.version !== VERSION) {
    throw new Error('Unsupported or invalid ATLAS Genesis USB format.');
  }
  const passphrase = await readSecret('Genesis USB passphrase: ');
  const secret = decryptSecret(payload, passphrase);
  if (secret.length !== 32) throw new Error('Invalid Genesis secret length.');
  return { payload, secret, file };
}

async function verify(mountPath) {
  const { payload, secret } = await unlock(mountPath);
  console.log(`Genesis USB verified.\nID: ${payload.id}\nFingerprint: ${fingerprint(secret)}`);
}

async function showFingerprint(mountPath) {
  const { secret } = await unlock(mountPath);
  console.log(fingerprint(secret));
}

const [, , command, mountPath] = process.argv;
if (!command || !mountPath || !['init', 'verify', 'fingerprint'].includes(command)) {
  usage();
  process.exitCode = 2;
} else {
  try {
    if (command === 'init') await init(mountPath);
    if (command === 'verify') await verify(mountPath);
    if (command === 'fingerprint') await showFingerprint(mountPath);
  } catch (error) {
    console.error(`Genesis USB Bridge error: ${error.message}`);
    process.exitCode = 1;
  }
}
