// Simple, safe text formatting for texts the board edits in the admin page (e.g. the privacy statement).
// Everything is escaped first, so no HTML or scripts can get in. Supported:
//   ## Heading        ### Smaller heading
//   - list item       (consecutive lines starting with "- ")
//   **bold**          [link text](https://… | mailto:… | page.html)
//   blank line        = new paragraph
// The same rules are implemented in Python in tools/build_pages.py (render_text); keep them in sync.
(function () {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = t => t.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function inline(text) {
    let s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const u = url.replace(/&amp;/g, '&');
      if (!/^(https?:\/\/|mailto:|[a-z0-9_-]+\.html(#[\w-]+)?$|#[\w-]+$)/i.test(u)) return label;
      const ext = /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${esc(u)}"${ext}>${label}</a>`;
    });
    return s;
  }

  function render(md) {
    const out = [];
    let para = [], list = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
    const flushList = () => { if (list.length) { out.push(`<ul>${list.map(li => `<li>${inline(li)}</li>`).join('')}</ul>`); list = []; } };
    String(md || '').replace(/\r\n?/g, '\n').split('\n').forEach(raw => {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); flushList(); }
      else if ((m = line.match(/^(#{2,3})\s+(.+)$/))) {
        flushPara(); flushList();
        const tag = m[1].length === 2 ? 'h2' : 'h3';
        out.push(`<${tag} id="${slug(m[2])}">${inline(m[2])}</${tag}>`);
      }
      else if ((m = line.match(/^[-*]\s+(.+)$/))) { flushPara(); list.push(m[1]); }
      else { flushList(); para.push(line); }
    });
    flushPara(); flushList();
    return out.join('\n');
  }

  window.NovumText = { render };
})();
