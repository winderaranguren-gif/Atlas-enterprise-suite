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

const productPaths=['/product/hr','/product/payroll','/product/finance','/product/erp','/product/pay','/product/health','/product/education','/product/analytics','/product/connect','/product/documents','/product/knowledge','/product/security','/product/identity','/product/projects','/product/studio','/product/workbench','/product/ride','/product/global'];
for(const path of productPaths){
  const result=await page(path);
  assert.match(result.html,new RegExp(`<link rel="canonical" href="https://www\\.atlasenterprisesuite\\.com${path.replaceAll('/','\\/')}"`,'i'),`${path} must expose a canonical URL`);
  assert.match(result.html,/meta property="og:title"/i,`${path} must expose Open Graph metadata`);
  assert.match(result.html,/twitter:card/i,`${path} must expose Twitter card metadata`);
  assert.match(result.html,/itemtype="https:\/\/schema\.org\/SoftwareApplication"/i,`${path} must expose software application semantics`);
  assert.match(result.html,/Access through ATLAS Identity/i,`${path} must preserve the application access boundary`);
}

const solutionPaths=['/solutions/operations','/solutions/financial-workflows','/solutions/workforce','/solutions/healthcare','/solutions/mobility','/solutions/connectivity'];
for(const path of solutionPaths)await page(path);

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

const productIndex=await page('/product');
assert.match(productIndex.html,/href="\/product\/finance"/i,'product index must link to indexable Finance landing page');
assert.match(productIndex.html,/href="\/product\/connect"/i,'product index must link to indexable Connect landing page');
assert.doesNotMatch(productIndex.html,/href="\/finance"/i,'public product index must not jump directly into protected Finance application routes');

const connect=await page('/product/connect');
assert.match(connect.html,/ATLAS Connect/i);
assert.match(connect.html,/Network Fabric/i,'Connect product page must expose Network Fabric');
assert.match(connect.html,/Device Registry/i,'Connect product page must expose Device Registry');
assert.match(connect.html,/Verizon/i,'Connect product page may describe Verizon as a supported provider category without claiming a live connection');
assert.doesNotMatch(connect.html,/Verizon\s+(is\s+)?connected|Verizon\s+status\s*:\s*connected|Verizon\s+online/i,'Connect public page must not claim Verizon is connected');

const connectivity=await page('/solutions/connectivity');
assert.match(connectivity.html,/carrier-neutral/i,'connectivity solution must describe the provider-neutral architecture');
assert.match(connectivity.html,/fail closed/i,'connectivity solution must preserve fail-closed routing language');
assert.match(connectivity.html,/provider-verified/i,'connectivity solution must require verified provider state');

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

const headProduct=route('/product/connect','HEAD');
assert.equal(headProduct.status,200);
assert.equal(await headProduct.text(),'','HEAD product route must not return a response body');

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
assert.match(sitemapText,/https:\/\/www\.atlasenterprisesuite\.com\/product\/finance/,'Finance SEO page must enter the sitemap');
assert.match(sitemapText,/https:\/\/www\.atlasenterprisesuite\.com\/product\/connect/,'Connect SEO page must enter the sitemap');
assert.match(sitemapText,/https:\/\/www\.atlasenterprisesuite\.com\/solutions\/connectivity/,'Connectivity solution must enter the sitemap');
assert.match(sitemapText,/<lastmod>2026-08-22<\/lastmod>/,'sitemap must expose an explicit freshness date for this release');
assert.doesNotMatch(sitemapText,/\/dashboard/,'application dashboard must never enter the public sitemap');
assert.doesNotMatch(sitemapText,/\/api\//,'API routes must never enter the public sitemap');

const unknown=route('/definitely-not-a-public-route');
assert.equal(unknown,null,'unknown paths must fall through to the existing ATLAS router');

const postHome=route('/','POST');
assert.equal(postHome.status,405,'public home must reject writes');
assert.equal(postHome.headers.get('allow'),'GET, HEAD');

const postProduct=route('/product/connect','POST');
assert.equal(postProduct.status,405,'public product SEO pages must reject writes');
assert.equal(postProduct.headers.get('allow'),'GET, HEAD');

const trust=await page('/trust');
assert.match(trust.html,/does not claim a certification/i,'Trust Center must explicitly avoid unverified certification claims');

const status=await page('/status');
assert.match(status.html,/not configured/i,'Status page must fail honestly when a unified health feed is absent');
assert.doesNotMatch(status.html,/99\.9|100% operational/i,'Status page must not invent uptime');

console.log(`ATLAS public website validation passed: ${publicPaths.length} core pages, ${productPaths.length} product SEO pages, ${solutionPaths.length} solution pages, routed visual home, sitemap, metadata, trust, status and anti-fake-state gates.`);
