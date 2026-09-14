// TradersProp shared production configuration.
// Keep payment/database secrets out of this file.
window.TRADERSPROP_SUPABASE_URL = window.TRADERSPROP_SUPABASE_URL || 'https://hlwdhijbsysvgvocvqrz.supabase.co';
window.TRADERSPROP_API_BASE = window.TRADERSPROP_API_BASE || ((location.protocol==='http:'||location.protocol==='https:') ? location.origin : 'https://tradersprop-otp-api-fixed.vercel.app');
window.TRADERSPROP_PORTALS = Object.assign({
  clientUrl: '',
  adminUrl: '',
  supportUrl: ''
}, window.TRADERSPROP_PORTALS || {});
(function(){
  const p=window.TRADERSPROP_PORTALS;
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('[data-portal]').forEach(a=>{
      const u=p[a.getAttribute('data-portal')+'Url'];
      if(u) a.href=u;
    });
  });
})();
