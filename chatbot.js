(() => {
  const C = window.SHOPMATE_CONFIG || {};
  const panel = document.getElementById('shopperPanel');
  const launcher = document.getElementById('shopperLauncher');
  const close = document.getElementById('shopperClose');
  const backdrop = document.getElementById('shopperBackdrop');
  const messages = document.getElementById('shopperMessages');
  const form = document.getElementById('shopperForm');
  const input = document.getElementById('shopperInput');
  const chips = document.getElementById('shopperChips');
  const history = [];

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatAnswer = (text) => escapeHtml(text).replace(/\n/g, '<br>');

  function setOpen(open) {
    panel.classList.toggle('is-open', open);
    launcher.classList.toggle('is-hidden', open);
    backdrop.classList.toggle('is-visible', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => input.focus(), 120);
  }

  function addMessage(role, text, temporary = false) {
    const el = document.createElement('div');
    el.className = `shopper-bubble shopper-bubble-${role}${temporary ? ' is-typing' : ''}`;
    el.innerHTML = temporary ? '<span></span><span></span><span></span>' : formatAnswer(text);
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
    return el;
  }

  function productsForAI() {
    return Array.isArray(window.PADE_PRODUCTS) ? window.PADE_PRODUCTS.map(p => ({
      name: p.name,
      category: p.category,
      description: p.description,
      price: p.price,
      active: p.active !== false
    })) : [];
  }

  async function ask(message) {
    addMessage('user', message);
    history.push({ role: 'user', content: message });
    const typing = addMessage('bot', '', true);
    input.value = '';
    input.disabled = true;
    const endpoint = C.chatbotEndpoint || (C.supabaseUrl ? `${C.supabaseUrl.replace(/\/$/, '')}/functions/v1/chatbot` : '');
    try {
      if (!endpoint) throw new Error('Endpoint chatbot belum dikonfigurasi.');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(C.supabaseAnonKey ? { apikey: C.supabaseAnonKey, Authorization: `Bearer ${C.supabaseAnonKey}` } : {})
        },
        body: JSON.stringify({ message, history: history.slice(-10), products: productsForAI() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chatbot sedang bermasalah.');
      typing.remove();
      addMessage('bot', data.answer);
      history.push({ role: 'assistant', content: data.answer });
    } catch (err) {
      typing.remove();
      addMessage('bot', 'Maaf, asisten AI Pade sedang tidak tersambung. Untuk bantuan langsung, kamu bisa hubungi Toko Pade melalui WhatsApp.');
      console.error(err);
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  launcher.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const value = input.value.trim();
    if (value && !input.disabled) ask(value);
  });
  chips.addEventListener('click', e => {
    const button = e.target.closest('button[data-prompt]');
    if (button) ask(button.dataset.prompt);
  });
})();
