import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const required = ['package.json','atlas.config.json','public/index.html','public/styles.css','public/app.js','public/manifest.webmanifest','public/sw.js','public/_headers','public/_redirects'];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`);
}
const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const cfg = JSON.parse(fs.readFileSync(path.join(root,'atlas.config.json'),'utf8'));
if (pkg.version !== cfg.version) throw new Error('Version mismatch between package.json and atlas.config.json');
if (cfg.contact !== 'atlashealthfrontiers@gmail.com') throw new Error('Operational contact mismatch');
if (!Array.isArray(cfg.modules) || cfg.modules.length < 20) throw new Error('Module registry is incomplete');
const app = fs.readFileSync(path.join(root,'public/app.js'),'utf8');
new Function(app);
console.log(`ATLAS validation passed: v${cfg.version}, ${cfg.modules.length} modules, ${cfg.regions.length} regions.`);
