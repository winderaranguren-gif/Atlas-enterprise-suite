import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {handlePublicDashboardHome} from '../modules/public-dashboard-home.js';
import {handlePublicSite} from '../modules/public-site-worker.js';

function request(path,method='GET'){
  return new Request(`https://www.atlasenterprisesuite.com${path}`,{method});
}

function route(path,method='GET'){
  const req=request(path,method);
  return handlePublicDashboardHome(req)||handlePublicSite(req);
}

async function page(path){
  const response=route(path);
  assert.ok(response instanceof Response,`${path} must be handled by the public site`);
  assert.equal(response.status,200,`${path} must return 200`);
  const html=await response.text();
  assert.match(html,/<!doctype html>/i,`${path} must be a complete HTML document`);
  assert.match(html,/<main id="content">/i,`${path} must expose a keyboard skip target`);
  assert.match(html,/ATLAS Enterprise Suite/i,`${path} must carry ATLAS product identity`);
  assert.match(response.headers.get('content-security-policy')||'',/frame-ancestors 'none'/,`${path} must set clickjacking protection`);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  return {response,html};
}

const publicPaths=['/','/product','/solutions','/trust','/contact','/privacy','/terms','/accessibility','/status'];
for(const path of publicPaths)await page(path);

const home=await page('/');
assert.match(home.html,/One platform\./i);
assert.match(home.html,/Every solution\./i);
assert.match(home.html,/Total control\./i);
assert.match(home.html,/Public preview outside\./i);
assert.match(home.html,/Authorized modules inside\./i);
assert.match(home.html,/Preview only\. Module access begins after sign-in and authorization\./i);
assert.match(home.html,/href="\/identity"/i,'public home must provide a deliberate sign-in transition');
assert.match(home.html,/Accounting/i,'public home may visually preview module names');
assert.match(home.html,/Connect data/i,'business metrics must remain unpopulated before authorized data is connected');
assert.match(home.html,/ATLAS Design Library/i,'public home must identify curated visual assets as design-library concepts');
assert.match(home.html,/\/assets\/atlas-orlando-dashboard\.webp/i,'public home must use the curated Orlando visual');
assert.match(home.html,/\/assets\/atlas-enterprise-dashboard\.webp/i,'public home must use the curated enterprise visual');
assert.match(home.html,/\/assets\/atlas-finance-command\.webp/i,'public home must use the curated finance visual');
assert.match(home.html,/\/assets\/atlas-product-ecosystem\.webp/i,'public home must use the curated ecosystem visual');
assert.doesNotMatch(home.html,/href="#"/i,'public home must not contain empty hash navigation');
assert.doesNotMatch(home.html,/href="\/(finance|hr|operations|ride|wallet|studio|workbench|browser)"/i,'public home must not expose application modules as active links');
assert.doesNotMatch(home.html,/System Administrator/i,'public home must not expose an administrator persona');
assert.doesNotMatch(home.html,/\$2\.45M|1,248|99\.98%|98% compliance/i,'public home must not expose decorative operational metrics');
assert.doesNotMatch(home.html,/LIVE WEATHER|● LIVE/i,'public home must not manufacture live state');

const visualAssets=[
  'public/assets/atlas-orlando-dashboard.webp',
  'public/assets/atlas-enterprise-dashboard.webp',
  'public/assets/atlas-finance-command.webp',
  'public/assets/atlas-product-ecosystem.webp'
];
for(const asset of visualAssets){
  assert.ok(existsSync(asset),`${asset} must exist in the repository-owned public asset bundle`);
  assert.ok(statSync(asset).size>1000,`${asset} must contain a non-empty web image`);
}

const headHome=route('/','HEAD');
assert.equal(headHome.status,200);
assert.equal(await headHome.text(),'','HEAD / must not return a response body');

const app=handlePublicSite(request('/app'));
assert.ok(app instanceof Response,'/app must remain owned by public routing for backwards compatibility');
assert.equal(app.status,307,'/app must preserve the existing application entry through a temporary redirect');
assert.equal(app.headers.get('location'),'/dashboard');

const robots=handlePublicSite(request('/robots.txt'));
assert.equal(robots.status,200);
const robotsText=await robots.text();
assert.match(robotsText,/Disallow: \/dashboard/);
assert.match(robotsText,/Disallow: \/api\//);
assert.match(robotsText,/sitemap\.xml/);

const sitemap=handlePublicSite(request('/sitemap.xml'));
assert.equal(sitemap.status,200);
const sitemapText=await sitemap.text();
assert.match(sitemapText,/https:\/\/www\.atlasenterprisesuite\.com\/product/);
assert.doesNotMatch(sitemapText,/\/dashboard/,'application dashboard must never enter the public sitemap');

const unknown=route('/definitely-not-a-public-route');
assert.equal(unknown,null,'unknown paths must fall through to the existing ATLAS router');

const postHome=route('/','POST');
assert.equal(postHome.status,405,'public home must reject writes');
assert.equal(postHome.headers.get('allow'),'GET, HEAD');

const trust=await page('/trust');
assert.match(trust.html,/does not claim a certification/i,'Trust Center must explicitly avoid unverified certification claims');

const status=await page('/status');
assert.match(status.html,/not configured/i,'Status page must fail honestly when a unified health feed is absent');
assert.doesNotMatch(status.html,/99\.9|100% operational/i,'Status page must not invent uptime');

console.log(`ATLAS public website validation passed: ${publicPaths.length} pages + routed visual home, Design Library assets, SEO, trust, status and anti-fake-state gates.`);
