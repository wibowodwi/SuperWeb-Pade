(() => {
  const cfg = window.SHOPMATE_CONFIG?.socialLinks || {};
  const wa = (window.SHOPMATE_CONFIG?.whatsappNumber || '').replace(/\D/g, '');
  if (!cfg.whatsapp && wa) cfg.whatsapp = `https://wa.me/${wa}`;

  const labels = { instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', maps: 'Google Maps 1', maps2: 'Google Maps 2' };
  document.querySelectorAll('.social-benefit-item[data-social]').forEach(item => {
    const key = item.dataset.social;
    const href = cfg[key];
    if (!href) {
      item.classList.add('is-disabled');
      item.title = `Tambahkan link ${labels[key]} di config.js > socialLinks`;
      return;
    }
    const link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'social-benefit-link';
    while (item.firstChild) link.appendChild(item.firstChild);
    item.appendChild(link);
  });
})();
