/* Uses the existing preference key. No analytics, ads or third-party scripts. */
(() => {
  'use strict';
  const KEY='rdr_consent_v1';
  const get=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch(_){return null;}};
  let opener=null;
  function close(){document.querySelector('.consent-layer')?.remove();if(opener?.isConnected)opener.focus();}
  function panel(trigger=null){
    close();opener=trigger||document.activeElement;
    const prefix=document.body.dataset.prefix||'';
    const layer=document.createElement('div');layer.className='consent-layer';
    layer.innerHTML=`<section class="consent-card" role="dialog" aria-modal="true" aria-labelledby="consent-title"><p class="eyebrow">Tu privacidad</p><h2 id="consent-title">T\u00fa eliges.</h2><p>Ahora mismo no usamos anal\u00edtica ni publicidad. Solo guardamos tu elecci\u00f3n de privacidad en este navegador.</p><div class="consent-options"><label><span><b>Necesarias</b><small>Recuerdan tu elecci\u00f3n de privacidad.</small></span><input type="checkbox" checked disabled></label><label><span><b>Anal\u00edtica</b><small>No activa actualmente.</small></span><input id="consentAnalytics" type="checkbox"></label><label><span><b>Publicidad</b><small>No activa actualmente.</small></span><input id="consentAds" type="checkbox"></label></div><div class="consent-actions"><button type="button" data-reject>Rechazar opcionales</button><button type="button" data-save>Guardar selecci\u00f3n</button><button type="button" data-accept>Aceptar opcionales</button></div><a class="consent-policy" href="${prefix}cookies.html">Pol\u00edtica de cookies</a><button type="button" class="consent-close" data-close>Cerrar sin cambiar</button></section>`;
    document.body.appendChild(layer);
    const c=get()||{};
    layer.querySelector('#consentAnalytics').checked=Boolean(c.analytics);
    layer.querySelector('#consentAds').checked=Boolean(c.ads);
    function save(value){
      try{localStorage.setItem(KEY,JSON.stringify({...value,necessary:true,updated:new Date().toISOString()}));}catch(_){/* Private browsers may disallow persistent storage; page still works. */}
      close();
    }
    layer.querySelector('[data-reject]').addEventListener('click',()=>save({analytics:false,ads:false}));
    layer.querySelector('[data-accept]').addEventListener('click',()=>save({analytics:true,ads:true}));
    layer.querySelector('[data-save]').addEventListener('click',()=>save({analytics:layer.querySelector('#consentAnalytics').checked,ads:layer.querySelector('#consentAds').checked}));
    layer.querySelector('[data-close]').addEventListener('click',close);
    layer.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();}
      if(e.key==='Tab'){
        const focusable=Array.from(layer.querySelectorAll('button,a,input:not([disabled])'));
        const first=focusable[0],last=focusable[focusable.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
    layer.querySelector('[data-reject]').focus({preventScroll:true});
  }
  document.addEventListener('click',e=>{const button=e.target.closest('[data-cookie-settings]');if(button)panel(button);});
  if(!get())panel();
})();
