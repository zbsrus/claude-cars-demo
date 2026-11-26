(function studio(){
  "use strict";
  const { t, label, value, num, money } = I18n;
  const brand = `<span class="brand studio-brand"><svg aria-hidden="true" viewBox="0 0 54 32"><path fill="currentColor" d="M14 2h18l-5 7H17l-7 14h12l-5 7H1L14 2Zm21 0h18l-5 7H38l-7 14h12l-5 7H22L35 2Z"/></svg><span>Claude Cars<b>.</b></span></span>`;
  const art = {
    "porsche-911": { file:"porsche", title:"Porsche 911", trim:"Carrera 3.2", intro:["Le six-cylindres à plat des années 80.","The flat-six of the eighties.","Der Sechszylinder-Boxer der Achtziger.","El seis cilindros bóxer de los ochenta."] },
    "porsche-997-gt3": { file:"gt3", title:"Porsche 911", trim:"GT3 RS (997)", intro:["La GT3 RS sur la route, en images et en vidéo.","The GT3 RS on the road, in photos and on film.","Der GT3 RS unterwegs, in Bildern und im Film.","El GT3 RS en carretera, en fotos y vídeo."] },
    "alfa-spider": { file:"spider", title:"Alfa Romeo", trim:"Spider 2.0", intro:["Deux places et un long capot à l’italienne.","Two seats and a long Italian bonnet.","Zwei Sitze und eine lange italienische Motorhaube.","Dos plazas y un largo capó italiano."] },
  };
  const types = {
    all: ()=>t("Toutes","All","Alle","Todos"),
    coupe: ()=>t("Coupés","Coupés","Coupés","Cupés"),
    roadster: ()=>t("Roadsters","Roadsters","Roadster","Roadsters"),
  };
  const stockBodies = { "porsche-911":"coupe","porsche-997-gt3":"coupe","porsche-911t":"coupe","alfa-spider":"roadster","mercedes-280sl":"roadster" };
  let bodyFilter="all";
  let currentSelection;
  const esc=s=>App.esc(s);
  const icon=s=>App.icon(s);
  const pad=n=>String(n).padStart(2,"0");
  const seedById=new Map(VIRAGE_SEED.map(car=>[car.id,car]));
  function sameModel(car) {
    const initial=seedById.get(car.id);
    return initial && initial.make===car.make && initial.model===car.model;
  }
  function illustration(car) {
    return sameModel(car) && car.image===seedById.get(car.id).image ? art[car.id] : null;
  }
  const studioCaption=()=>t("Illustration studio du modèle","Studio illustration of the model","Studioillustration des Modells","Ilustración de estudio del modelo");
  function cover(choices,index){
    const car=choices[index], image=illustration(car);
    const href="#car/"+encodeURIComponent(car.id);
    const title=image?.title||car.make;
    const trim=image?.trim||car.model;
    const specs=[[label("year"),car.year],[label("mileage"),num(car.km)+" km"],[t("Boîte","Gearbox","Getriebe","Cambio"),value(car.gearbox)],[t("Prix démo","Demo price","Demopreis","Precio demo"),money(car.price)]];
    const name=car.make+" "+car.model;
    const source=image?"assets/"+image.file+"-studio.webp":App.photo(car);
    return `<div class="wrap">
      <div class="studio-top"><span class="studio-kicker">${label("featured")}</span><span>${t("Youngtimers & classiques","Modern & classic cars","Youngtimer & Klassiker","Clásicos y youngtimers")}</span></div>
      <div class="studio-stage${image?"":" studio-photograph"}">
        <h1${title.length>14?' class="long-make"':''}>${esc(title)}</h1>
        <div class="studio-caption"><p class="studio-trim">${esc(trim)}</p><p class="studio-intro">${image?t(...image.intro):esc(car.city)}</p>
          <div class="studio-links"><a class="btn primary" href="${href}" aria-label="${esc(label("viewCar")+" · "+name)}">${label("viewCar")} ${icon("arrow")}</a><a class="studio-catalog-link" href="#catalogue">${label("fullCatalog")}</a></div></div>
        <a class="studio-car" href="${href}" aria-label="${esc(label("viewCar")+" · "+name)}"><img fetchpriority="high" src="${esc(source)}" alt="${esc(name+(image?" · "+studioCaption():""))}"></a>
      </div>
      <div class="studio-rail"><dl>${specs.map(([key,v])=>`<div><dt>${esc(key)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
        ${choices.length>1?`<div class="studio-arrows"><span aria-hidden="true"><b>${pad(index+1)}</b> / ${pad(choices.length)}</span><button type="button" data-slide="-1" aria-label="${label("previous")}">${icon("back")}</button><button type="button" data-slide="1" aria-label="${label("next")}">${icon("arrow")}</button></div>`:""}
      </div></div>`;
  }
  function updateCover(choices,index,direction){
    const el=document.querySelector("#studio-cover");
    const focusButton=el.contains(document.activeElement);
    el.innerHTML=cover(choices,index);
    if(focusButton)el.querySelector(`[data-slide="${direction}"]`)?.focus({preventScroll:true});
    const car=choices[index];
    document.querySelector("#studio-status").textContent=`${car.make} ${car.model} · ${index+1}/${choices.length}`;
    if(!matchMedia("(prefers-reduced-motion: reduce)").matches)el.querySelector(".studio-car img").animate([{opacity:.65},{opacity:1}],{duration:180});
  }
  function selection(){
    const {stock,stockLink,card}=currentSelection;
    const list=stock.filter(car=>bodyFilter==="all"||(sameModel(car)&&stockBodies[car.id]===bodyFilter));
    return `<div class="studio-selection-head"><h2>${t("La sélection","The selection","Unsere Auswahl","La selección")}<b>.</b></h2>
      <div class="studio-filters" role="group" aria-label="${t("Carrosserie","Body style","Karosserie","Carrocería")}">${Object.entries(types).map(([type,name])=>`<button type="button" data-body="${type}" aria-pressed="${bodyFilter===type}">${name()}</button>`).join("")}</div></div>
      <div class="cards">${list.slice(0,3).map(card).join("")}</div>
      ${list.length?"":`<p role="status">${label("noResults")}</p>`}
      <a href="#catalogue" class="textlink studio-all">${stockLink} ${icon("out")}</a>`;
  }
  function home(context){
    currentSelection=context;
    return `<section class="studio-cover" id="studio-cover" aria-label="${label("featured")}">${cover(context.choices,context.slide)}</section>
      <p class="visually-quiet" id="studio-status" role="status"></p>
      <section class="wrap studio-selection" id="studio-selection">${selection()}</section>
      <section class="studio-garage"><div class="wrap"><img src="assets/instruments-photo.webp" loading="lazy" width="768" height="512" alt="">
      <div><span class="studio-kicker">${t("Le garage · Wanze","The garage · Wanze","Die Garage · Wanze","El garaje · Wanze")}</span>
      <h2>${t("Le goût de l’analogique","A feel for analogue","Die Liebe zum Analogen","El gusto por lo analógico")}<b>.</b></h2>
      <p>${esc(ClaudePage.profile()[I18n.lang()].intro)}</p><div class="studio-links"><a href="#claude" class="btn primary">${label("aboutLink")} ${icon("arrow")}</a><a class="studio-catalog-link" href="#contact">${label("contactClaude")}</a></div></div></div></section>`;
  }
  function exportTools(form){
    const drawer=document.createElement("details");
    drawer.className="studio-draft";
    drawer.innerHTML=`<summary>${t("Copier ou télécharger le brouillon","Copy or download the draft","Entwurf kopieren oder herunterladen","Copiar o descargar el borrador")}</summary>
      <div><button type="button" class="btn" data-copy>${t("Copier","Copy","Kopieren","Copiar")}</button><button type="button" class="btn" data-download>${t("Télécharger","Download","Herunterladen","Descargar")} (.txt)</button></div><p role="status"></p>`;
    form.append(drawer);
    drawer.addEventListener("click",async event=>{
      const button=event.target.closest("button");
      if(!button)return;
      const feedback=drawer.querySelector('[role="status"]');
      if(!form.elements.message.value.trim()){form.elements.message.focus();form.elements.message.reportValidity();return;}
      const lines=["Claude Cars",form.elements.car.selectedOptions[0].textContent,form.elements.reply.value.trim(),"",form.elements.message.value.trim()];
      const text=lines.join("\n");
      if(button.hasAttribute("data-copy")){
        try{await navigator.clipboard.writeText(text);feedback.textContent=t("Message copié.","Message copied.","Nachricht kopiert.","Mensaje copiado.");}
        catch{feedback.textContent=t("Utilisez le téléchargement du fichier texte.","Use the text file download.","Bitte die Textdatei herunterladen.","Descarga el archivo de texto.");}
      }else{
        const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
        const a=document.createElement("a"); a.href=url; a.download="claude-cars.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
      }
    });
  }
  function mount(page){
    if(page==="accueil"){
      const panel=document.querySelector("#studio-selection");
      panel?.addEventListener("click",event=>{
        const button=event.target.closest("[data-body]");
        if(!button)return;
        bodyFilter=button.dataset.body;
        panel.innerHTML=selection();
        panel.querySelector(`[data-body="${bodyFilter}"]`).focus({preventScroll:true});
      });
    }else if(page==="contact"){
      const form=document.querySelector("#cc-enquiry");
      if(form)exportTools(form);
    }else if(page==="car"){
      const id=location.hash.split(/[/?]/)[1];
      const car=App.cars().find(item=>item.id===id);
      const picture=car&&illustration(car);
      const gallery=document.querySelector("[data-car-media]");
      if(!picture||!gallery)return;
      const button=document.createElement("button");
      button.type="button";
      button.className="textlink studio-model-view";
      button.textContent=t("Vue studio du modèle","Studio view of the model","Modell in Studioansicht","Vista de estudio del modelo");
      button.addEventListener("click",()=>App.showSheet(studioCaption(),`<img class="studio-plate" src="assets/${picture.file}-studio.webp" alt="${esc(car.make+" "+car.model)}">`));
      gallery.append(button);
    }
  }
  const aliases={"#selection":"#catalogue","#voiture/mercedes-280-sl":"#car/mercedes-280sl"};
  const hash=location.hash;
  const destination=aliases[hash]||(hash.startsWith("#voiture/")?hash.replace("#voiture/","#car/"):null);
  if(destination)history.replaceState(history.state,"",destination);
  window.StudioView={brand,home,updateCover,mount,credits:()=>t("Les vues studio et le compte-tours sont des illustrations générées pour cette démo.","The studio views and tachometer are illustrations generated for this demo.","Studioansichten und Drehzahlmesser wurden für diese Demo generiert.","Las vistas de estudio y el cuentarrevoluciones se generaron para esta demo.")};
})();
