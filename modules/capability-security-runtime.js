export function capabilitySecurityRuntime(){return `(()=>{
'use strict';
if(window.__ATLAS_CAPABILITY_SAFE_DOM__)return;
const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(!descriptor?.get||!descriptor?.set)return;
const blocked=new Set(['SCRIPT','IFRAME','OBJECT','EMBED','META','BASE','LINK','STYLE']);
const urlAttrs=new Set(['href','src','xlink:href','formaction','action']);
const cleanUrl=value=>{const v=String(value||'').trim().replace(/[\\u0000-\\u0020]+/g,'').toLowerCase();return !(v.startsWith('javascript:')||v.startsWith('vbscript:')||v.startsWith('data:text/html')||v.startsWith('data:image/svg+xml'))};
const sanitize=markup=>{
  const template=document.createElement('template');
  descriptor.set.call(template,String(markup??''));
  const nodes=[...template.content.querySelectorAll('*')];
  for(const element of nodes){
    if(blocked.has(element.tagName)){element.remove();continue}
    for(const attr of [...element.attributes]){
      const name=attr.name.toLowerCase();
      if(name.startsWith('on')||name==='srcdoc'||name==='style'){element.removeAttribute(attr.name);continue}
      if(urlAttrs.has(name)&&!cleanUrl(attr.value))element.removeAttribute(attr.name);
    }
  }
  return descriptor.get.call(template);
};
Object.defineProperty(Element.prototype,'innerHTML',{configurable:descriptor.configurable,enumerable:descriptor.enumerable,get:descriptor.get,set(value){descriptor.set.call(this,sanitize(value))}});
Object.defineProperty(window,'__ATLAS_CAPABILITY_SAFE_DOM__',{value:true,writable:false,configurable:false,enumerable:false});
})();`}
