// Runs on contact.html only. Turnstile hands over a token; the API trades it for the address.
window.addEventListener('load', () => {
  const widget = document.getElementById('turnstile');
  const result = document.getElementById('contact-result');

  const show = (node) => {
    result.replaceChildren(node);
    result.hidden = false;
    widget.hidden = true;
  };
  const fail = () => show(document.createTextNode('Could not verify. Reload the page to try again.'));

  // The Turnstile script is third-party, so a content blocker may have stopped it.
  if (typeof turnstile === 'undefined') return fail();

  turnstile.render(widget, {
    sitekey: widget.dataset.sitekey,
    'error-callback': fail,
    callback: async (token) => {
      try {
        const response = await fetch(`/contact?token=${encodeURIComponent(token)}`);
        const { email } = response.ok ? await response.json() : {};
        if (typeof email !== 'string') return fail();
        const link = document.createElement('a');
        link.href = `mailto:${email}`;
        link.textContent = email;
        show(link);
      } catch {
        fail();
      }
    },
  });
});
