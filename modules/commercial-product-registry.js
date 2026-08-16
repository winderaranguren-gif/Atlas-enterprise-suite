const PRODUCT_DEFINITIONS=Object.freeze([
 {id:'atlas-enterprise-suite',title:'ATLAS Enterprise Suite',category:'Business Management Software',image:'/assets/atlas-showcase-genesis.webp',description:'All-in-one business platform for finance, operations, HR, payroll, sales, inventory, documents, reporting and automation.'},
 {id:'atlas-accounting-finance',title:'ATLAS Accounting & Finance',category:'Accounting Software',image:'/assets/atlas-bg-002.webp',description:'General ledger, AP, AR, banking, reconciliation, cash flow, budgets, financial statements and reporting.'},
 {id:'atlas-payroll',title:'ATLAS Payroll',category:'Payroll Software',image:'/assets/atlas-bg-003.webp',description:'Payroll operations for employees, payments, deductions, taxes, history and reporting.'},
 {id:'atlas-hr',title:'ATLAS HR',category:'Human Resources Software',image:'/assets/atlas-bg-003.webp',description:'Recruiting, onboarding, employee records, attendance, performance, training and talent management.'},
 {id:'atlas-candidate-assessment',title:'ATLAS Candidate Assessment',category:'Recruitment Assessment',image:'/assets/atlas-bg-003.webp',description:'Role-based candidate assessments with technical questions, workplace scenarios, scoring and ranking.'},
 {id:'atlas-english-assessment',title:'ATLAS English Assessment',category:'Education Assessment',image:'/assets/atlas-bg-003.webp',description:'Professional English assessment covering comprehension, vocabulary, grammar and workplace communication.'},
 {id:'atlas-inventory',title:'ATLAS Inventory',category:'Inventory Management',image:'/assets/atlas-bg-005.webp',description:'Inventory, locations, movements, costs, stock alerts, adjustments and cycle counts in one workspace.'},
 {id:'atlas-sales',title:'ATLAS Sales',category:'Sales CRM',image:'/assets/atlas-scene-glass-bridge.webp',description:'Customers, opportunities, quotes, orders, commissions, pipeline tracking and sales performance.'},
 {id:'atlas-pos',title:'ATLAS POS',category:'Point of Sale',image:'/assets/atlas-showcase-genesis.webp',description:'Point of sale for products, orders, payments, employees, inventory, receipts and reporting.'},
 {id:'atlas-audit-compliance',title:'ATLAS Audit & Compliance',category:'Audit Compliance',image:'/assets/atlas-scene-glass-bridge.webp',description:'Audit trails, internal controls, permissions, evidence, risk monitoring and compliance workflows.'},
 {id:'atlas-document-studio',title:'ATLAS Document Studio',category:'Document Management',image:'/assets/atlas-bg-007.webp',description:'Create, organize, version, approve and manage business documents from one secure workspace.'},
 {id:'atlas-design-studio',title:'ATLAS Design Studio',category:'Design Software',image:'/assets/atlas-showcase-sign-premium.webp',description:'Integrated visual workspace for interfaces, web experiences, presentations and digital business assets.'},
 {id:'atlas-connect',title:'ATLAS Connect',category:'Communications',image:'/assets/atlas-cloud-network-bg-v1.webp',description:'Secure communication and collaboration layer connecting teams, users, services and devices.'},
 {id:'atlas-mail',title:'ATLAS Mail',category:'Business Email',image:'/assets/atlas-cloud-network-bg-v1.webp',description:'Business email workspace integrated with contacts, files, organization, security and automation.'},
 {id:'atlas-os',title:'ATLAS OS',category:'Operating System',image:'/assets/atlas-scene-indigo-orbit.webp',description:'Unified ATLAS operating experience for applications, files, services, devices and authorized automations.'},
 {id:'atlas-knowledge',title:'ATLAS Knowledge',category:'Knowledge Management',image:'/assets/atlas-bg-007.webp',description:'Knowledge, procedures, training, research and business documentation organized in one intelligent library.'},
 {id:'atlas-health',title:'ATLAS Health',category:'Health Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Digital health technology ecosystem for education, accessibility, operations, information and research support.'},
 {id:'atlas-smart-room',title:'ATLAS Smart Room',category:'Smart Healthcare',image:'/assets/atlas-showcase-hospitality-command.webp',description:'Smart-room operations for care environments including controls, multilingual assistance, inventory and service workflows.'},
 {id:'atlas-ridecare',title:'ATLAS RideCare',category:'Transportation Technology',image:'/assets/atlas-bg-004.webp',description:'Driver and vehicle workspace for trips, maintenance, expenses, income, mileage and operational reporting.'},
 {id:'atlas-gps-4d',title:'ATLAS GPS 4D',category:'Navigation Mapping',image:'/assets/atlas-scene-crystalline-city.webp',description:'Immersive navigation concept integrating routes, mapping, points of interest, traffic and spatial visualization.'},
 {id:'atlas-public-safety',title:'ATLAS Public Safety',category:'Public Safety Technology',image:'/assets/atlas-scene-crystalline-city.webp',description:'Operational awareness tools for maps, alerts, cameras, sensors and public-safety response coordination.'},
 {id:'atlas-cleanscan-3d',title:'ATLAS CleanScan 3D',category:'Inspection Technology',image:'/assets/atlas-scene-glass-bridge.webp',description:'Digital inspection and spatial workflow tools for measuring, documenting and analyzing physical environments.'},
 {id:'atlas-sign-language',title:'ATLAS Sign Language',category:'Accessibility Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Accessibility workspace designed to support sign-language interaction and more inclusive digital communication.'},
 {id:'atlas-creator',title:'ATLAS Creator',category:'Creative Software',image:'/assets/atlas-showcase-sign-premium.webp',description:'Creative workspace for digital content, media, campaigns, publishing and multimedia production.'},
 {id:'atlas-voice',title:'ATLAS Voice',category:'Voice Technology',image:'/assets/atlas-scene-indigo-orbit.webp',description:'Multilingual voice interface for natural-language interaction with authorized ATLAS functions and services.'},
 {id:'atlas-wallet',title:'ATLAS Wallet',category:'Financial Technology',image:'/assets/atlas-showcase-genesis.webp',description:'Digital wallet workspace for payment methods, transaction organization, receipts and compatible financial services.'},
 {id:'united-hands-hub',title:'United Hands Hub',category:'Nonprofit Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Community technology hub for nonprofit programs, volunteers, appointments, services, inventory and impact tracking.'},
 {id:'atlas-elevator-operations',title:'ATLAS Elevator Operations',category:'Field Service Management',image:'/assets/atlas-scene-glass-bridge.webp',description:'Field-service operations for elevator companies including service orders, inspections, maintenance and equipment history.'},
 {id:'atlas-hotel-hospitality',title:'ATLAS Hotel & Hospitality',category:'Hospitality Technology',image:'/assets/atlas-showcase-hospitality-command.webp',description:'Hotel operations connecting guest services, rooms, access, housekeeping, maintenance, food, catering and internal requests.'},
 {id:'atlas-global',title:'ATLAS Global',category:'Global Technology Platform',image:'/assets/atlas-showcase-sign-global.webp',description:'International ATLAS layer for country, language, culture, regional business information and localized digital services.'}
].map(item=>Object.freeze({...item,brand:item.id==='united-hands-hub'?'United Hands for Humanity':'ATLAS'})));

const OFFER_CANDIDATES=Object.freeze([
 ['atlas-enterprise-suite',299,249],['atlas-accounting-finance',99,79],['atlas-payroll',79,59],['atlas-hr',79,59],
 ['atlas-candidate-assessment',49,39],['atlas-english-assessment',29,19],['atlas-inventory',69,49],['atlas-sales',69,49],
 ['atlas-pos',49,39],['atlas-audit-compliance',99,79],['atlas-document-studio',29,19],['atlas-design-studio',39,29],
 ['atlas-connect',29,19],['atlas-mail',12,9],['atlas-os',19,14],['atlas-knowledge',19,14],['atlas-health',79,59],
 ['atlas-smart-room',499,399],['atlas-ridecare',29,19],['atlas-gps-4d',19,14],['atlas-public-safety',499,399],
 ['atlas-cleanscan-3d',79,59],['atlas-sign-language',49,39],['atlas-creator',39,29],['atlas-voice',19,14],
 ['atlas-wallet',0,0],['united-hands-hub',0,0],['atlas-elevator-operations',149,119],['atlas-hotel-hospitality',399,299],['atlas-global',499,399]
]);

const COMMERCIAL_OFFERS=Object.freeze(OFFER_CANDIDATES.map(([productId,listPrice,candidatePrice])=>Object.freeze({
 offerId:`${productId}-us-preview-monthly`,
 productId,
 market:'US',
 currency:'USD',
 billingBasis:productId==='united-hands-hub'?'community':'monthly',
 listPrice,
 candidatePrice,
 status:productId==='united-hands-hub'?'community':'preview',
 approvedForSale:false,
 priceAuthority:productId==='united-hands-hub'?'community-no-retail-sale':'source-controlled-candidate',
 effectiveFrom:null,
 effectiveTo:null,
 approvedAt:null,
 approvedBy:null,
 fulfillmentEvidence:[]
})));

const PRODUCTS_BY_ID=new Map(PRODUCT_DEFINITIONS.map(item=>[item.id,item]));
const OFFERS_BY_PRODUCT_ID=new Map(COMMERCIAL_OFFERS.map(item=>[item.productId,item]));

export function productDefinitions(){return PRODUCT_DEFINITIONS.map(item=>({...item}))}
export function commercialOffers(){return COMMERCIAL_OFFERS.map(item=>({...item,fulfillmentEvidence:[...item.fulfillmentEvidence]}))}
export function productDefinitionFor(id){const item=PRODUCTS_BY_ID.get(String(id||''));return item?{...item}:null}
export function commercialOfferFor(productId){const item=OFFERS_BY_PRODUCT_ID.get(String(productId||''));return item?{...item,fulfillmentEvidence:[...item.fulfillmentEvidence]}:null}
export function commercialRegistrySummary(){
 const counts=COMMERCIAL_OFFERS.reduce((acc,item)=>{acc[item.status]=(acc[item.status]||0)+1;return acc},{});
 return {schemaVersion:1,productCount:PRODUCT_DEFINITIONS.length,offerCount:COMMERCIAL_OFFERS.length,market:'US',currency:'USD',storage:'repository-source-controlled',dynamicAdmin:false,counts};
}

export {PRODUCT_DEFINITIONS,COMMERCIAL_OFFERS};
