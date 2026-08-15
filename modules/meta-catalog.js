const ORIGIN='https://atlasenterprisesuite.com';

const CATALOG=[
 {id:'atlas-enterprise-suite',title:'ATLAS Enterprise Suite',price:299,sale:249,category:'Business Management Software',image:'/assets/atlas-showcase-genesis.webp',description:'All-in-one business platform for finance, operations, HR, payroll, sales, inventory, documents, reporting and automation.'},
 {id:'atlas-accounting-finance',title:'ATLAS Accounting & Finance',price:99,sale:79,category:'Accounting Software',image:'/assets/atlas-bg-002.webp',description:'General ledger, AP, AR, banking, reconciliation, cash flow, budgets, financial statements and reporting.'},
 {id:'atlas-payroll',title:'ATLAS Payroll',price:79,sale:59,category:'Payroll Software',image:'/assets/atlas-bg-003.webp',description:'Payroll operations for employees, payments, deductions, taxes, history and reporting.'},
 {id:'atlas-hr',title:'ATLAS HR',price:79,sale:59,category:'Human Resources Software',image:'/assets/atlas-bg-003.webp',description:'Recruiting, onboarding, employee records, attendance, performance, training and talent management.'},
 {id:'atlas-candidate-assessment',title:'ATLAS Candidate Assessment',price:49,sale:39,category:'Recruitment Assessment',image:'/assets/atlas-bg-003.webp',description:'Role-based candidate assessments with technical questions, workplace scenarios, scoring and ranking.'},
 {id:'atlas-english-assessment',title:'ATLAS English Assessment',price:29,sale:19,category:'Education Assessment',image:'/assets/atlas-bg-003.webp',description:'Professional English assessment covering comprehension, vocabulary, grammar and workplace communication.'},
 {id:'atlas-inventory',title:'ATLAS Inventory',price:69,sale:49,category:'Inventory Management',image:'/assets/atlas-bg-005.webp',description:'Inventory, locations, movements, costs, stock alerts, adjustments and cycle counts in one workspace.'},
 {id:'atlas-sales',title:'ATLAS Sales',price:69,sale:49,category:'Sales CRM',image:'/assets/atlas-scene-glass-bridge.webp',description:'Customers, opportunities, quotes, orders, commissions, pipeline tracking and sales performance.'},
 {id:'atlas-pos',title:'ATLAS POS',price:49,sale:39,category:'Point of Sale',image:'/assets/atlas-showcase-genesis.webp',description:'Point of sale for products, orders, payments, employees, inventory, receipts and reporting.'},
 {id:'atlas-audit-compliance',title:'ATLAS Audit & Compliance',price:99,sale:79,category:'Audit Compliance',image:'/assets/atlas-scene-glass-bridge.webp',description:'Audit trails, internal controls, permissions, evidence, risk monitoring and compliance workflows.'},
 {id:'atlas-document-studio',title:'ATLAS Document Studio',price:29,sale:19,category:'Document Management',image:'/assets/atlas-bg-007.webp',description:'Create, organize, version, approve and manage business documents from one secure workspace.'},
 {id:'atlas-design-studio',title:'ATLAS Design Studio',price:39,sale:29,category:'Design Software',image:'/assets/atlas-showcase-sign-premium.webp',description:'Integrated visual workspace for interfaces, web experiences, presentations and digital business assets.'},
 {id:'atlas-connect',title:'ATLAS Connect',price:29,sale:19,category:'Communications',image:'/assets/atlas-cloud-network-bg-v1.webp',description:'Secure communication and collaboration layer connecting teams, users, services and devices.'},
 {id:'atlas-mail',title:'ATLAS Mail',price:12,sale:9,category:'Business Email',image:'/assets/atlas-cloud-network-bg-v1.webp',description:'Business email workspace integrated with contacts, files, organization, security and automation. Price per user/month.'},
 {id:'atlas-os',title:'ATLAS OS',price:19,sale:14,category:'Operating System',image:'/assets/atlas-scene-indigo-orbit.webp',description:'Unified ATLAS operating experience for applications, files, services, devices and authorized automations.'},
 {id:'atlas-knowledge',title:'ATLAS Knowledge',price:19,sale:14,category:'Knowledge Management',image:'/assets/atlas-bg-007.webp',description:'Knowledge, procedures, training, research and business documentation organized in one intelligent library.'},
 {id:'atlas-health',title:'ATLAS Health',price:79,sale:59,category:'Health Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Digital health technology ecosystem for education, accessibility, operations, information and research support.'},
 {id:'atlas-smart-room',title:'ATLAS Smart Room',price:499,sale:399,category:'Smart Healthcare',image:'/assets/atlas-showcase-hospitality-command.webp',description:'Smart-room operations for care environments including controls, multilingual assistance, inventory and service workflows.'},
 {id:'atlas-ridecare',title:'ATLAS RideCare',price:29,sale:19,category:'Transportation Technology',image:'/assets/atlas-bg-004.webp',description:'Driver and vehicle workspace for trips, maintenance, expenses, income, mileage and operational reporting.'},
 {id:'atlas-gps-4d',title:'ATLAS GPS 4D',price:19,sale:14,category:'Navigation Mapping',image:'/assets/atlas-scene-crystalline-city.webp',description:'Immersive navigation concept integrating routes, mapping, points of interest, traffic and spatial visualization.'},
 {id:'atlas-public-safety',title:'ATLAS Public Safety',price:499,sale:399,category:'Public Safety Technology',image:'/assets/atlas-scene-crystalline-city.webp',description:'Operational awareness tools for maps, alerts, cameras, sensors and public-safety response coordination.'},
 {id:'atlas-cleanscan-3d',title:'ATLAS CleanScan 3D',price:79,sale:59,category:'Inspection Technology',image:'/assets/atlas-scene-glass-bridge.webp',description:'Digital inspection and spatial workflow tools for measuring, documenting and analyzing physical environments.'},
 {id:'atlas-sign-language',title:'ATLAS Sign Language',price:49,sale:39,category:'Accessibility Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Accessibility workspace designed to support sign-language interaction and more inclusive digital communication.'},
 {id:'atlas-creator',title:'ATLAS Creator',price:39,sale:29,category:'Creative Software',image:'/assets/atlas-showcase-sign-premium.webp',description:'Creative workspace for digital content, media, campaigns, publishing and multimedia production.'},
 {id:'atlas-voice',title:'ATLAS Voice',price:19,sale:14,category:'Voice Technology',image:'/assets/atlas-scene-indigo-orbit.webp',description:'Multilingual voice interface for natural-language interaction with authorized ATLAS functions and services.'},
 {id:'atlas-wallet',title:'ATLAS Wallet',price:0,sale:0,category:'Financial Technology',image:'/assets/atlas-showcase-genesis.webp',description:'Digital wallet workspace for payment methods, transaction organization, receipts and compatible financial services.'},
 {id:'united-hands-hub',title:'United Hands Hub',price:0,sale:0,category:'Nonprofit Technology',image:'/assets/atlas-showcase-sign-human-future.webp',description:'Community technology hub for nonprofit programs, volunteers, appointments, services, inventory and impact tracking.'},
 {id:'atlas-elevator-operations',title:'ATLAS Elevator Operations',price:149,sale:119,category:'Field Service Management',image:'/assets/atlas-scene-glass-bridge.webp',description:'Field-service operations for elevator companies including service orders, inspections, maintenance and equipment history.'},
 {id:'atlas-hotel-hospitality',title:'ATLAS Hotel & Hospitality',price:399,sale:299,category:'Hospitality Technology',image:'/assets/atlas-showcase-hospitality-command.webp',description:'Hotel operations connecting guest services, rooms, access, housekeeping, maintenance, food, catering and internal requests.'},
 {id:'atlas-global',title:'ATLAS Global',price:499,sale:399,category:'Global Technology Platform',image:'/assets/atlas-showcase-sign-global.webp',description:'International ATLAS layer for country, language, culture, regional business information and localized digital services.'}
];

function csvCell(value=''){const text=String(value??'');return /[",\n\r]/.test(text)?`"${text.replaceAll('"','""')}"`:text}
function money(value){return `${Number(value).toFixed(2)} USD`}
function itemLink(item){return `${ORIGIN}/?product=${encodeURIComponent(item.id)}`}
function imageLink(item){return `${ORIGIN}${item.image}`}

export function atlasMetaCatalog(){return CATALOG.map(item=>({...item,brand:item.id==='united-hands-hub'?'United Hands for Humanity':'ATLAS',countryOfOrigin:'US',availability:'in stock',condition:'new',link:itemLink(item),imageLink:imageLink(item)}))}

export function metaCatalogCsv(){
 const header=['id','title','description','availability','condition','price','sale_price','link','image_link','brand','product_type'];
 const rows=atlasMetaCatalog().map(item=>[
  item.id,item.title,`${item.description} ${item.sale>0?`Launch price: $${item.sale}/month.`:'Community access: free.'}`,
  item.availability,item.condition,money(item.price),money(item.sale),item.link,item.imageLink,item.brand,item.category
 ]);
 return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\n')+'\n';
}

export async function metaCatalogRoutes(request,env,url){
 if(request.method!=='GET')return null;
 if(url.pathname==='/feeds/meta/atlas-catalog.csv')return new Response(metaCatalogCsv(),{headers:{'content-type':'text/csv; charset=utf-8','cache-control':'public,max-age=900','content-disposition':'inline; filename="atlas-catalog.csv"','x-content-type-options':'nosniff','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/meta/atlas-catalog.json')return Response.json({ok:true,source:'ATLAS Enterprise Suite',currency:'USD',countryOfOrigin:'US',count:CATALOG.length,items:atlasMetaCatalog()},{headers:{'cache-control':'public,max-age=900','access-control-allow-origin':'*'}});
 if(url.pathname==='/feeds/meta/status')return Response.json({ok:true,feed:`${ORIGIN}/feeds/meta/atlas-catalog.csv`,count:CATALOG.length,mode:'scheduled-feed',credentialsRequired:false},{headers:{'cache-control':'no-store'}});
 return null;
}

export {CATALOG};
