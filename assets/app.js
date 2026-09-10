(function(){
 const grid=document.querySelector('#recipeGrid');
 const search=document.querySelector('#searchInput');
 const form=document.querySelector('#searchForm');
 const clear=document.querySelector('#searchClear');
 const count=document.querySelector('#count');
 const chips=[...document.querySelectorAll('.chip')];
 if(!grid || !search || !Array.isArray(window.RECIPES)) return;

 let category='Todas';
 const norm=s=>(s||'').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

 function matchesQuery(r,q){
  if(!q) return true;
  const hay=norm([r.title,r.region,r.category,r.desc,r.slug].join(' '));
  return norm(q).split(/\s+/).every(token=>hay.includes(token));
 }

 function render(opts={}){
  const q=search.value.trim();
  const list=window.RECIPES.filter(r=>{
   const catOK=q ? true : (category==='Todas'||r.category===category);
   return catOK && matchesQuery(r,q);
  });

  grid.innerHTML=list.length?list.map(r=>`<a class="card" href="recetas/${r.slug}.html" aria-label="Ver receta de ${r.title}"><div class="thumb"><img src="${window.RECIPE_IMAGES?.[r.slug]||''}" alt="${r.title}" loading="lazy" decoding="async"><span class="place">${r.region}</span></div><div class="card-body"><h3>${r.title}</h3><div class="meta"><span>${r.time}</span><span>·</span><span>${r.difficulty}</span></div><p>${r.desc}</p><span class="card-link">Ver receta <b>→</b></span></div></a>`).join(''):`<div class="empty"><strong>No encontramos esa receta.</strong><span>Prueba con otro plato, ingrediente o región.</span></div>`;

  if(count) count.textContent=q ? `${list.length} resultado${list.length===1?'':'s'} para “${q}”` : `${list.length} recetas`;
  if(clear) clear.hidden=!q;
  chips.forEach(c=>c.classList.toggle('searching',!!q));
  if(opts.scroll) document.querySelector('#recetas')?.scrollIntoView({behavior:'smooth',block:'start'});
 }

 search.addEventListener('input',()=>render());
 form?.addEventListener('submit',e=>{e.preventDefault();render({scroll:true});});
 clear?.addEventListener('click',()=>{search.value='';category='Todas';chips.forEach(x=>x.classList.toggle('active',x.dataset.cat==='Todas'));render();search.focus();});
 chips.forEach(c=>c.addEventListener('click',()=>{search.value='';chips.forEach(x=>x.classList.remove('active'));c.classList.add('active');category=c.dataset.cat;render();}));
 render();
})();
