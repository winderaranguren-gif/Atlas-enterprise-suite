export const ATLAS_MODULE_REGISTRY = [
  {
    id: 'identity',
    name: 'Identity & Access',
    layer: 'core',
    order: 10,
    modulePath: 'modules/identity',
    dependsOn: [],
    serves: ['all']
  },
  {
    id: 'connectivity',
    name: 'Connectivity',
    layer: 'platform',
    order: 20,
    modulePath: 'modules/connectivity',
    dependsOn: ['identity'],
    serves: ['all']
  },
  {
    id: 'backups',
    name: 'Backups & Recovery',
    layer: 'platform',
    order: 30,
    modulePath: 'modules/backups',
    dependsOn: ['identity'],
    serves: ['all']
  },
  {
    id: 'documents',
    name: 'Documents',
    layer: 'shared-services',
    order: 40,
    modulePath: 'modules/documents',
    dependsOn: ['identity'],
    serves: ['accounting','crm','intelligence']
  },
  {
    id: 'accounting',
    name: 'Accounting & Finance',
    layer: 'business',
    domain: 'finance',
    order: 100,
    modulePath: 'modules/accounting',
    dependsOn: ['identity','documents'],
    serves: ['analytics','intelligence']
  },
  {
    id: 'analytics',
    name: 'Data Analytics',
    layer: 'business-capability',
    domain: 'finance',
    parent: 'accounting',
    order: 110,
    modulePath: 'modules/analytics',
    dependsOn: ['identity','accounting'],
    serves: ['accounting','crm','intelligence','live-commerce']
  },
  {
    id: 'crm',
    name: 'CRM',
    layer: 'business',
    domain: 'customer',
    order: 200,
    modulePath: 'modules/crm',
    dependsOn: ['identity','documents'],
    serves: ['analytics','intelligence','live-commerce']
  },
  {
    id: 'live-commerce',
    name: 'ATLAS Live Commerce & Investor Studio',
    layer: 'business',
    domain: 'commerce',
    order: 300,
    modulePath: 'modules/live-commerce',
    dependsOn: ['identity','connectivity','crm','analytics'],
    serves: ['intelligence']
  },
  {
    id: 'intelligence',
    name: 'ATLAS Intelligence',
    layer: 'cross-cutting',
    order: 900,
    modulePath: 'modules/intelligence',
    dependsOn: ['identity'],
    consumes: ['accounting','analytics','crm','documents','connectivity','live-commerce'],
    serves: ['all']
  }
];

export function orderedAtlasModules(){
  return [...ATLAS_MODULE_REGISTRY].sort((a,b)=>a.order-b.order);
}

export function atlasModuleById(id){
  return ATLAS_MODULE_REGISTRY.find(module=>module.id===id)||null;
}
