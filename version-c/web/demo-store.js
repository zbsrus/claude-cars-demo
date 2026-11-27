const base = '/claude-cars-demo/version-c';
const seed = await (await fetch(base + '/web/demo-cars.json')).json();
const initial = () => ({cars:seed.map(c=>({...c, revision:c.revision || 1})), sections:{}, shares:{}, leads:[]});
const db = await new Promise((resolve,reject)=>{
  const request=indexedDB.open('claude-cars-version-c-workspace',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('workspace');request.result.createObjectStore('media');};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
});
const urls=new Map();
function loadMedia() {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('media'), cursor=tx.objectStore('media').openCursor();
    cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;
      if(!urls.has(row.key))urls.set(row.key,URL.createObjectURL(row.value));row.continue();};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
function workspace(write, apply) {
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('workspace',write?'readwrite':'readonly');
    const store=tx.objectStore('workspace'), request=store.get('v1');
    let result;
    request.onsuccess=()=>{try{const current=request.result || initial();result=apply(current);if(write)store.put(current,'v1');}
      catch(error){reject(error);tx.abort();}};
    tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(new Error('failure'));
  });
}
function carPath(id,lang){
  const folder=base+'/'+lang+'/cars/';
  return seed.some(c=>c.id===id)?folder+encodeURIComponent(id)+'/':folder+'detail/?id='+encodeURIComponent(id);
}
function upload(file){
  if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type))throw new Error('mediaError');
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('media','readwrite'), key='/media/demo-'+crypto.randomUUID();
    tx.objectStore('media').put(file,key);
    tx.oncomplete=()=>{urls.set(key,URL.createObjectURL(file));resolve({url:key});};
    tx.onabort=()=>reject(new Error('mediaError'));
  });
}
async function api(path,method='GET',body){
  if(path==='/api/owner/media')return upload(body);
  if(path==='/api/logout')return {};
  if(method==='GET' && path==='/api/owner/cars')await loadMedia();
  return workspace(method!=='GET',state=>{
    const [group,id,sub,channel,lang]=path.replace('/api/owner/','').split('/');
    if(group==='cars'){
      if(!id && method==='GET')return {cars:state.cars};
      const existing=id?state.cars.find(c=>c.id===id):state.cars.find(c=>c.requestId===body.requestId);
      if(id && !existing)throw new Error('notfound');
      if(sub==='shares'){
        const shares=state.shares[id] || {};
        if(method==='GET')return {shares};
        if(existing.revision!==body.revision || (shares[channel]?.[lang]?.text ?? null)!==body.previousText)throw new Error('conflict');
        shares[channel] ||= {};shares[channel][lang]={text:body.text,revision:body.revision};state.shares[id]=shares;return {};
      }
      if(!id && existing)return {car:existing};
      if(id && existing.revision!==body.revision)throw new Error('conflict');
      const car={...body,id:id || 'demo-'+crypto.randomUUID(),revision:(existing?.revision || 0)+1};
      state.cars=[car,...state.cars.filter(c=>c.id!==car.id)];return {car};
    }
    if(group==='site'){
      const item=state.sections[id] || {revision:0,draft:{},published:{}};
      if(method==='GET')return item;
      if(body.revision!==item.revision)throw new Error('conflict');
      const draft=body.action==='discard'?item.published:body.values;
      return state.sections[id]={revision:item.revision+1,draft,published:body.action==='publish'?draft:item.published};
    }
    if(group==='reviews')return {reviews:[]};
    if(group==='enquiries'){
      if(method==='GET'){
        const metrics=state.leads.flatMap(l=>[['saved',l.time],...(l.status==='booked'?[['bookings',l.bookedAt]]:[])].map(([kind,time])=>({kind,day:new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Brussels'}).format(time),car:l.car,source:'whatsapp',count:1})));
        return {leads:state.leads,metrics,views:[]};
      }
      if(method==='POST'){
        if(!state.leads.some(l=>l.id===body.id))state.leads.unshift({...body,time:Date.now(),status:'new',revision:1,title:state.cars.filter(c=>c.id===body.car).map(c=>c.make+' '+c.model).join('')});
        return {id:body.id};
      }
      const lead=state.leads.find(l=>l.id===id);if(!lead||lead.revision!==body.revision)throw new Error('conflict');
      Object.assign(lead,{status:body.status,revision:lead.revision+1,bookedAt:body.status==='booked'?Date.now():null});return {lead};
    }
    throw new Error('notfound');
  });
}
await loadMedia();
const data=await workspace(false,s=>s);
window.CCDemo={api,carPath,asset:path=>urls.get(path)||path};
const cc=window.CC;
cc.siteContent=Object.fromEntries(Object.entries(data.sections).map(([id,s])=>[id,s.published]));
cc.cars=data.cars.filter(c=>c.status!=='draft');
if(cc.page==='car'){
  cc.id=cc.id || new URLSearchParams(location.search).get('id');
  const car=cc.cars.find(c=>c.id===cc.id);
  if(car) document.title=car.make+' '+car.model+' · Claude Cars';
  else location.replace(base+'/'+cc.lang+'/cars/');
}
window.addEventListener('pageshow',e=>{if(e.persisted && cc.page!=='owner')location.reload()});
