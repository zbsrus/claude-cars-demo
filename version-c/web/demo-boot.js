const list=document.querySelector('script[data-scripts]').dataset.scripts.split(',');
try {
  await import('./demo-store.js');
} catch(error) {
  if(window.CC.page==='owner'){
    const messages={fr:'Autorisez le stockage dans ce navigateur pour essayer le cabinet.',en:'Allow browser storage to try the workspace.',nl:'Sta browseropslag toe om de werkruimte te gebruiken.',es:'Activa el almacenamiento del navegador para probar el espacio.',de:'Erlauben Sie Browserspeicher, um den Bereich zu testen.'};
    document.getElementById('main').textContent=messages[window.CC.lang];throw error;
  }
  window.CCDemo={asset:path=>path,carPath:(id,lang)=>'/claude-cars-demo/version-c/'+lang+'/cars/'+encodeURIComponent(id)+'/'};
}
for (const url of list) await import(url);
