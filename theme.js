(() => {
  let theme='system';
  try {
    const saved=localStorage.getItem('raliu-theme');
    if(saved==='light'||saved==='dark')theme=saved;
  } catch {}
  const media=window.matchMedia('(prefers-color-scheme: dark)');
  document.documentElement.dataset.theme=theme;
  window.addEventListener('DOMContentLoaded',()=>{
    const control=document.getElementById('theme-control');
    const toggle=document.getElementById('theme-toggle');
    const menu=document.getElementById('theme-menu');
    const options=[...menu.querySelectorAll('button[data-theme-value]')];
    function sync(){
      document.documentElement.dataset.theme=theme;
      toggle.dataset.icon=(theme==='dark'||(theme==='system'&&media.matches))?'moon':'sun';
      options.forEach(option=>option.setAttribute('aria-pressed',String(option.dataset.themeValue===theme)));
    }
    function open(value){
      menu.hidden=!value;
      toggle.setAttribute('aria-expanded',String(value));
    }
    toggle.addEventListener('click',()=>open(menu.hidden));
    options.forEach(option=>option.addEventListener('click',()=>{
      theme=option.dataset.themeValue;
      try {localStorage.setItem('raliu-theme',theme)} catch {}
      sync();open(false);toggle.focus();
    }));
    document.addEventListener('click',e=>{if(!control.contains(e.target))open(false)});
    control.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.preventDefault();open(false);toggle.focus()}});
    control.addEventListener('focusout',e=>{if(e.relatedTarget&&!control.contains(e.relatedTarget))open(false)});
    media.addEventListener('change',sync);
    sync();
  });
})();
