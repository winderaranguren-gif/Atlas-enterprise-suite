import fs from 'node:fs';

const moduleSource=fs.readFileSync(new URL('../modules/financial-intelligence.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../worker-meta.js',import.meta.url),'utf8');

const need=(source,text,label)=>{if(!source.includes(text))throw new Error(`financial_intelligence_validation_failed:${label}`)};
need(worker,"import { financialIntelligenceRoutes } from './modules/financial-intelligence.js';",'worker_import');
need(worker,'await financialIntelligenceRoutes(request,env,url)','worker_route');
need(moduleSource,"url.pathname==='/platform/finance/intelligence'",'canonical_route');
need(moduleSource,"url.pathname==='/platform/financial-intelligence'",'alias_route');
need(moduleSource,"url.pathname==='/api/finance/intelligence/summary'",'summary_api');
need(moduleSource,"requireTenantPermission(request,env,'module.read'",'tenant_permission');
need(moduleSource,'ensureFinanceSchema(env)','finance_schema');
need(moduleSource,'ensureFinanceAdvancedSchema(env)','advanced_schema');
need(moduleSource,"fetch('/api/finance/intelligence/summary'",'same_origin_data_fetch');
need(moduleSource,'Exportar CSV','csv_export');
need(moduleSource,'Clima en vivo no conectado','weather_truth_state');
need(moduleSource,'Los valores aparecen únicamente cuando existen datos reales','no_fake_data_copy');
need(moduleSource,'@media(max-width:900px)','mobile_breakpoint');
need(moduleSource,'@media(max-width:560px)','small_mobile_breakpoint');
need(moduleSource,'/platform/finance/accounts-receivable','ar_navigation');
need(moduleSource,'/platform/finance/accounts-payable','ap_navigation');
need(moduleSource,'/platform/finance/budgets','budget_navigation');
need(moduleSource,'/platform/finance/banking','banking_navigation');

const forbidden=['$ 2,450,000','$2,450,000','$ 1,120,000','$1,120,000','$ 8,750,000','$8,750,000','$ 4,250,000','$4,250,000'];
for(const value of forbidden)if(moduleSource.includes(value))throw new Error(`financial_intelligence_validation_failed:hardcoded_demo_metric:${value}`);
if(/href=["']#["']/.test(moduleSource))throw new Error('financial_intelligence_validation_failed:fake_hash_navigation');
if(/https?:\/\//.test(moduleSource.replace(/https?:\/\/localhost/g,'')))throw new Error('financial_intelligence_validation_failed:external_runtime_dependency');
if(/getUserMedia\s*\(/.test(moduleSource)||/navigator\.mediaDevices/.test(moduleSource))throw new Error('financial_intelligence_validation_failed:unexpected_device_capture');

console.log('ATLAS Financial Intelligence validation passed');
