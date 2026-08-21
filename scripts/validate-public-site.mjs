import assert from 'node:assert/strict';
import {handlePublicSite} from '../modules/public-site-worker.js';

function request(path,method='GET'){
  return new Request(`https://www.atlasenterprisesuite.com${path}`,{method});
}

async function page(path){
  const response=handlePublicSite(request(path));
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
assert.match(home.html,/Run the work\./);
assert.match(home.html,/Public website outside\. Enterprise workspace inside\./);
assert.match(home.html,/href="\/app"/);
assert.doesNotMatch(home.html,/System Administrator/i,'public home must not expose an administrator persona');
assert.doesNotMatch(home.html,/1,248|99\.98%|98% compliance/i,'public home must not expose decorative operational metrics');
assert.doesNotMatch(home.html,/LIVE WEATHER|● LIVE/i,'public home must not manufacture live state');

const app=handlePublicSite(request('/app'));
assert.ok(app instanceof Response,'/app must be owned by public routing');
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

const unknown=handlePublicSite(request('/definitely-not-a-public-route'));
assert.equal(unknown,null,'unknown paths must fall through to the existing ATLAS router');

const postHome=handlePublicSite(request('/','POST'));
assert.equal(postHome.status,405,'public informational routes must reject writes');
assert.equal(postHome.headers.get('allow'),'GET, HEAD');

const trust=await page('/trust');
assert.match(trust.html,/does not claim a certification/i,'Trust Center must explicitly avoid unverified certification claims');

const status=await page('/status');
assert.match(status.html,/not configured/i,'Status page must fail honestly when a unified health feed is absent');
assert.doesNotMatch(status.html,/99\.9|100% operational/i,'Status page must not invent uptime');

console.log(`ATLAS public website validation passed: ${publicPaths.length} pages + routing, SEO, trust, status and anti-fake-state gates.`);
