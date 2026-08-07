#!/usr/bin/env node
'use strict';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const required = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID', 'ATLAS_GPS_DOMAIN', 'ATLAS_GPS_ORIGIN_IPV4'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length && !dryRun) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(64);
}

const token = process.env.CLOUDFLARE_API_TOKEN || 'DRY_RUN_TOKEN';
const zoneId = process.env.CLOUDFLARE_ZONE_ID || 'DRY_RUN_ZONE';
const domain = process.env.ATLAS_GPS_DOMAIN || 'atlas.example.com';
const origin = process.env.ATLAS_GPS_ORIGIN_IPV4 || '203.0.113.10';
const apiBase = 'https://api.cloudflare.com/client/v4';
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const records = [
  { type: 'A', name: `maps.${domain}`, content: origin, proxied: true, ttl: 1 },
  { type: 'A', name: `gps-api.${domain}`, content: origin, proxied: true, ttl: 1 },
  { type: 'A', name: `offline.${domain}`, content: origin, proxied: true, ttl: 1 },
  { type: 'A', name: `telemetry.${domain}`, content: origin, proxied: true, ttl: 1 }
];

async function request(path, options = {}) {
  const target = `${apiBase}${path}`;
  const method = options.method || 'GET';
  const body = options.body ? JSON.stringify(options.body) : undefined;
  if (dryRun) {
    console.log(`[dry-run] ${method} ${target}${body ? ` ${body}` : ''}`);
    return { success: true, result: [] };
  }
  const response = await fetch(target, { method, headers, body });
  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload;
}

async function upsertRecord(record) {
  const lookup = await request(`/zones/${zoneId}/dns_records?type=${record.type}&name=${encodeURIComponent(record.name)}`);
  const current = lookup.result?.[0];
  if (current) {
    await request(`/zones/${zoneId}/dns_records/${current.id}`, { method: 'PUT', body: record });
    console.log(`Updated ${record.name}`);
    return;
  }
  await request(`/zones/${zoneId}/dns_records`, { method: 'POST', body: record });
  console.log(`Created ${record.name}`);
}

async function setZoneSetting(setting, value) {
  await request(`/zones/${zoneId}/settings/${setting}`, { method: 'PATCH', body: { value } });
  console.log(`Set ${setting}=${value}`);
}

async function main() {
  for (const record of records) await upsertRecord(record);
  await setZoneSetting('ssl', 'strict');
  await setZoneSetting('always_use_https', 'on');
  await setZoneSetting('automatic_https_rewrites', 'on');
  await setZoneSetting('min_tls_version', '1.2');
  await request(`/zones/${zoneId}/dnssec`, { method: 'PATCH', body: { status: 'active' } });
  console.log('DNSSEC activation requested. Confirm the resulting DS record at the registrar when required.');
  console.log('ATLAS GPS DNS/TLS provisioning completed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
