'use strict';

// Interfaz sin frameworks: HTML + CSS + JavaScript que puede alojarse en GitHub Pages.
// La demostración usa localStorage. El modo conectado usa la API de Supabase y RLS.
const CFG = window.SAVIO_CONFIG || {};
const DEMO = !CFG.supabaseUrl && !CFG.supabasePublishableKey;
const CONFIG_ERROR = !DEMO && (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(CFG.supabaseUrl || '') || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(CFG.supabasePublishableKey || ''));
const BASE = (CFG.supabaseUrl || '').replace(/\/$/, '');
const STORE = 'savio-encuentra-demo-v1';
const CATEGORIES = ['Botellas y recipientes','Útiles escolares','Ropa y accesorios','Mochilas y bolsos','Tecnología','Otros'];
const PLACES = ['Patio','Aulas','Laboratorio de Robótica','Biblioteca','Cancha','Bar escolar','Pasillos','Otro lugar'];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalized = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const localDate = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const dateText = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(s+'T12:00:00').toLocaleDateString('es-EC',{day:'numeric',month:'short'}) : 'Sin fecha';
const fmt = n => String(n).padStart(2,'0');
let items = [], kindFilter = 'all', adminActive = false, auth = null, toastTimer, loadSequence = 0;

function icon(type, color = '#4e7798') {
  const shapes = {
    bottle: `<path d="M57 20h26v20l12 15v99q0 12-12 12H57q-12 0-12-12V55l12-15z" fill="${color}"/><rect x="54" y="12" width="32" height="13" rx="4" fill="#2a4c59"/><path d="M52 77h36v46H52z" fill="#ffffff2c"/><path d="M59 52v94" stroke="#ffffff54" stroke-width="4" stroke-linecap="round"/><path d="M59 33h22" stroke="#203e4b33" stroke-width="3"/>`,
    backpack: `<path d="M56 35v-8q0-13 14-13t14 13v8" stroke="#704c2d" stroke-width="7" fill="none"/><path d="M30 76q0-43 40-43t40 43v70q0 15-15 15H45q-15 0-15-15z" fill="${color}"/><path d="M44 40v69m52-69v69" stroke="#ffffff20" stroke-width="8"/><rect x="39" y="99" width="62" height="46" rx="12" fill="#00000015"/><path d="M45 110h49" stroke="#f4d9a977" stroke-width="3"/><rect x="65" y="63" width="12" height="10" rx="2" fill="#f5dcaa"/>`,
    notebook: `<g transform="rotate(-9 70 90)"><rect x="27" y="27" width="88" height="130" rx="6" fill="#ece5d3"/><rect x="22" y="22" width="88" height="130" rx="6" fill="${color}"/><path d="M37 22v130" stroke="#00000020" stroke-width="4"/><rect x="50" y="48" width="46" height="32" rx="3" fill="#f7efd9"/><path d="M57 59h32m-32 8h24" stroke="#888e79" stroke-width="2"/><path d="M27 35h17m-17 17h17m-17 17h17m-17 17h17m-17 17h17m-17 17h17m-17 17h17" stroke="#d7d9cb" stroke-width="4" stroke-linecap="round"/></g>`,
    jacket: `<path d="M46 35 26 47 9 105l25 9 13-34-3 77h53l-3-77 13 34 25-9-17-58-21-12-9 14H56z" fill="${color}"/><path d="M57 35q13 19 27 0" stroke="#ffffff55" fill="none" stroke-width="7"/><path d="M70 52v105" stroke="#1f343733" stroke-width="2"/><path d="M49 118h12m20 0h12" stroke="#ffffff33" stroke-width="3"/>`,
    pencilcase: `<g transform="rotate(-17 70 90)"><path d="M17 69q0-12 12-12h84q12 0 12 12v52q0 12-12 12H29q-12 0-12-12z" fill="${color}"/><path d="M20 73h101" stroke="#dce2d2" stroke-width="4"/><path d="M99 73v15" stroke="#ead99f" stroke-width="5"/><rect x="51" y="91" width="38" height="21" rx="3" fill="#ffffff22"/></g>`,
    headphones: `<path d="M29 101V77a41 41 0 0 1 82 0v24" fill="none" stroke="#395455" stroke-width="13"/><path d="M35 72a35 35 0 0 1 70 0" fill="none" stroke="#ffffff35" stroke-width="5"/><rect x="20" y="87" width="26" height="57" rx="12" fill="${color}"/><rect x="96" y="87" width="26" height="57" rx="12" fill="${color}"/><path d="M29 98v32m76-32v32" stroke="#ffffff32" stroke-width="5" stroke-linecap="round"/>`,
    glasses: `<g transform="rotate(-8 70 90)"><path d="M16 88q54-24 108 0" stroke="${color}" stroke-width="6" fill="none"/><path d="m19 86-4-34m106 34 6-34" stroke="${color}" stroke-width="5"/><rect x="17" y="85" width="47" height="36" rx="14" fill="#8ba5aa66" stroke="${color}" stroke-width="5"/><rect x="77" y="85" width="47" height="36" rx="14" fill="#8ba5aa66" stroke="${color}" stroke-width="5"/><path d="M64 96q6-8 13 0" stroke="${color}" stroke-width="4" fill="none"/></g>`,
    box: `<path d="m22 62 48-24 48 24-48 27z" fill="#d7af76"/><path d="M22 62v69l48 26V89z" fill="${color}"/><path d="M70 89v68l48-26V62z" fill="#00000020"/><path d="m47 50 48 25v31l-12 7V81L35 57z" fill="#f4d8a5"/><path d="m39 117 15 8" stroke="#ffffff77" stroke-width="5"/>`
  };
  return `<svg viewBox="0 0 140 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${shapes[type] || shapes.box}</svg>`;
}
function visual(item) {
  const styles = [
    {icon:'bottle',bg:'#e3eaf0',color:'#648ba5'},
    {icon:'notebook',bg:'#e5ecdf',color:'#6e8770'},
    {icon:'jacket',bg:'#eee5dd',color:'#6b7c79'},
    {icon:'backpack',bg:'#f0e6d1',color:'#bb8b54'},
    {icon:'headphones',bg:'#e6e7e8',color:'#6b747b'},
    {icon:'box',bg:'#eee9dd',color:'#b78c62'}
  ];
  const s = styles[CATEGORIES.indexOf(item.category)] || styles[5];
  if (normalized(item.title).includes('cartuchera')) return {...s,icon:'pencilcase',color:'#bf897d',bg:'#eee2df'};
  if (normalized(item.title).includes('lentes')) return {...s,icon:'glasses',color:'#82745c',bg:'#eae8de'};
  return s;
}
function imageSource(item) {
  if (!item.photo_path) return '';
  if (DEMO) return /^data:image\/jpeg;base64,[a-zA-Z0-9+/=]+$/.test(item.photo_path) ? item.photo_path : '';
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/i.test(item.photo_path)) return '';
  return `${BASE}/storage/v1/object/public/objetos/${item.photo_path}`;
}
function art(item, detail = false) {
  const v=visual(item), src=imageSource(item);
  return `<div class="${detail?'detail-art':'object-image'}" style="background:${v.bg}">${src?`<img src="${esc(src)}" alt="${esc(item.title)}" loading="lazy">`:icon(v.icon,v.color)}${detail?'':`<span class="code">${esc(item.code)}</span>`}</div>`;
}
function badge(item) {
  const resolved=item.status==='resolved';
  return `<span class="badge ${resolved?'resolved':item.kind==='lost'?'lost':''}">${resolved?'Recuperado':item.kind==='found'?'Encontrado':'En búsqueda'}</span>`;
}
function seed() {
  const rows=[
    ['found','Botella de agua azul',0,'Azul','Patio',-1,'Botella metálica mediana con tapa de rosca. Se encuentra en custodia.',true,'open'],
    ['found','Mochila color arena',3,'Arena','Biblioteca',-2,'Mochila de tela con un bolsillo delantero. Sin datos personales visibles.',true,'open'],
    ['lost','Cuaderno verde',1,'Verde','Aulas',-1,'Cuaderno de tapa dura verde y espiral metálico. Se busca desde el último recreo.',true,'open'],
    ['found','Cartuchera rosada',1,'Rosado','Laboratorio de Robótica',-3,'Cartuchera de tela rosada con cierre. Contiene varios útiles escolares.',true,'open'],
    ['lost','Chompa gris',2,'Gris','Cancha',-2,'Chompa gris de manga larga. Puede haberse quedado en una banca.',true,'open'],
    ['found','Audífonos de diadema',4,'Gris','Pasillos',-4,'Audífonos con diadema acolchada y dos auriculares grandes.',true,'open'],
    ['found','Lentes con marco café',5,'Café','Bar escolar',-2,'Lentes de marco café encontrados sobre una mesa del bar.',true,'open'],
    ['lost','Botella de plástico',0,'Azul','Cancha',-5,'Botella reutilizable de tamaño pequeño. Tapa a presión.',true,'open'],
    ['found','Cuaderno recuperado',1,'Verde','Biblioteca',-7,'Ejemplo de objeto cuya entrega ya fue confirmada por el responsable.',true,'resolved'],
    ['found','Mochila devuelta',3,'Marrón','Patio',-8,'Ejemplo de reporte resuelto después de verificar la propiedad.',true,'resolved'],
    ['found','Recipiente para alimentos',0,'Azul','Bar escolar',0,'Recipiente plástico rectangular encontrado después del recreo.',false,'open'],
    ['lost','Estuche para útiles',1,'Verde','Aulas',0,'Estuche rectangular de tela con cierre y un bolsillo pequeño.',false,'open']
  ];
  return rows.map((r,i)=>({id:crypto.randomUUID(),code:`DEMO-${String(i+1).padStart(3,'0')}`,kind:r[0],title:r[1],category:CATEGORIES[r[2]],color:r[3],place:r[4],happened_on:localDate(r[5]),description:r[6],published:r[7],status:r[8],photo_path:null,created_at:new Date(Date.now()+r[5]*86400000).toISOString()}));
}
function readDemo() {
  let data;
  try { data=JSON.parse(localStorage.getItem(STORE)); } catch { /* Un archivo local puede bloquear localStorage. */ }
  if (!Array.isArray(data)) { data=seed(); writeDemo(data); }
  return data.filter(x=>x && typeof x.id==='string' && ['found','lost'].includes(x.kind) && ['open','resolved'].includes(x.status) && typeof x.published==='boolean');
}
function writeDemo(data) {
  try { localStorage.setItem(STORE,JSON.stringify(data)); }
  catch { throw new Error('El navegador no pudo guardar la práctica. Libera espacio o abre la página desde un servidor web.'); }
}
function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>{$('#toast').hidden=true;},6000); }
function errorMessage(error) { return error instanceof Error ? error.message : 'No se pudo completar la acción. Vuelve a intentar.'; }
async function request(path, {method='GET',body,raw=false,headers={}}={}, retry=true) {
  if (CONFIG_ERROR) throw new Error('Revisa la URL y la clave publicable en config.js.');
  const h={apikey:CFG.supabasePublishableKey,...headers};
  if (auth?.access_token) h.Authorization=`Bearer ${auth.access_token}`;
  if(body!==undefined && !raw) h['Content-Type']='application/json';
  let res;
  try { res=await fetch(`${BASE}/${path}`,{method,headers:h,body:body===undefined?undefined:raw?body:JSON.stringify(body)}); }
  catch { throw new Error('No hay conexión con el sistema. Revisa internet y vuelve a intentar.'); }
  if(res.status===401 && auth?.refresh_token && retry && !path.startsWith('auth/')) {
    try { auth=await request('auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:auth.refresh_token}},false); }
    catch { auth=null; adminActive=false; showPublic(); throw new Error('Tu sesión terminó. Ingresa de nuevo al panel docente.'); }
    return request(path,{method,body,raw,headers},false);
  }
  if(!res.ok) {
    let info={};try { info=await res.json(); } catch { /* respuesta sin JSON */ }
    if(path.startsWith('auth/')) throw new Error('No se pudo ingresar. Revisa el correo, la contraseña y la configuración de la cuenta.');
    if(res.status===401 || res.status===403) throw new Error('No tienes permiso para esta acción. Revisa la autorización del docente y las reglas de la base de datos.');
    if(res.status===413) throw new Error('La imagen supera el tamaño permitido.');
    if(info.code==='23514' || info.code==='22007') throw new Error('Revisa los datos del objeto, la fecha y los campos obligatorios.');
    throw new Error('El sistema no pudo completar la acción. Comprueba la configuración de Supabase y vuelve a intentar.');
  }
  if(res.status===204 || res.headers.get('content-length')==='0')return null;
  const txt=await res.text(); return txt?JSON.parse(txt):null;
}
async function load() {
  const seq=++loadSequence;
  $('#connection-error').hidden=true; $('#objects').setAttribute('aria-busy','true');
  try {
    const result=DEMO?readDemo():await request(`rest/v1/items?select=*&order=created_at.desc${adminActive?'':'&published=eq.true'}&limit=1000`);
    if(seq!==loadSequence)return;
    items=result || []; render();
  } catch(e) {
    if(seq!==loadSequence)return;
    $('#connection-message').textContent=errorMessage(e); $('#connection-error').hidden=false;
    $('#result-count').textContent='El catálogo no está disponible en este momento.';
  } finally { if(seq===loadSequence) $('#objects').setAttribute('aria-busy','false'); }
}
function render() {
  const published=items.filter(x=>x.published);
  $('#stat-found').textContent=fmt(published.filter(x=>x.kind==='found'&&x.status==='open').length);
  $('#stat-lost').textContent=fmt(published.filter(x=>x.kind==='lost'&&x.status==='open').length);
  $('#stat-returned').textContent=fmt(published.filter(x=>x.status==='resolved').length);
  $('#count-all').textContent=published.length;
  const words=normalized($('#search').value).trim().split(/\s+/).filter(Boolean);
  const shown=published.filter(x=>(kindFilter==='all'||x.kind===kindFilter)&&($('#category').value==='all'||x.category===$('#category').value)&&($('#place').value==='all'||x.place===$('#place').value)&&($('#status').value==='all'||x.status===$('#status').value)&&words.every(w=>normalized([x.title,x.color,x.description,x.category,x.place,x.code].join(' ')).includes(w)));
  $('#result-count').textContent=`${shown.length} ${shown.length===1?'objeto disponible':'objetos disponibles'} con estos filtros${DEMO?' · Datos de demostración':''}`;
  $('#objects').innerHTML=shown.map(x=>`<article class="object-card">${art(x)}<div class="object-body">${badge(x)}<h3>${esc(x.title)}</h3><div class="object-meta"><span>⌖ ${esc(x.place)}</span><span>◷ ${dateText(x.happened_on)}</span></div></div><div class="object-footer"><span>${esc(x.category)}</span><button class="card-link" data-detail="${esc(x.id)}" aria-label="Ver detalles de ${esc(x.title)}">Ver detalles ↗</button></div></article>`).join('');
  $('#empty').hidden=shown.length>0;
  if(adminActive)renderAdmin();
}
function renderAdmin() {
  const filter=$('#admin-filter').value;
  const pending=items.filter(x=>!x.published).length;
  $('#admin-subtitle').textContent=`${pending} ${pending===1?'reporte pendiente':'reportes pendientes'} · ${items.length} en total${DEMO?' · Práctica en este navegador':''}`;
  const rows=items.filter(x=>filter==='all'||(filter==='pending'&&!x.published)||(filter==='published'&&x.published&&x.status==='open')||(filter==='resolved'&&x.status==='resolved'));
  $('#admin-list').innerHTML=rows.length?rows.map(x=>`<article class="admin-item"><div><div class="badge-row">${badge(x)}${!x.published?'<span class="badge pending">Pendiente</span>':''}</div><h3>${esc(x.title)}</h3><p>${esc(x.code)} · ${esc(x.place)} · ${dateText(x.happened_on)}</p></div><div class="actions"><button class="action" data-detail="${esc(x.id)}">Ver</button><button class="action" data-edit="${esc(x.id)}">Editar / foto</button>${!x.published?`<button class="action approve" data-action="publish" data-id="${esc(x.id)}">Aprobar</button>`:`<button class="action" data-action="hide" data-id="${esc(x.id)}">Ocultar</button>`}<button class="action" data-action="${x.status==='resolved'?'reopen':'resolve'}" data-id="${esc(x.id)}">${x.status==='resolved'?'Reabrir':'Marcar recuperado'}</button><button class="action danger" data-action="delete" data-id="${esc(x.id)}">Eliminar</button></div></article>`).join(''):'<div class="admin-empty"><h3>Todo al día</h3><p>No hay reportes con este estado.</p></div>';
}
function openReport(item=null, requestedKind=null) {
  const f=$('#report-form'); f.reset(); $('#report-error').textContent='';
  f.elements.id.value=item?.id||''; f.elements.happened_on.max=localDate(); f.elements.happened_on.value=localDate();
  if(item) for(const key of ['title','category','color','place','happened_on','description','kind'])f.elements[key].value=item[key];
  if(requestedKind)f.elements.kind.value=requestedKind;
  $('#photo-field').hidden=!adminActive; $('#remove-photo-row').hidden=!item?.photo_path;
  $('#report-title').textContent=item?'Editar objeto':adminActive?'Registrar un objeto':'Reportar un objeto';
  $('#submit-report').textContent=adminActive?'Guardar reporte':'Enviar a revisión';
  $('#report-dialog').showModal();
}
function detail(id) {
  const x=items.find(x=>x.id===id&&(x.published||adminActive)); if(!x)return;
  const pickup=CFG.pickup||'Inspección';
  const instruction=x.status==='resolved'?'Este reporte ya fue resuelto por el responsable.':x.kind==='found'?`Acércate a ${pickup} y menciona el código ${x.code}. Describe una característica que no aparezca en el reporte para demostrar que es tuyo.`:`Si encontraste este objeto o tienes información, acércate a ${pickup} y menciona el código ${x.code}.`;
  $('#detail-content').innerHTML=`${art(x,true)}${badge(x)}<h2 class="detail-title" id="detail-title">${esc(x.title)}</h2><p class="detail-description">${esc(x.description)}</p><div class="detail-grid"><div><small>Código del reporte</small>${esc(x.code)}</div><div><small>Fecha del hecho</small>${dateText(x.happened_on)}</div><div><small>Lugar reportado</small>${esc(x.place)}</div><div><small>Color</small>${esc(x.color)}</div></div><div class="info-box"><strong>${x.status==='resolved'?'Una historia resuelta':x.kind==='found'?'Cómo recuperarlo':'Cómo ayudar'}</strong><p style="margin:7px 0 0">${esc(instruction)}</p></div><p class="hint">Los objetos encontrados deben entregarse al responsable. La propiedad se verifica en persona.</p><button class="button dark full" data-close>Entendido</button>`;
  $('#detail-dialog').showModal();
}
function confirmAction(message) {
  return new Promise(resolve=>{const d=$('#confirm-dialog');$('#confirm-message').textContent=message;
    const finish=answer=>{d.removeEventListener('close',closed);$('#confirm-accept').onclick=null;$('#confirm-cancel').onclick=null;d.close();resolve(answer);};
    const closed=()=>finish(false);d.addEventListener('close',closed,{once:true});
    $('#confirm-accept').onclick=()=>finish(true);$('#confirm-cancel').onclick=()=>finish(false);d.showModal();
  });
}
async function patchItem(id, values) {
  if(DEMO){const next=items.map(x=>x.id===id?{...x,...values}:x);writeDemo(next);items=next;}
  else await request(`rest/v1/items?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',body:values,headers:{Prefer:'return=minimal'}});
}
async function manage(action,id,button) {
  if(!adminActive)return;
  const x=items.find(x=>x.id===id);if(!x)return;
  if(action==='delete'&&!await confirmAction(`¿Eliminar el reporte «${x.title}»? No se podrá recuperar.`))return;
  if(action==='resolve'&&!await confirmAction('Confirma que el responsable ya verificó la entrega o recuperación del objeto.'))return;
  button.disabled=true;
  try {
    if(action==='delete'){
      if(DEMO){const next=items.filter(y=>y.id!==id);writeDemo(next);items=next;}
      else {
        // Se borra primero el registro; una foto huérfana no impide retirar el reporte.
        await request(`rest/v1/items?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});
        if(x.photo_path)try{await removePhoto(x.photo_path);}catch{toast('Reporte eliminado. Revisa en Supabase si quedó una foto sin usar.');}
      }
    } else await patchItem(id,action==='publish'?{published:true}:action==='hide'?{published:false}:action==='resolve'?{status:'resolved'}:{status:'open'});
    await load();toast(action==='delete'?'Reporte eliminado.':action==='publish'?'Reporte aprobado y publicado.':action==='resolve'?'Recuperación registrada.':'Reporte actualizado.');
  } catch(e){toast(errorMessage(e));}finally{button.disabled=false;}
}
async function shrinkImage(file) {
  if(file.size>4*1024*1024)throw new Error('La imagen debe pesar menos de 4 MB.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Elige una imagen JPG, PNG o WebP.');
  const src=URL.createObjectURL(file),img=new Image();
  try {
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('No se pudo abrir la imagen.'));img.src=src;});
    const scale=Math.min(1,960/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/jpeg',.8);
  } finally{URL.revokeObjectURL(src);}
}
async function removePhoto(path) { await request('storage/v1/object/objetos',{method:'DELETE',body:{prefixes:[path]}}); }
async function submitReport(event) {
  event.preventDefault(); const f=event.currentTarget;if(!f.reportValidity())return;
  if(f.elements.website.value)return;
  const payload=Object.fromEntries(['kind','title','category','color','place','happened_on','description'].map(k=>[k,f.elements[k].value.trim()]));
  if(payload.title.length<3||payload.description.length<10||!payload.color||payload.happened_on>localDate()){$('#report-error').textContent='Revisa el nombre, la descripción, el color y la fecha.';return;}
  const id=f.elements.id.value,existing=items.find(x=>x.id===id),file=adminActive?f.elements.photo.files[0]:null;
  const button=$('#submit-report');button.disabled=true;$('#report-error').textContent='';
  let savedId=id,photoPath=null,uploadedPath=null,recordSaved=false;
  try {
    const image=file?await shrinkImage(file):null;
    if(DEMO){
      const newId=id||crypto.randomUUID(),next=items.slice();
      photoPath=image||(f.elements.remove_photo.checked?null:existing?.photo_path)||null;
      if(id){const index=next.findIndex(x=>x.id===id);if(index<0)throw new Error('No se encontró ese objeto.');next[index]={...next[index],...payload,photo_path:photoPath};}
      else next.unshift({...payload,id:newId,code:'DEMO-'+crypto.randomUUID().slice(0,6).toUpperCase(),status:'open',published:false,photo_path:photoPath,created_at:new Date().toISOString()});
      writeDemo(next);items=next;recordSaved=true;
    } else {
      if(id){if(!adminActive)throw new Error('Ingresa al panel docente para editar.');await patchItem(id,payload);recordSaved=true;}
      else {
        const created=await request('rest/v1/items',{method:'POST',body:payload,headers:{Prefer:adminActive?'return=representation':'return=minimal'}});
        savedId=created?.[0]?.id;recordSaved=true;
      }
      if(adminActive&&image){
        if(!savedId)throw new Error('Reporte guardado. Abre Editar / foto para añadir la imagen.');
        uploadedPath=`${savedId}/${crypto.randomUUID()}.jpg`;
        const blob=await (await fetch(image)).blob();
        await request(`storage/v1/object/objetos/${uploadedPath}`,{method:'POST',body:blob,raw:true,headers:{'Content-Type':'image/jpeg','x-upsert':'false'}});
        await patchItem(savedId,{photo_path:uploadedPath});
        if(existing?.photo_path)try{await removePhoto(existing.photo_path);}catch{/* se puede limpiar desde Storage */}
      } else if(adminActive&&f.elements.remove_photo.checked&&existing?.photo_path){await patchItem(savedId,{photo_path:null});try{await removePhoto(existing.photo_path);}catch{/* limpieza manual si falla */}}
    }
    $('#report-dialog').close();await load();toast(adminActive?'Reporte guardado. Puedes revisarlo y aprobarlo en el panel.':'Reporte enviado a revisión. El docente lo publicará después de comprobarlo.');
  } catch(e) {
    if(!DEMO&&uploadedPath)try{await removePhoto(uploadedPath);}catch{/* limpieza manual si falla */}
    if(recordSaved){$('#report-dialog').close();await load();toast(`El reporte se guardó. ${errorMessage(e)} Si faltó la foto, usa «Editar / foto».`);}
    else $('#report-error').textContent=errorMessage(e);
  } finally{button.disabled=false;}
}
function showPublic() { $('#admin-view').hidden=true;$('#public-view').hidden=false;$('#how-nav').hidden=false; }
async function showAdmin() {
  if(!adminActive){$('#demo-login').hidden=!DEMO;$('#login-form').hidden=DEMO;$('#login-error').textContent='';$('#login-dialog').showModal();return;}
  $('#public-view').hidden=true;$('#admin-view').hidden=false;$('#how-nav').hidden=true;$('#reset-demo').hidden=!DEMO;await load();window.scrollTo({top:0,behavior:'smooth'});
}
async function login(event) {
  event.preventDefault();const f=event.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;$('#login-error').textContent='';
  try{
    auth=await request('auth/v1/token?grant_type=password',{method:'POST',body:{email:f.elements.email.value.trim(),password:f.elements.password.value}},false);
    const allowed=await request('rest/v1/rpc/is_admin',{method:'POST',body:{}});
    if(allowed!==true){auth=null;throw new Error('La cuenta no está autorizada como docente. El responsable debe añadir su UID a admin_users.');}
    adminActive=true;f.reset();$('#login-dialog').close();await showAdmin();
  }catch(e){auth=null;$('#login-error').textContent=errorMessage(e);}finally{b.disabled=false;}
}
function exportCSV(){
  if(!adminActive)return;
  const fields=['code','kind','title','category','color','place','happened_on','description','status','published'];
  const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const csv='\ufeff'+[fields,...items.map(x=>fields.map(k=>x[k]))].map(row=>row.map(cell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=`savio-objetos-${localDate()}${DEMO?'-demo':''}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Archivo CSV exportado.');
}
function initialize(){
  $$('[data-school]').forEach(x=>x.textContent=CFG.school||'UES Domingo Savio');$$('[data-pickup]').forEach(x=>x.textContent=CFG.pickup||'Inspección');
  $('#mode-banner').textContent=DEMO?'DEMOSTRACIÓN · Objetos de ejemplo. Los cambios se guardan solo en este navegador; no se comparten entre dispositivos.':'CATÁLOGO ESCOLAR · Reportes revisados por el responsable de la institución.';
  $('#mode-banner').classList.toggle('live',!DEMO);
  const options=values=>values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
  $('#category').insertAdjacentHTML('beforeend',options(CATEGORIES));$('#place').insertAdjacentHTML('beforeend',options(PLACES));
  $('#report-form').elements.category.innerHTML=options(CATEGORIES);$('#report-form').elements.place.innerHTML=options(PLACES);
  $$('[data-art]').forEach(el=>el.innerHTML=icon(el.dataset.art,el.dataset.art==='bottle'?'#648ba5':'#bc8d55'));
  $('#search').addEventListener('input',render);['category','place','status'].forEach(id=>$('#'+id).addEventListener('change',render));
  $$('.tab').forEach(b=>b.addEventListener('click',()=>{kindFilter=b.dataset.kind;$$('.tab').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});render();}));
  $('#clear-filters').onclick=()=>{$('#search').value='';$('#category').value='all';$('#place').value='all';$('#status').value='open';$('.tab[data-kind="all"]').click();};
  $$('[data-report]').forEach(b=>b.onclick=()=>openReport(null,b.textContent.includes('Encontré')?'found':null));
  $('#report-form').addEventListener('submit',submitReport);$('#login-form').addEventListener('submit',login);
  document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-close'))b.closest('dialog').close();if(b.dataset.detail)detail(b.dataset.detail);if(b.dataset.edit&&adminActive)openReport(items.find(x=>x.id===b.dataset.edit));if(b.dataset.action)manage(b.dataset.action,b.dataset.id,b);});
  $('#admin-nav').onclick=showAdmin;$('#browse-nav').onclick=()=>{showPublic();$('#catalogo').scrollIntoView({behavior:'smooth'});};
  $('#demo-enter').onclick=async()=>{adminActive=true;$('#login-dialog').close();await showAdmin();};
  $('#logout').onclick=async()=>{if(auth)try{await request('auth/v1/logout',{method:'POST'});}catch{/* se cierra también la sesión local */}auth=null;adminActive=false;showPublic();await load();toast('Panel cerrado.');};
  $('#admin-add').onclick=()=>openReport();$('#admin-filter').onchange=renderAdmin;$('#export').onclick=exportCSV;
  ['refresh','admin-refresh','retry'].forEach(id=>$('#'+id).onclick=load);
  $('#reset-demo').onclick=async()=>{if(await confirmAction('¿Restablecer los objetos de ejemplo? Se borrarán únicamente los cambios de práctica de este navegador.')){try{writeDemo(seed());await load();toast('Práctica restablecida.');}catch(e){toast(errorMessage(e));}}};
  $$('.brand').forEach(a=>a.onclick=()=>{showPublic();window.scrollTo({top:0,behavior:'smooth'});});
  window.addEventListener('storage',event=>{if(DEMO&&event.key===STORE)load();});
  load();
}
initialize();
