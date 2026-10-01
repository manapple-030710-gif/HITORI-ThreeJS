const v1 = new URLSearchParams(location.search).get('sim') === 'v1';
if (v1) {
  const link=document.createElement('a'); link.href='?sim=v2'; link.textContent='Simulator V1 → V2';
  link.style.cssText='position:fixed;left:44px;top:70px;z-index:20;color:#536268;font:11px Arial';
  document.querySelector('#interface').append(link);
  import('./main.js').catch(showError);
} else { import('./v2/main.js').catch(showError); }
function showError(error) {
  const message=document.querySelector('#error');message.hidden=false;message.textContent=error.message;
  console.error(error);
}
