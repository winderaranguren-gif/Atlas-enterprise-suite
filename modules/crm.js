import { enabled, json } from './crm-shared.js';
import { listAccounts,createAccount,patchAccount } from './crm-accounts.js';
import { listContacts,createContact } from './crm-contacts.js';
import { patchContact } from './crm-contact-update.js';
import { listLeads,createLead } from './crm-leads.js';
import { patchLead,scoreLead } from './crm-lead-update.js';
import { convertLead } from './crm-lead-convert.js';
import { listStages,createStage } from './crm-stages.js';
import { listOpportunities,createOpportunity } from './crm-opportunities.js';
import { patchOpportunity } from './crm-opportunity-update.js';
import { pipeline } from './crm-pipeline.js';
import { listActivities,createActivity } from './crm-activities.js';
import { patchActivity } from './crm-activity-update.js';
import { listQuotes,createQuote } from './crm-quotes.js';
import { patchQuote } from './crm-quote-update.js';
import { listCommunications,logCommunication } from './crm-communications.js';
import { listRules,createRule } from './crm-automations.js';
import { runRules } from './crm-rule-runner.js';
import { dashboard } from './crm-dashboard.js';
import { globalSearch } from './crm-search.js';

export async function crmRoutes(request,env,url=new URL(request.url)){
  if(!url.pathname.startsWith('/api/crm'))return null;
  if(url.pathname==='/api/crm/status'&&request.method==='GET')return json({ok:true,module:'crm',version:'1.0.0',enabled:enabled(env),database:env.DB?'configured':'unconfigured'});
  if(!enabled(env))return json({ok:false,error:'crm_disabled'},503);
  if(!env.DB)return json({ok:false,error:'identity_database_unavailable'},503);
  const routes={
    'GET /api/crm/dashboard':()=>dashboard(request,env),
    'GET /api/crm/pipeline':()=>pipeline(request,env),
    'GET /api/crm/search':()=>globalSearch(request,env,url),
    'GET /api/crm/accounts':()=>listAccounts(request,env,url),'POST /api/crm/accounts':()=>createAccount(request,env),
    'GET /api/crm/contacts':()=>listContacts(request,env,url),'POST /api/crm/contacts':()=>createContact(request,env),
    'GET /api/crm/leads':()=>listLeads(request,env,url),'POST /api/crm/leads':()=>createLead(request,env),
    'GET /api/crm/stages':()=>listStages(request,env),'POST /api/crm/stages':()=>createStage(request,env),
    'GET /api/crm/opportunities':()=>listOpportunities(request,env,url),'POST /api/crm/opportunities':()=>createOpportunity(request,env),
    'GET /api/crm/activities':()=>listActivities(request,env,url),'POST /api/crm/activities':()=>createActivity(request,env),
    'GET /api/crm/quotes':()=>listQuotes(request,env,url),'POST /api/crm/quotes':()=>createQuote(request,env),
    'GET /api/crm/communications':()=>listCommunications(request,env,url),'POST /api/crm/communications':()=>logCommunication(request,env),
    'GET /api/crm/automations':()=>listRules(request,env),'POST /api/crm/automations':()=>createRule(request,env),
    'POST /api/crm/automations/run':()=>runRules(request,env)
  };
  const exact=routes[`${request.method} ${url.pathname}`]; if(exact)return exact();
  let match=url.pathname.match(/^\/api\/crm\/accounts\/([^/]+)$/); if(match&&request.method==='PATCH')return patchAccount(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/contacts\/([^/]+)$/); if(match&&request.method==='PATCH')return patchContact(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/leads\/([^/]+)$/); if(match&&request.method==='PATCH')return patchLead(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/score$/); if(match&&request.method==='POST')return scoreLead(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/leads\/([^/]+)\/convert$/); if(match&&request.method==='POST')return convertLead(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/opportunities\/([^/]+)$/); if(match&&request.method==='PATCH')return patchOpportunity(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/activities\/([^/]+)$/); if(match&&request.method==='PATCH')return patchActivity(request,env,decodeURIComponent(match[1]));
  match=url.pathname.match(/^\/api\/crm\/quotes\/([^/]+)$/); if(match&&request.method==='PATCH')return patchQuote(request,env,decodeURIComponent(match[1]));
  return json({ok:false,error:'crm_route_not_found'},404);
}
