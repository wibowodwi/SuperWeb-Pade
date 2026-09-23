(() => {
  const panel = document.getElementById('shopperPanel');
  const launcher = document.getElementById('shopperLauncher');
  const close = document.getElementById('shopperClose');
  const backdrop = document.getElementById('shopperBackdrop');
  const faqList = document.getElementById('shopperMessages');
  const expandAll = document.getElementById('faqExpandAll');
  const collapseAll = document.getElementById('faqCollapseAll');
  const floatingContact = document.querySelector('.floating-contact');
  const socialPopup = document.getElementById('socialPopup');

  if (!panel || !launcher || !close || !backdrop || !faqList) return;

  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    launcher.classList.toggle('is-hidden', open);
    // Saat FAQ terbuka, tombol Hubungi Kami ikut disembunyikan agar tidak menumpuk di atas panel.
    floatingContact?.classList.toggle('is-hidden', open);
    socialPopup?.classList.remove('is-open');
    backdrop.classList.toggle('is-visible', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) {
      setTimeout(() => {
        const first = faqList.querySelector('.faq-item.is-open .faq-question');
        if (first && window.innerWidth <= 620) first.focus({preventScroll:true});
      }, 180);
    }
  }

  function setItem(item, open) {
    const answer = item.querySelector('.faq-answer');
    const button = item.querySelector('.faq-question');
    const icon = item.querySelector('.faq-toggle');
    item.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', String(open));
    answer.hidden = !open;
    icon.textContent = open ? '−' : '+';
  }

  faqList.querySelectorAll('.faq-item').forEach((item) => {
    const button = item.querySelector('.faq-question');
    button.addEventListener('click', () => {
      const willOpen = !item.classList.contains('is-open');
      // Seperti referensi: item dapat dibuka/tutup satu per satu.
      setItem(item, willOpen);
    });
  });

  expandAll?.addEventListener('click', () => {
    faqList.querySelectorAll('.faq-item').forEach(item => setItem(item, true));
  });

  collapseAll?.addEventListener('click', () => {
    faqList.querySelectorAll('.faq-item').forEach(item => setItem(item, false));
  });

  launcher.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();
