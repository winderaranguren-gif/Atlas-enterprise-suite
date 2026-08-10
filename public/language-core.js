(()=>{
  const KEY='atlas.language';
  const supported=['en','es'];
  const defaultLanguage='en';
  let language=supported.includes(localStorage.getItem(KEY))?localStorage.getItem(KEY):defaultLanguage;

  const pairs=[
    ['Plataforma','Platform'],['Módulos','Modules'],['Industrias','Industries'],['Seguridad','Security'],['Contacto','Contact'],['Inicio','Home'],
    ['Todo tu negocio. Un solo sistema.','Your entire business. One system.'],
    ['ATLAS reúne operaciones, clientes, finanzas, documentos, páginas, equipos, automatización y datos en una sola plataforma modular. Cada empresa ve únicamente lo que necesita.','ATLAS brings operations, customers, finance, documents, pages, teams, automation, and data together in one modular platform. Each company sees only what it needs.'],
    ['Solicitar acceso','Request access'],['Ver módulos','View modules'],['Ya tengo cuenta','I already have an account'],
    ['plataforma unificada','unified platform'],['regiones globales','global regions'],['módulos del piloto','pilot modules'],['arquitectura preparada','ready architecture'],
    ['POR QUÉ ATLAS','WHY ATLAS'],['Menos aplicaciones. Más control.','Fewer apps. More control.'],
    ['ATLAS está diseñado para que una empresa pueda trabajar desde un entorno común, con permisos, datos y procesos conectados entre sí.','ATLAS is designed so a company can work from one shared environment with connected permissions, data, and processes.'],
    ['Un solo acceso','One access point'],['Usuarios, roles y organizaciones separados con una experiencia común para web y app.','Separate users, roles, and organizations with one consistent web and app experience.'],
    ['Módulos según necesidad','Modules as needed'],['Cada empresa activa únicamente las capacidades que contrata o necesita.','Each company activates only the capabilities it purchases or needs.'],
    ['Datos conectados','Connected data'],['CRM, documentos, accounting, páginas y backups comparten una misma estructura operacional.','CRM, documents, accounting, pages, and backups share one operational structure.'],
    ['Los primeros módulos comerciales.','The first commercial modules.'],
    ['Organizaciones, usuarios, roles, sesiones y auditoría.','Organizations, users, roles, sessions, and audit trails.'],
    ['Crear, editar y publicar páginas reales desde ATLAS.','Create, edit, and publish real pages from ATLAS.'],
    ['Contactos, empresas, leads, oportunidades y actividad.','Contacts, companies, leads, opportunities, and activity.'],
    ['Clientes, proveedores, facturas, pagos, ledger y reportes básicos.','Customers, vendors, invoices, payments, ledger, and basic reports.'],
    ['Archivos, carpetas, permisos, descarga y versionado.','Files, folders, permissions, downloads, and versioning.'],
    ['Snapshots verificables, checksum, historial y restauración.','Verifiable snapshots, checksums, history, and restoration.'],
    ['Una base, múltiples negocios.','One foundation, multiple businesses.'],
    ['Operaciones, clientes, documentos, finanzas y presencia digital.','Operations, customers, documents, finance, and digital presence.'],
    ['Capacidades sectoriales de ATLAS Health se incorporan sobre el mismo núcleo seguro.','ATLAS Health industry capabilities are built on the same secure core.'],
    ['Flotas, rutas, operaciones móviles y trabajo en campo.','Fleets, routes, mobile operations, and field work.'],
    ['ARQUITECTURA','ARCHITECTURE'],['Separación real entre web pública y software privado.','Real separation between the public website and private software.'],
    ['La portada explica ATLAS. El software vive detrás del acceso. Después del sign in, la empresa recibe su organización, sus permisos y sus módulos.','The public site explains ATLAS. The software lives behind authentication. After sign in, the company receives its organization, permissions, and modules.'],
    ['Sitio público comercial','Public commercial website'],['Sign in separado','Separate sign in'],['Sign up / piloto','Sign up / pilot'],['App privada en /app.html','Private app at /app.html'],['Módulos por empresa y rol','Modules by company and role'],
    ['HABLEMOS','LET’S TALK'],['¿Quieres probar ATLAS en tu empresa?','Want to try ATLAS in your company?'],['Estamos preparando el piloto comercial con un conjunto pequeño de módulos verdaderamente operativos.','We are preparing the commercial pilot with a focused set of truly operational modules.'],['Solicitar piloto','Request pilot'],['Contactar','Contact'],
    ['Inicia sesión en tu empresa.','Sign in to your company.'],['Después de autenticarte, ATLAS abre el entorno de tu organización y muestra únicamente los módulos asignados a tu empresa y a tu rol.','After authentication, ATLAS opens your organization environment and shows only the modules assigned to your company and role.'],
    ['Acceso por organización','Organization-based access'],['Roles y permisos','Roles and permissions'],['Módulos contratados','Subscribed modules'],['Auditoría de actividad','Activity audit trail'],
    ['Correo','Email'],['Contraseña','Password'],['Entrar a ATLAS','Enter ATLAS'],['El acceso real se habilita cuando el Operational Core esté conectado a D1.','Real access is enabled when the Operational Core is connected to D1.'],['Verificando acceso…','Verifying access…'],['Login no disponible','Login unavailable'],['No se pudo iniciar sesión: ','Could not sign in: '],
    ['Crea tu empresa en ATLAS.','Create your company in ATLAS.'],['Durante el piloto, el alta comienza con una solicitud de acceso. Cuando Users & Permissions quede productivo, este mismo flujo creará la organización, owner y módulos contratados automáticamente.','During the pilot, onboarding begins with an access request. Once Users & Permissions is production-ready, this same flow will automatically create the organization, owner, and subscribed modules.'],
    ['Organización separada','Separate organization'],['Owner y equipo','Owner and team'],['Selección de módulos','Module selection'],['Configuración inicial','Initial configuration'],['Nombre','Name'],['Empresa','Company'],['¿Qué quieres manejar con ATLAS?','What do you want to manage with ATLAS?'],['Piloto comercial: la solicitud se enviará al equipo ATLAS.','Commercial pilot: your request will be sent to the ATLAS team.'],['Solicitud preparada. Se abrirá tu correo para enviarla a ATLAS.','Request prepared. Your email app will open so you can send it to ATLAS.'],
    ['Buscar en ATLAS…','Search ATLAS…'],['Pantallas','Screens'],['Calendario','Calendar'],['Notificaciones','Notifications'],['Navegación principal','Main navigation'],['Actualizado','Updated'],['Activo','Active'],['EN VIVO','LIVE'],['Update Fabric: activo','Update Fabric: active'],
    ['Native ATLAS recreation · no Base44 runtime required','Native ATLAS recreation · no Base44 runtime required'],['Nuevo guion','New script'],['Título del guion','Script title'],['Escribe o pega el guion...','Write or paste the script...'],['Tamaño','Size'],['Texto','Text'],['Fondo','Background'],['Espejar texto','Mirror text'],['Loop al terminar','Loop at end'],['Guardar','Save'],['Eliminar','Delete'],['Iniciar','Start'],['Pausa','Pause'],['Reiniciar','Restart'],['Velocidad','Speed'],['Pantalla','Fullscreen'],['Listo.','Ready.'],['Sin título','Untitled'],['Tu guion aparecerá aquí.','Your script will appear here.'],['Guardado en ATLAS local storage.','Saved in ATLAS local storage.'],['Finalizado.','Finished.'],['Reproduciendo.','Playing.'],['Pausado.','Paused.'],['Reiniciado.','Restarted.'],
    ['BUENOS DÍAS','GOOD MORNING'],['Todo tu universo. Conectado. Inteligente. 4D.','Your entire universe. Connected. Intelligent. 4D.'],['operativos / verificados','operational / verified'],['Módulos ATLAS','ATLAS Modules'],['repertorio total','total repertoire'],['Capacidades activas','Active capabilities'],['detección de releases','release detection'],['Ver todos','View all'],['Actividad Reciente','Recent Activity'],['Ver todo','View all'],['Tareas en Proceso','Tasks in Progress'],['Implementación visual','Visual implementation'],['Uso de Módulos','Module Usage'],['ATLAS En Vivo','ATLAS Live'],['Sistemas operativos','Operational systems'],['Módulos catalogados','Cataloged modules'],['Superficies','Surfaces'],['Integraciones externas','External integrations'],['Reflexión de Hoy','Today’s Reflection'],['Acciones Rápidas','Quick Actions'],['Soporte','Support'],['Respaldo','Backup'],['Sincronizar','Sync'],['Explorar','Explore'],['Noticias ATLAS','ATLAS News'],['Hoy','Today'],['Diseño','Design'],['Perfil dinámico','Dynamic profile'],['Nombre actual:','Current name:'],['Editar nombre','Edit name'],['Buscar actualización','Check for update'],['Personaliza la experiencia sin tocar código.','Customize the experience without touching code.']
  ];

  const esToEn=new Map(pairs);
  const enToEs=new Map(pairs.map(([es,en])=>[en,es]));

  function translateString(value,target){
    if(!value) return value;
    const map=target==='en'?esToEn:enToEs;
    let out=value;
    for(const [from,to] of map){
      if(out===from) return to;
      if(out.includes(from)) out=out.split(from).join(to);
    }
    return out;
  }

  function translateNode(node){
    if(node.nodeType===Node.TEXT_NODE){
      const raw=node.nodeValue;
      const trimmed=raw.trim();
      if(!trimmed) return;
      const translated=translateString(trimmed,language);
      if(translated!==trimmed) node.nodeValue=raw.replace(trimmed,translated);
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE) return;
    if(node.matches?.('script,style,code,pre,[data-no-translate]')) return;
    ['placeholder','title','aria-label'].forEach(attr=>{
      if(node.hasAttribute?.(attr)){
        const current=node.getAttribute(attr);
        const translated=translateString(current,language);
        if(current!==translated) node.setAttribute(attr,translated);
      }
    });
    node.childNodes?.forEach(translateNode);
  }

  function applyLanguage(next){
    language=supported.includes(next)?next:defaultLanguage;
    localStorage.setItem(KEY,language);
    document.documentElement.lang=language;
    translateNode(document.body);
    document.querySelectorAll('[data-atlas-language]').forEach(sel=>sel.value=language);
    window.dispatchEvent(new CustomEvent('atlas:languagechange',{detail:{language}}));
  }

  function injectSelector(){
    if(document.querySelector('[data-atlas-language]')) return;
    const select=document.createElement('select');
    select.setAttribute('data-atlas-language','');
    select.setAttribute('aria-label','Language');
    select.innerHTML='<option value="en">English</option><option value="es">Español</option>';
    select.value=language;
    Object.assign(select.style,{width:'auto',minWidth:'112px',padding:'9px 11px',borderRadius:'12px',border:'1px solid rgba(130,180,230,.28)',background:'#0b1728',color:'#eef6ff',fontWeight:'700',margin:'0 6px'});
    select.addEventListener('change',()=>applyLanguage(select.value));
    const host=document.querySelector('.top-actions')||document.querySelector('.links')||document.querySelector('.top')||document.body;
    host.appendChild(select);
  }

  const observer=new MutationObserver(mutations=>{
    for(const m of mutations) for(const node of m.addedNodes) translateNode(node);
  });

  function boot(){
    injectSelector();
    applyLanguage(language);
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.ATLASLanguage={get:()=>language,set:applyLanguage,supported:[...supported],default:defaultLanguage};
})();