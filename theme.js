(() => {
  let theme='system';
  try {
    const saved=localStorage.getItem('raliu-theme');
    if(saved==='light'||saved==='dark')theme=saved;
  } catch {}
  document.documentElement.dataset.theme=theme;
  window.addEventListener('DOMContentLoaded',()=>{
    const select=document.getElementById('theme');
    select.value=theme;
    select.onchange=()=>{
      document.documentElement.dataset.theme=select.value;
      try {localStorage.setItem('raliu-theme',select.value)} catch {}
    };
  });
})();
