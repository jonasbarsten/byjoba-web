// Runs on contact.html only. Turnstile hands over a token; the API trades it for the address.
window.addEventListener('load', () => {
  const widget = document.getElementById('turnstile');
  const result = document.getElementById('contact-result');

  const show = (node) => {
    result.replaceChildren(node);
    result.hidden = false;
    widget.hidden = true;
  };

  turnstile.render(widget, {
    sitekey: widget.dataset.sitekey,
    callback: async (token) => {
      const response = await fetch(`/contact?token=${encodeURIComponent(token)}`);
      if (!response.ok) {
        show(document.createTextNode('Could not verify. Reload the page to try again.'));
        return;
      }
      const { email } = await response.json();
      const link = document.createElement('a');
      link.href = `mailto:${email}`;
      link.textContent = email;
      show(link);
    },
  });
});
