// NovUM admin page (admin.html).
// Signs board members in with Supabase Auth; everything they can change is enforced by the
// row level security in supabase/schema.sql. Open admin.html?demo to try it without Supabase.
(function () {
  const api = window.NovumAPI;
  const client = api.client;
  const DEMO = new URLSearchParams(location.search).has('demo');
  const app = document.getElementById('app');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (u && /^(https?:\/\/|img\/|blob:|\/)/i.test(u) ? esc(u) : '');
  const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
  const timeFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const recent = iso => {
    const d = new Date(iso), days = Math.floor((Date.now() - d) / 864e5);
    return days < 1 ? 'Today' : days < 2 ? 'Yesterday' : days < 7 ? `${days} days ago` : dateFmt.format(d);
  };
  const first = name => String(name || '').trim().split(/\s+/)[0];

  const state = { email: '', data: null, route: 'messages', filter: { registrations: 'new', messages: 'new' }, search: '' };

  // ------------------------------------------------------------------ storage
  const TABLES = ['councils', 'pillars', 'achievements', 'people', 'members', 'messages'];

  const supaStore = {
    async load() {
      const res = await Promise.all(TABLES.map(t => {
        let q = client.from(t).select('*');
        q = ['members', 'messages'].includes(t) ? q.order('created_at', { ascending: false }) : q.order('sort');
        return q;
      }));
      const bad = res.find(r => r.error);
      if (bad) throw bad.error;
      const out = Object.fromEntries(TABLES.map((t, i) => [t, res[i].data]));
      const votes = await client.from('priority_votes').select('id, pillar_id, faculty, detail, created_at').order('created_at', { ascending: false }).limit(20000);
      out.priority_votes = votes.error ? null : votes.data; // null = poll not set up yet
      const texts = await client.from('site_texts').select('*');
      out.site_texts = texts.error ? null : texts.data;   // null = site_texts.sql not run yet
      return out;
    },
    async save(table, row) {
      const { id, ...rest } = row;
      const q = id ? client.from(table).update(rest).eq('id', id) : client.from(table).insert(rest);
      const { data, error } = await q.select().single();
      if (error) throw error;
      return data;
    },
    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    async resetPoll() {
      const { error } = await client.from('priority_votes').delete().gte('id', 0);
      if (error) throw error;
    },
    async saveText(slug, body) {
      const { data, error } = await client.from('site_texts').upsert({ slug, body }).select().single();
      if (error) throw error;
      return data;
    },
    async upload(file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = `people/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await client.storage.from('media').upload(path, file, { contentType: file.type, cacheControl: '31536000' });
      if (error) throw error;
      return client.storage.from('media').getPublicUrl(path).data.publicUrl;
    }
  };

  // In demo mode everything lives in memory and is lost on reload.
  function memoryStore() {
    const d = JSON.parse(JSON.stringify(window.NOVUM_DEMO));
    const id = () => crypto.randomUUID();
    const daysAgo = (n, h = 10) => new Date(Date.now() - n * 864e5 - h * 36e5).toISOString();
    const db = {
      councils: d.councils,
      pillars: d.pillars,
      achievements: d.achievements.map((a, i) => ({ id: id(), sort: i, ...a })),
      people: d.people.map(p => ({ id: id(), active: true, period: '', study: '', council_id: null, ...p })),
      // SAMPLE submissions so the inbox screens can be tried out
      members: [
        { full_name: 'Sofia Lindqvist', email: 'sofia.lindqvist@student.example', faculty: 'FASoS', programme: 'European Studies', study_year: 'Bachelor 2', interests: ['Policy work', 'Campaigning'], message: 'I was in the student council at my secondary school and would love to help with the elections.', status: 'new', created_at: daysAgo(1) },
        { full_name: 'Jonas Weber', email: 'j.weber@student.example', faculty: 'SBE', programme: 'International Business', study_year: 'Bachelor 1', interests: ['Events'], message: '', status: 'new', created_at: daysAgo(3) },
        { full_name: 'Amara Okafor', email: 'amara.okafor@student.example', faculty: 'FHML', programme: 'Medicine', study_year: 'Master', interests: ['Running for council', 'Policy work'], message: 'Interested in running for the FHML council next year.', status: 'new', created_at: daysAgo(5) },
        { full_name: 'Luca Bianchi', email: 'luca.bianchi@student.example', faculty: 'Law', programme: 'European Law School', study_year: 'Bachelor 3', interests: ['Campaigning'], message: '', status: 'contacted', created_at: daysAgo(10) },
        { full_name: 'Emma de Vries', email: 'emma.devries@student.example', faculty: 'FPN', programme: 'Psychology', study_year: 'Bachelor 2', interests: ['Policy work'], message: '', status: 'member', created_at: daysAgo(17) }
      ].map(r => ({ id: id(), notes: '', ...r })),
      messages: [
        { name: 'Hannah Schmidt', email: 'hannah.s@student.example', topic: 'An issue in my faculty', council: 'fasos', message: 'Our tutorial groups went up to 18 students this block and there is hardly time for everyone to speak. Is this something the faculty council can look at?', status: 'new', created_at: daysAgo(0, 3) },
        { name: 'Daniel Kowalski', email: 'd.kowalski@student.example', topic: 'Housing or student life', council: '', message: 'I am an exchange student starting in February and still have not found a room. Does NovUM know of any short-stay options?', status: 'new', created_at: daysAgo(2) },
        { name: 'Marit Jansen', email: 'board@studyassociation.example', topic: 'Collaboration or partnership', council: '', message: 'We would like to co-host a debate night before the council elections. Who can we talk to?', status: 'answered', created_at: daysAgo(8) }
      ].map(r => ({ id: id(), notes: '', ...r }))
    };
    // SAMPLE poll votes for the demo
    const fac = ['FASoS', 'FHML', 'Law', 'FPN', 'SBE', 'FSE', ''];
    const weights = { 'p-hou': 41, 'p-wel': 27, 'p-edu': 22, 'p-sus': 14, 'p-int': 11 };
    const notes = { 'p-hou': ['Affordable rooms for first-years', 'Stop landlords asking for huge deposits'], 'p-wel': ['Shorter waiting times for the student psychologist'], 'p-edu': ['Recordings of all lectures'], 'p-sus': ['More bike parking at Randwyck'] };
    db.priority_votes = Object.entries(weights).flatMap(([pid, n]) => Array.from({ length: n }, (_, i) => ({ id: pid + i, pillar_id: pid, faculty: fac[(i * 3 + pid.length) % fac.length], detail: (notes[pid] || [])[i] || '', created_at: daysAgo(i % 20) })));
    db.site_texts = [];
    db.priority_votes.push({ id: 'o1', pillar_id: null, faculty: 'SBE', detail: 'Cheaper food in the university restaurants', created_at: daysAgo(1) }, { id: 'o2', pillar_id: null, faculty: '', detail: 'Longer library opening hours during exams', created_at: daysAgo(3) });
    return {
      async load() { return JSON.parse(JSON.stringify(db)); },
      async resetPoll() { db.priority_votes = []; },
      async saveText(slug, body) {
        db.site_texts = (db.site_texts || []).filter(t => t.slug !== slug);
        const row = { slug, body, updated_at: new Date().toISOString(), updated_by: 'demo' };
        db.site_texts.push(row); return { ...row };
      },
      async save(table, row) {
        const list = db[table];
        if (row.id && list.some(r => r.id === row.id)) {
          const i = list.findIndex(r => r.id === row.id);
          list[i] = { ...list[i], ...row };
          return { ...list[i] };
        }
        const created = { created_at: new Date().toISOString(), ...row, id: row.id || id() };
        list.push(created);
        return { ...created };
      },
      async remove(table, rid) { db[table] = db[table].filter(r => r.id !== rid); },
      async upload(file) { return URL.createObjectURL(file); }
    };
  }

  const store = DEMO ? memoryStore() : supaStore;

  // ------------------------------------------------------------------ helpers
  let toastTimer;
  function toast(text, bad) {
    const t = document.getElementById('toast');
    t.textContent = text; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
  }
  const D = () => state.data;
  const councilName = id => {
    const c = D().councils.find(x => x.id === id);
    return c ? (c.short_name === 'University' ? 'University Council' : c.short_name) : '';
  };
  const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);
  const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const avatar = p => safeUrl(p.photo_url) ? `<img class="avatar" src="${safeUrl(p.photo_url)}" alt="">` : `<span class="avatar">${esc(initials(p.name))}</span>`;
  const pill = s => `<span class="pill s-${esc(s)}">${esc(s[0].toUpperCase() + s.slice(1))}</span>`;

  async function persist(table, row, msg) {
    try {
      const saved = await store.save(table, row);
      const list = D()[table];
      const i = list.findIndex(r => r.id === saved.id);
      if (i >= 0) list[i] = saved; else list.push(saved);
      toast(msg || 'Saved');
      return saved;
    } catch (e) { console.error(e); toast('Could not save: ' + (e.message || 'unknown error'), true); throw e; }
  }
  async function destroy(table, id, msg) {
    try {
      await store.remove(table, id);
      D()[table] = D()[table].filter(r => r.id !== id);
      toast(msg || 'Deleted');
    } catch (e) { console.error(e); toast('Could not delete: ' + (e.message || 'unknown error'), true); throw e; }
  }

  // ------------------------------------------------------------------ drawer
  // fields: [{ name, label, type: text|email|textarea|number|select|check|photo|html, options, hint, required, half }]
  function openDrawer({ title, fields, values = {}, onSave, onDelete, deleteLabel = 'Delete', saveLabel = 'Save' }) {
    closeDrawer();
    const wrap = document.createElement('div');
    wrap.id = 'drawer';
    const fieldHtml = f => {
      const v = values[f.name];
      const id = 'fd-' + f.name;
      const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
      switch (f.type) {
        case 'html': return `<div>${f.html}</div>`;
        case 'textarea': return `<div class="f"><label for="${id}">${esc(f.label)}</label><textarea id="${id}" name="${f.name}" ${f.required ? 'required' : ''} rows="${f.rows || 4}">${esc(v)}</textarea>${hint}</div>`;
        case 'select': return `<div class="f"><label for="${id}">${esc(f.label)}</label><select id="${id}" name="${f.name}">${f.options.map(([val, lab]) => `<option value="${esc(val)}" ${String(v ?? '') === String(val) ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>${hint}</div>`;
        case 'check': return `<label class="f-check"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}> ${esc(f.label)}</label>`;
        case 'photo': return `<div class="f"><span id="${id}-l" style="font-weight:600;font-size:14px">${esc(f.label)}</span>
            <div class="photo-field">${safeUrl(v) ? `<img src="${safeUrl(v)}" alt="" data-preview>` : `<span class="avatar" data-preview>${esc(initials(values.name))}</span>`}
            <div><input type="file" name="${f.name}__file" accept="image/jpeg,image/png,image/webp" aria-labelledby="${id}-l"><input type="hidden" name="${f.name}" value="${esc(v)}">
            ${v ? `<div><button type="button" class="b b-quiet" data-clear-photo>Remove photo</button></div>` : ''}</div></div>${hint}</div>`;
        default: return `<div class="f"><label for="${id}">${esc(f.label)}</label><input id="${id}" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${f.required ? 'required' : ''}>${hint}</div>`;
      }
    };
    const rows = [];
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i], g = fields[i + 1];
      if (f.half && g && g.half) { rows.push(`<div class="f-row">${fieldHtml(f)}${fieldHtml(g)}</div>`); i++; }
      else rows.push(fieldHtml(f));
    }
    wrap.innerHTML = `<div class="scrim" data-close></div>
      <form class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" novalidate>
        <header><h2 id="drawer-title">${esc(title)}</h2><button type="button" class="b b-quiet" data-close aria-label="Close">Close</button></header>
        <div class="body">${rows.join('')}</div>
        <footer>${onSave ? `<button class="b b-primary" type="submit">${esc(saveLabel)}</button>` : ''}<button type="button" class="b" data-close>Cancel</button><span class="spacer"></span>
          ${onDelete ? `<button type="button" class="b b-danger" data-delete>${esc(deleteLabel)}</button>` : ''}</footer>
      </form>`;
    document.body.appendChild(wrap);
    const form = wrap.querySelector('form');
    const firstInput = form.querySelector('.body input:not([type=hidden]):not([type=file]), .body select, .body textarea');
    (firstInput || form.querySelector('[data-close]')).focus();

    wrap.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) closeDrawer();
      if (e.target.closest('[data-clear-photo]')) {
        const hidden = form.querySelector('input[type=hidden]'); hidden.value = '';
        form.querySelector('[data-preview]').outerHTML = `<span class="avatar" data-preview>${esc(initials(values.name))}</span>`;
        e.target.remove();
      }
    });
    form.addEventListener('change', e => {
      if (e.target.type === 'file' && e.target.files[0]) {
        const url = URL.createObjectURL(e.target.files[0]);
        form.querySelector('[data-preview]').outerHTML = `<img src="${url}" alt="" data-preview>`;
      }
    });
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    if (onDelete) wrap.querySelector('[data-delete]').addEventListener('click', async () => {
      if (!confirm(`${deleteLabel}? This can't be undone.`)) return;
      try { await onDelete(); closeDrawer(); render(); } catch (e) { /* toast shown */ }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const missing = fields.filter(f => f.required).find(f => !String(form.elements[f.name].value).trim());
      if (missing) { form.elements[missing.name].focus(); toast(`${missing.label} is required`, true); return; }
      const out = {};
      for (const f of fields) {
        if (f.type === 'html') continue;
        if (f.type === 'check') { out[f.name] = form.elements[f.name].checked; continue; }
        if (f.type === 'photo') {
          const file = form.elements[f.name + '__file'].files[0];
          out[f.name] = form.elements[f.name].value || null;
          if (file) {
            if (file.size > 5 * 1024 * 1024) { toast('Photos must be under 5 MB', true); return; }
            try { out[f.name] = await store.upload(file); } catch (err) { console.error(err); toast('Photo upload failed: ' + err.message, true); return; }
          }
          continue;
        }
        let v = form.elements[f.name].value;
        if (f.type === 'number') v = v === '' ? 0 : Number(v);
        if (f.nullable && v === '') v = null;
        out[f.name] = typeof v === 'string' ? v.trim() : v;
      }
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try { await onSave(out); closeDrawer(); render(); } catch (err) { btn.disabled = false; }
    });
  }
  function closeDrawer() { document.getElementById('drawer')?.remove(); }

  // ------------------------------------------------------------------ screens
  const SCREENS = {
    messages: { label: 'Messages', group: 'Inbox', render: renderMessages },
    poll: { label: 'Poll results', group: 'Inbox', render: renderPoll },
    work: { label: 'Our work', group: 'Website', render: renderWork },
    councils: { label: 'Councils', group: 'Website', render: renderCouncils },
    board: { label: 'Board', group: 'Website', render: () => renderPeople('board') },
    privacy: { label: 'Privacy statement', group: 'Website', render: renderPrivacy },
    handbook: { label: 'Handbook', group: 'Help', render: renderHandbook }
  };

  function shell(content) {
    const newRegs = D().members.filter(m => m.status === 'new').length;
    const newMsgs = D().messages.filter(m => m.status === 'new').length;
    const counts = { registrations: newRegs, messages: newMsgs };
    const groups = ['Inbox', 'Website', 'Help'];
    return `<div class="shell">
      <aside class="side" id="side">
        <a class="brand" href="#messages"><img src="img/logo.png" alt=""><span><b>NovUM</b><span>Board admin</span></span></a>
        <button class="b b-quiet menu-btn" id="menuBtn" aria-expanded="false" aria-controls="navWrap">Menu</button>
        <div class="nav-wrap" id="navWrap">
          ${groups.map(g => `<div class="nav-group"><h2>${g}</h2><nav class="nav" aria-label="${g}">
            ${Object.entries(SCREENS).filter(([, s]) => s.group === g).map(([k, s]) => `<a href="#${k}" ${state.route === k ? 'aria-current="page"' : ''}>${s.label}${counts[k] ? `<span class="count" aria-label="${counts[k]} new">${counts[k]}</span>` : ''}</a>`).join('')}
          </nav></div>`).join('')}
          <div class="side-foot"><span class="who">${esc(state.email)}</span><a href="index.html" target="_blank" rel="noopener">View the website</a>${DEMO ? '<a href="admin.html">Leave demo</a>' : '<button type="button" id="signOut">Sign out</button>'}</div>
        </div>
      </aside>
      <main class="canvas">${DEMO ? '<p class="demo-bar">Demo mode: sample data, nothing you change here is saved.</p>' : ''}${content}</main>
    </div>`;
  }

  function render() {
    const s = SCREENS[state.route] || SCREENS.messages;
    app.innerHTML = shell(s.render());
    document.title = `${s.label} · NovUM admin`;
    const side = document.getElementById('side');
    document.getElementById('menuBtn').addEventListener('click', e => {
      const open = side.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', open);
    });
    document.getElementById('signOut')?.addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });
    if (state.route === 'privacy') bindPrivacyEditor();
    document.getElementById('resetPoll')?.addEventListener('click', async () => {
      if (!confirm('Delete all poll votes and start a new poll? This cannot be undone.')) return;
      try { await store.resetPoll(); D().priority_votes = []; toast('Poll reset'); render(); }
      catch (e) { console.error(e); toast('Could not reset: ' + e.message, true); }
    });
    const search = document.getElementById('search');
    if (search) search.addEventListener('input', () => {
      state.search = search.value; const pos = search.selectionStart;
      render(); const s2 = document.getElementById('search'); s2.focus(); s2.setSelectionRange(pos, pos);
    });
  }

  // ---- inbox: registrations
  function statusTabs(kind, statuses, list) {
    const cur = state.filter[kind];
    const n = s => s === 'all' ? list.length : list.filter(r => r.status === s).length;
    return `<div class="seg" role="group" aria-label="Filter by status">${[...statuses, 'all'].map(s =>
      `<button type="button" data-filter="${kind}:${s}" aria-pressed="${cur === s}">${s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}<span class="n">${n(s)}</span></button>`).join('')}</div>`;
  }
  const matches = (r, fields) => !state.search || fields.some(f => String(r[f] || '').toLowerCase().includes(state.search.toLowerCase()));

  function inboxFinding(list, noun) {
    const fresh = list.filter(r => r.status === 'new').sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (!fresh.length) return `No new ${noun}s. Everything has been picked up.`;
    return `<b>${fresh.length} new ${noun}${fresh.length > 1 ? 's' : ''}</b> waiting for a reply, the oldest from ${dayFmt.format(new Date(fresh[0].created_at))}.`;
  }

  function renderRegistrations() {
    const all = D().members;
    const f = state.filter.registrations;
    const rows = all.filter(r => (f === 'all' || r.status === f) && matches(r, ['full_name', 'email', 'faculty', 'programme']));
    return `<div class="title-row"><div><h1>Membership registrations</h1><p class="sub">${inboxFinding(all, 'registration')}</p></div>
        <div class="actions"><button class="b" type="button" data-export="members">Export CSV</button></div></div>
      <div class="toolbar">${statusTabs('registrations', ['new', 'contacted', 'member', 'declined'], all)}
        <input class="search" id="search" type="search" placeholder="Search name, email or programme" value="${esc(state.search)}" aria-label="Search registrations"></div>
      <div class="panel">${rows.length ? `<table><thead><tr><th>Name</th><th class="hide-sm">Faculty</th><th class="hide-sm">Year</th><th class="hide-sm">Interested in</th><th class="num">Received</th><th>Status</th></tr></thead><tbody>
        ${rows.map(r => `<tr data-open="members:${esc(r.id)}" tabindex="0">
          <td><span class="primary">${esc(r.full_name)}</span><span class="secondary">${esc(r.email)}</span></td>
          <td class="hide-sm">${r.faculty ? `<span class="primary">${esc(r.faculty)}</span>` : '<span class="dash">–</span>'}${r.programme ? `<span class="secondary">${esc(r.programme)}</span>` : ''}</td>
          <td class="hide-sm">${r.study_year ? esc(r.study_year) : '<span class="dash">–</span>'}</td>
          <td class="hide-sm"><div class="chips">${(r.interests || []).map(i => `<span class="chip">${esc(i)}</span>`).join('') || '<span class="dash">–</span>'}</div></td>
          <td class="num">${esc(recent(r.created_at))}</td><td>${pill(r.status)}</td></tr>`).join('')}
        </tbody></table>` : `<p class="empty">${state.search ? 'No registrations match your search.' : f === 'new' ? 'No new registrations right now. New sign-ups from the Membership page appear here.' : 'Nothing here yet.'}</p>`}</div>`;
  }

  function openRegistration(r) {
    openDrawer({
      title: r.full_name,
      values: r,
      fields: [
        { type: 'html', html: `<dl class="kv">
          <dt>Email</dt><dd><a href="mailto:${esc(r.email)}?subject=${encodeURIComponent('Welcome to NovUM')}">${esc(r.email)}</a></dd>
          <dt>Faculty</dt><dd>${esc(r.faculty) || '<span class="dash">–</span>'}</dd>
          <dt>Programme</dt><dd>${esc(r.programme) || '<span class="dash">–</span>'}</dd>
          <dt>Year</dt><dd>${esc(r.study_year) || '<span class="dash">–</span>'}</dd>
          <dt>Interested in</dt><dd>${esc((r.interests || []).join(', ')) || '<span class="dash">–</span>'}</dd>
          <dt>Received</dt><dd>${esc(timeFmt.format(new Date(r.created_at)))}</dd></dl>
          ${r.message ? `<p style="margin:16px 0 6px;font-weight:600">Their message</p><div class="readonly">${esc(r.message)}</div>` : ''}` },
        { name: 'status', label: 'Status', type: 'select', options: [['new', 'New'], ['contacted', 'Contacted'], ['member', 'Member'], ['declined', 'Declined']] },
        { name: 'notes', label: 'Board notes', type: 'textarea', hint: 'Only visible to the board.' }
      ],
      onSave: v => persist('members', { id: r.id, ...v }),
      onDelete: () => destroy('members', r.id, 'Registration deleted'),
      deleteLabel: 'Delete registration'
    });
  }

  // ---- inbox: messages
  function renderMessages() {
    const all = D().messages;
    const f = state.filter.messages;
    const rows = all.filter(r => (f === 'all' || r.status === f) && matches(r, ['name', 'email', 'topic', 'message']));
    return `<div class="title-row"><div><h1>Messages</h1><p class="sub">${inboxFinding(all, 'message')}</p></div>
        <div class="actions"><button class="b" type="button" data-export="messages">Export CSV</button></div></div>
      <div class="toolbar">${statusTabs('messages', ['new', 'answered', 'closed'], all)}
        <input class="search" id="search" type="search" placeholder="Search name, email or message" value="${esc(state.search)}" aria-label="Search messages"></div>
      <div class="panel">${rows.length ? `<table><thead><tr><th>From</th><th>About</th><th class="hide-sm">Message</th><th class="num">Received</th><th>Status</th></tr></thead><tbody>
        ${rows.map(r => `<tr data-open="messages:${esc(r.id)}" tabindex="0">
          <td><span class="primary">${esc(r.name)}</span><span class="secondary">${esc(r.email)}</span></td>
          <td><span class="primary">${esc(r.topic)}</span>${r.council ? `<span class="secondary">${esc(councilName(r.council))}</span>` : ''}</td>
          <td class="hide-sm clip"><span>${esc(r.message)}</span></td>
          <td class="num">${esc(recent(r.created_at))}</td><td>${pill(r.status)}</td></tr>`).join('')}
        </tbody></table>` : `<p class="empty">${state.search ? 'No messages match your search.' : f === 'new' ? 'No new messages. Messages from the Contact page appear here.' : 'Nothing here yet.'}</p>`}</div>`;
  }

  function openMessage(r) {
    const subject = encodeURIComponent('Re: ' + r.topic);
    const body = encodeURIComponent(`Hi ${first(r.name)},\n\n\n\nBest wishes,\nNovUM\n\n> ${r.message.replace(/\n/g, '\n> ')}`);
    openDrawer({
      title: `${r.topic}`,
      values: r,
      fields: [
        { type: 'html', html: `<dl class="kv"><dt>From</dt><dd>${esc(r.name)}</dd><dt>Email</dt><dd>${esc(r.email)}</dd>
            ${r.council ? `<dt>Council</dt><dd>${esc(councilName(r.council))}</dd>` : ''}<dt>Received</dt><dd>${esc(timeFmt.format(new Date(r.created_at)))}</dd></dl>
            <div class="readonly" style="margin-top:16px">${esc(r.message)}</div>
            <p style="margin:12px 0 0"><a class="b b-primary" href="mailto:${esc(r.email)}?subject=${subject}&body=${body}">Reply by email</a></p>` },
        { name: 'status', label: 'Status', type: 'select', options: [['new', 'New'], ['answered', 'Answered'], ['closed', 'Closed']], hint: 'Set to Answered once you have replied.' },
        { name: 'notes', label: 'Board notes', type: 'textarea', hint: 'Only visible to the board, e.g. who is handling it.' }
      ],
      onSave: v => persist('messages', { id: r.id, ...v }),
      onDelete: () => destroy('messages', r.id, 'Message deleted'),
      deleteLabel: 'Delete message'
    });
  }

  // ---- inbox: student priorities poll
  function renderPoll() {
    const votes = D().priority_votes;
    if (votes === null) {
      return `<div class="title-row"><div><h1>Poll results</h1><p class="sub">The poll isn't set up in the database yet. Run <code>supabase/priority_poll.sql</code> in the Supabase SQL Editor once; after that, votes from the home page appear here.</p></div></div>`;
    }
    const pillars = [...D().pillars].sort(bySort);
    const total = votes.length;
    const count = id => votes.filter(v => v.pillar_id === id).length;
    const other = { p: { id: null, title: 'Something else' }, n: votes.filter(v => !v.pillar_id).length };
    const ranked = [...pillars.map(p => ({ p, n: count(p.id) })), other].sort((a, b) => b.n - a.n);
    const titleOf = id => id ? (pillars.find(p => p.id === id)?.title || 'Removed pillar') : 'Something else';
    const written = votes.filter(v => (v.detail || '').trim()).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const max = Math.max(1, ...ranked.map(r => r.n));
    const faculties = ['FASoS', 'FHML', 'Law', 'FPN', 'SBE', 'FSE', ''];
    const facLabel = f => f || 'Not given';
    const lead = ranked[0];
    const sub = total ? `<b>${total.toLocaleString('en-GB')} votes</b> so far. ${esc(lead.p.title)} leads with ${Math.round(100 * lead.n / total)}%.` : 'No votes yet. The poll is on the home page under "What should NovUM fight for next?".';
    return `<div class="title-row"><div><h1>Poll results</h1><p class="sub">${sub}</p></div>
        <div class="actions"><button class="b b-danger" type="button" id="resetPoll" ${total ? '' : 'disabled'}>Reset poll</button></div></div>
      <section class="panel"><div class="panel-head"><div><h2>Most important issue</h2><p>Share of all votes</p></div></div>
        <div class="panel-body"><ul class="poll-admin">${ranked.map(r => `<li><span class="name">${esc(r.p.title)}</span>
          <span class="track"><span style="width:${(100 * r.n / max).toFixed(1)}%"></span></span>
          <span class="num">${r.n.toLocaleString('en-GB')}</span><span class="num pct">${total ? Math.round(100 * r.n / total) : 0}%</span></li>`).join('')}</ul></div></section>
      <section class="panel"><div class="panel-head"><div><h2>By faculty</h2><p>Number of votes per faculty and issue</p></div></div>
        <div style="overflow-x:auto;margin-top:8px"><table><thead><tr><th>Faculty</th>${pillars.map(p => `<th class="num">${esc(p.title)}</th>`).join('')}<th class="num">Something else</th><th class="num">Total</th></tr></thead><tbody>
        ${faculties.map(f => { const fv = votes.filter(v => (v.faculty || '') === f); return `<tr style="cursor:default"><td>${esc(facLabel(f))}</td>${pillars.map(p => `<td class="num">${fv.filter(v => v.pillar_id === p.id).length || '<span class="dash">–</span>'}</td>`).join('')}<td class="num">${fv.filter(v => !v.pillar_id).length || '<span class="dash">–</span>'}</td><td class="num"><b>${fv.length}</b></td></tr>`; }).join('')}
        </tbody></table></div></section>
      <section class="panel"><div class="panel-head"><div><h2>What students wrote</h2><p>${written.length} written answer${written.length === 1 ? '' : 's'}, newest first. Only the board can see these.</p></div></div>
        ${written.length ? `<table><thead><tr><th>Answer</th><th>Issue</th><th class="hide-sm">Faculty</th><th class="num">Received</th></tr></thead><tbody>
          ${written.slice(0, 200).map(v => `<tr style="cursor:default"><td class="clip"><span>${esc(v.detail)}</span></td><td><span class="chip">${esc(titleOf(v.pillar_id))}</span></td><td class="hide-sm">${esc(facLabel(v.faculty || ''))}</td><td class="num">${esc(recent(v.created_at))}</td></tr>`).join('')}
        </tbody></table>` : '<p class="empty">No written answers yet. Students can explain their choice under "What exactly should we fight for?".</p>'}</section>`;
  }

  // ---- website: privacy statement editor
  const privacyRow = () => (D().site_texts || []).find(t => t.slug === 'privacy');
  let privacyDefault = null; // the built-in text (content/privacy.md), fetched once
  async function builtInPrivacy() {
    if (privacyDefault === null) privacyDefault = await fetch('content/privacy.md', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').catch(() => '');
    return privacyDefault;
  }

  function renderPrivacy() {
    if (D().site_texts === null) {
      return `<div class="title-row"><div><h1>Privacy statement</h1><p class="sub">Editing isn't set up in the database yet. Run <code>supabase/site_texts.sql</code> in the Supabase SQL Editor once; after that you can edit the privacy statement here.</p></div></div>`;
    }
    const row = privacyRow();
    const sub = row
      ? `Last saved ${esc(timeFmt.format(new Date(row.updated_at)))}${row.updated_by ? ` by ${esc(row.updated_by)}` : ''}. The website shows this version.`
      : 'Not edited yet: the website shows the built-in version. Edit it below and save to publish your version.';
    return `<div class="title-row"><div><h1>Privacy statement</h1><p class="sub">${sub}</p></div>
        <div class="actions"><a class="b" href="privacy.html" target="_blank" rel="noopener">View on website</a><button class="b b-primary" type="button" id="savePrivacy" disabled>Save and publish</button></div></div>
      <div class="editor-grid">
        <section class="panel"><div class="panel-head"><div><h2>Text</h2><p>Changes appear in the preview as you type.</p></div>
            <button class="b b-quiet" type="button" id="resetPrivacy">Start from built-in version</button></div>
          <div class="panel-body"><label class="visually-hidden" for="privacyText">Privacy statement text</label>
            <textarea id="privacyText" class="editor" spellcheck="true" placeholder="Loading…"></textarea>
            <details class="fmt-help"><summary>How to format</summary>
              <dl class="kv"><dt><code>## Title</code></dt><dd>Section heading</dd><dt><code>### Title</code></dt><dd>Smaller heading</dd>
              <dt><code>- item</code></dt><dd>List item (one per line)</dd><dt><code>**text**</code></dt><dd><b>Bold</b></dd>
              <dt><code>[text](https://…)</code></dt><dd>Link (also <code>mailto:</code> for email)</dd><dt>Empty line</dt><dd>New paragraph</dd></dl>
              <p class="hint" style="margin-top:8px">Fill in everything in [square brackets] before publishing. Ask the board to read changes before you save: this is a legal text.</p>
            </details></div></section>
        <section class="panel"><div class="panel-head"><div><h2>Preview</h2><p>How it will look on the website.</p></div></div>
          <div class="panel-body"><div class="legal-preview" id="privacyPreview"></div></div></section>
      </div>`;
  }

  async function bindPrivacyEditor() {
    const ta = document.getElementById('privacyText');
    if (!ta) return;
    const row = privacyRow(), save = document.getElementById('savePrivacy'), preview = document.getElementById('privacyPreview');
    let saved = row ? row.body : await builtInPrivacy();
    ta.value = saved; ta.placeholder = '';
    const update = () => {
      preview.innerHTML = NovumText.render(ta.value);
      const dirty = ta.value !== saved || !row;
      save.disabled = !dirty || !ta.value.trim();
      save.textContent = dirty ? 'Save and publish' : 'Saved';
      const left = (ta.value.match(/\[[^\]\n]+\](?!\()/g) || []).length;
      preview.dataset.todo = left ? `${left} placeholder${left > 1 ? 's' : ''} in [square brackets] still to fill in` : '';
    };
    ta.addEventListener('input', update); update();
    document.getElementById('resetPrivacy').addEventListener('click', async () => {
      if (ta.value !== saved && !confirm('Replace your text with the built-in version? Unsaved changes are lost.')) return;
      ta.value = await builtInPrivacy(); update();
    });
    save.addEventListener('click', async () => {
      const left = (ta.value.match(/\[[^\]\n]+\](?!\()/g) || []).length;
      if (left && !confirm(`There ${left === 1 ? 'is 1 placeholder' : `are ${left} placeholders`} in [square brackets] that will appear on the website. Publish anyway?`)) return;
      save.disabled = true; save.textContent = 'Saving…';
      try {
        const out = await store.saveText('privacy', ta.value);
        D().site_texts = [...(D().site_texts || []).filter(t => t.slug !== 'privacy'), out];
        toast('Privacy statement published'); render();
      } catch (e) { console.error(e); toast('Could not save: ' + e.message, true); update(); }
    });
  }

  // ---- website: our work
  function renderWork() {
    const pillars = [...D().pillars].sort(bySort);
    const total = D().achievements.length;
    return `<div class="title-row"><div><h1>Our work</h1><p class="sub">${pillars.length} pillars and ${total} achievements on the Our work page. Achievements linked to a council also appear under that council.</p></div>
        <div class="actions"><button class="b" type="button" data-new="pillar">Add pillar</button></div></div>
      ${pillars.map(p => {
        const wins = D().achievements.filter(a => a.pillar_id === p.id).sort(bySort);
        return `<section class="panel"><div class="panel-head"><div><h2>${esc(p.title)}</h2><p>${esc(p.summary)}</p></div>
            <div class="actions"><button class="b b-quiet" type="button" data-edit="pillars:${esc(p.id)}">Edit pillar</button><button class="b" type="button" data-new="achievement:${esc(p.id)}">Add achievement</button></div></div>
          <div style="margin-top:12px">${wins.map(a => `<div class="ach" data-edit="achievements:${esc(a.id)}" tabindex="0" role="button">
              <div><span style="font-weight:600">${esc(a.title)}</span><div class="secondary">${esc(a.description)}</div></div>
              <div class="council-col">${a.council_id ? `<span class="chip">${esc(councilName(a.council_id))}</span>` : '<span class="dash">–</span>'}</div>
              <span class="b b-quiet" aria-hidden="true">Edit</span></div>`).join('') || '<p class="empty">No achievements yet.</p>'}</div></section>`;
      }).join('')}`;
  }

  const councilOptions = (blank = 'No council') => [['', blank], ...D().councils.slice().sort(bySort).map(c => [c.id, councilName(c.id)])];

  function editPillar(p = {}) {
    openDrawer({
      title: p.id ? 'Edit pillar' : 'New pillar', values: { sort: (D().pillars.length + 1), ...p },
      fields: [
        { name: 'title', label: 'Title', required: true },
        { name: 'summary', label: 'What we stand for', type: 'textarea', rows: 5 },
        { name: 'image_url', label: 'Illustration', type: 'photo', hint: 'Shown next to the pillar at 4:3. Leave as is to keep the drawn illustration.' },
        { name: 'sort', label: 'Order on the page', type: 'number', hint: 'Lower numbers come first.' }
      ],
      onSave: v => persist('pillars', { ...(p.id ? { id: p.id } : {}), ...v }),
      onDelete: p.id ? async () => {
        await destroy('pillars', p.id, 'Pillar deleted');
        D().achievements = D().achievements.filter(a => a.pillar_id !== p.id); // the database cascades this
      } : null,
      deleteLabel: 'Delete pillar and its achievements'
    });
  }

  function editAchievement(a = {}, pillarId) {
    openDrawer({
      title: a.id ? 'Edit achievement' : 'New achievement',
      values: { pillar_id: pillarId, sort: D().achievements.length, ...a },
      fields: [
        { name: 'title', label: 'Title', required: true, hint: 'Short, e.g. "Carbon neutral by 2030".' },
        { name: 'description', label: 'What we did', type: 'textarea' },
        { name: 'pillar_id', label: 'Pillar', type: 'select', options: D().pillars.slice().sort(bySort).map(p => [p.id, p.title]), half: true },
        { name: 'council_id', label: 'Council', type: 'select', options: councilOptions('Not tied to one council'), nullable: true, half: true },
        { name: 'sort', label: 'Order', type: 'number', hint: 'Lower numbers come first.' }
      ],
      onSave: v => persist('achievements', { ...(a.id ? { id: a.id } : {}), ...v }),
      onDelete: a.id ? () => destroy('achievements', a.id, 'Achievement deleted') : null,
      deleteLabel: 'Delete achievement'
    });
  }

  // ---- website: councils (councillors per council)
  function renderCouncils() {
    const councils = [...D().councils].sort(bySort);
    const reps = D().people.filter(p => p.kind === 'councillor');
    const empty = councils.filter(c => !reps.some(p => p.council_id === c.id));
    const sub = empty.length
      ? `<b>${empty.length} of ${councils.length} councils</b> have no councillor profile yet: ${empty.map(c => esc(councilName(c.id))).join(', ')}. They show "To be announced" on the website.`
      : `Every council has at least one councillor profile.`;
    return `<div class="title-row"><div><h1>Councils</h1><p class="sub">${sub}</p></div>
        <div class="actions"><button class="b b-primary" type="button" data-new="person:councillor">Add councillor</button></div></div>
      <div class="council-grid">${councils.map(c => {
        const list = reps.filter(p => p.council_id === c.id).sort(bySort);
        return `<section class="panel council-card">
          <div class="panel-head"><div><h2>${esc(councilName(c.id))}</h2><p>${list.length} councillor${list.length === 1 ? '' : 's'}</p></div>
            <button class="b b-quiet" type="button" data-new="person:councillor:${esc(c.id)}">Add councillor</button></div>
          <ul class="rows" style="margin-top:12px">${list.map(personRow).join('') || `<li class="seat-open">No councillor profile yet.</li>`}</ul></section>`;
      }).join('')}</div>`;
  }

  function personRow(p) {
    const meta = [p.role, p.kind === 'alumni' ? p.period : '', p.kind === 'councillor' ? p.study : ''].filter(Boolean).join(' · ');
    return `<li class="row${p.kind === 'councillor' ? ' row-plain' : ''}" data-edit="people:${esc(p.id)}" tabindex="0" role="button">${p.kind === 'councillor' ? '' : avatar(p)}
      <div><span style="font-weight:600">${esc(p.name)}</span><div class="meta">${esc(meta) || '<span class="dash">–</span>'}${p.active === false ? '<span class="pill s-hidden">Hidden</span>' : ''}</div></div>
      <span class="b b-quiet" aria-hidden="true">Edit</span></li>`;
  }

  // ---- website: board and alumni
  function renderPeople(kind) {
    const list = D().people.filter(p => p.kind === kind).sort(bySort);
    const isBoard = kind === 'board';
    const shown = list.filter(p => p.active !== false).length;
    const sub = isBoard
      ? `${shown} board member${shown === 1 ? '' : 's'} on the Board page${list.length > shown ? `, ${list.length - shown} hidden` : ''}. When a new board starts, delete the old members (or untick “Show on the website”) and add the new ones.`
      : list.length ? `${shown} alumni on the Alumni page${list.length > shown ? `, ${list.length - shown} hidden` : ''}.` : 'No alumni profiles yet. Until you add some, the Alumni page shows open slots and an invitation to get in touch.';
    return `<div class="title-row"><div><h1>${isBoard ? 'Board' : 'Alumni'}</h1><p class="sub">${sub}</p></div>
        <div class="actions"><button class="b b-primary" type="button" data-new="person:${kind}">${isBoard ? 'Add board member' : 'Add alum'}</button></div></div>
      <div class="panel"><ul class="rows">${list.map(personRow).join('') || `<li class="empty">Nobody here yet.</li>`}</ul></div>`;
  }

  function editPerson(p = {}, kind, councilId) {
    kind = p.kind || kind;
    const labels = { board: 'board member', councillor: 'councillor', alumni: 'alum' };
    const sameKind = D().people.filter(x => x.kind === kind).length;
    const fields = [
      { name: 'name', label: 'Name', required: true },
      { name: 'role', label: kind === 'board' ? 'Position' : kind === 'alumni' ? 'Role in NovUM' : 'Seat', hint: kind === 'board' ? 'e.g. President' : kind === 'alumni' ? 'e.g. President, FASoS councillor' : 'e.g. Councillor, Faculty council chair', half: kind !== 'board' },
    ];
    if (kind === 'councillor') fields.push({ name: 'council_id', label: 'Council', type: 'select', options: councilOptions('Choose a council'), nullable: true, half: true }, { name: 'study', label: 'Study programme', hint: 'Optional, shown under their name.' });
    if (kind === 'alumni') fields.push({ name: 'period', label: 'Years', hint: 'e.g. 2019–21', half: true });
    fields.push(
      { name: 'bio', label: kind === 'alumni' ? 'What they do now' : 'Short description', type: 'textarea', rows: 3 },
      ...(kind === 'councillor' ? [] : [{ name: 'photo_url', label: 'Photo', type: 'photo', hint: 'Portrait photo, JPG or PNG under 5 MB. Shown at 4:5.' }]),
      { name: 'sort', label: 'Order', type: 'number', hint: 'Lower numbers come first.' },
      { name: 'active', label: 'Show on the website', type: 'check' }
    );
    openDrawer({
      title: p.id ? `Edit ${labels[kind]}` : `New ${labels[kind]}`,
      values: { active: true, sort: sameKind + 1, council_id: councilId || null, ...p },
      fields,
      onSave: v => persist('people', { ...(p.id ? { id: p.id } : { kind }), ...v }),
      onDelete: p.id ? () => destroy('people', p.id, 'Profile deleted') : null,
      deleteLabel: `Delete ${labels[kind]}`
    });
  }


  // ---- help: handbook for the board (no secrets in here, only where to find things)
  function renderHandbook() {
    const projectUrl = (window.NOVUM_CONFIG || {}).supabaseUrl || '';
    const ref = (projectUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1];
    const dash = ref ? `https://supabase.com/dashboard/project/${ref}` : 'https://supabase.com/dashboard';
    const ext = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>`;
    return `<div class="title-row"><div><h1>Handbook</h1>
        <p class="sub">How the website works behind the scenes, for this board and the next. Keep it up to date when something changes.</p></div></div>
      <nav class="toc" aria-label="Handbook sections"><a href="#hb-overview">Overview</a><a href="#hb-supabase">Supabase</a><a href="#hb-resend">Resend</a><a href="#hb-other">Google Form, domain and hosting</a><a href="#hb-handover">New board checklist</a></nav>

      <section class="panel doc" id="hb-overview"><h2>How it fits together</h2>
        <ul>
          <li><b>The website</b> is a set of simple files, hosted online. The text of each page lives in the project folder (see README.md in the code).</li>
          <li><b>Supabase</b> is the database behind the site. It stores the pillars, achievements, board and councillors you edit on this admin page, and every contact form message. It also handles signing in to this admin page.</li>
          <li><b>Resend</b> sends an email to novum@maastrichtuniversity.nl every time someone uses the contact form.</li>
          <li><b>Google Forms</b> handles membership registrations. They don't go through Supabase.</li>
          <li><b>The student poll</b> on the home page stores anonymous votes in Supabase. See <i>Poll results</i>, and reset it at the start of each academic year.</li>
        </ul>
        <p>Day to day you only need this admin page. You need Supabase or Resend themselves only for the tasks below.</p>
      </section>

      <section class="panel doc" id="hb-supabase"><h2>Supabase</h2>
        <p><b>What it is:</b> an online database service (supabase.com). Our project is called <b>novum-website</b>${ref ? ` (project ID <code>${esc(ref)}</code>)` : ''}. It is on the free plan, which is enough for this site.</p>
        <h3>Logging in to the Supabase dashboard</h3>
        <ol>
          <li>Go to ${ext('https://supabase.com/dashboard', 'supabase.com/dashboard')} and sign in with the NovUM account: <b>novum@maastrichtuniversity.nl</b>. The password is in the board's password manager or handover document, never in this page.</li>
          <li>Open the project, or go straight to ${ext(dash, 'our project dashboard')}.</li>
          <li>Better than sharing one login: each board member can get their own. An existing member invites them under <i>Organization settings → Team → Invite</i>.</li>
        </ol>
        <h3>Logging in to this admin page</h3>
        <p>This admin page uses separate accounts, also managed in Supabase. Only people whose email is on the admin list can sign in.</p>
        <ol>
          <li><b>Add someone:</b> in Supabase, go to <i>Authentication → Users → Add user → Create new user</i> (tick <i>Auto Confirm User</i>). Then in <i>SQL Editor</i> run: <code>insert into admins (email) values ('their.email@example.com');</code> (email in lowercase).</li>
          <li><b>Remove someone:</b> in <i>SQL Editor</i> run <code>delete from admins where email = 'their.email@example.com';</code> and delete their user under <i>Authentication → Users</i>.</li>
          <li><b>Forgot password:</b> use "Forgot your password?" on the sign-in screen of this page.</li>
        </ol>
        <h3>Things you might need it for</h3>
        <ul>
          <li><b>Look at raw data:</b> <i>Table Editor</i> shows every table (messages, pillars, people…).</li>
          <li><b>Photos:</b> uploaded photos are stored under <i>Storage → media</i>.</li>
          <li><b>Never share</b> the <i>service_role</i> or <i>secret</i> key from <i>Project Settings → API</i>. It bypasses all security. The website only uses the public <i>anon</i> key.</li>
          <li><b>Free plan pause:</b> Supabase pauses free projects after about a week with no visits at all. If the site shows "Could not load", log in to the dashboard and click <i>Restore project</i>.</li>
        </ul>
      </section>

      <section class="panel doc" id="hb-resend"><h2>Resend</h2>
        <p><b>What it is:</b> an email-sending service (resend.com). Supabase uses it to email every new contact form message to <b>novum@maastrichtuniversity.nl</b>, with the sender as reply-to, so you can answer by simply replying. The free plan allows 3,000 emails a month.</p>
        <h3>Logging in</h3>
        <ol>
          <li>Go to ${ext('https://resend.com/login', 'resend.com/login')} and sign in with <b>novum@maastrichtuniversity.nl</b> (password in the board's password manager or handover document).</li>
          <li>Under <i>Emails</i> you see every email that was sent, and whether it was delivered.</li>
        </ol>
        <h3>Things you might need it for</h3>
        <ul>
          <li><b>Emails stopped arriving:</b> check <i>Emails</i> or <i>Logs</i> in Resend first, then your spam folder. The messages are always saved here on the admin page too, under <i>Messages</i>, even if an email fails.</li>
          <li><b>New API key</b> (for example if the old one leaked): in Resend, go to <i>API Keys → Create API key</i> (Sending access). Then in Supabase, paste <code>supabase/email_notifications.sql</code> from the code into <i>SQL Editor</i>, put the new key in place of <code>re_YOUR_API_KEY</code> (twice) and run it. Delete the old key in Resend.</li>
          <li><b>Send to other addresses</b> as well: this needs our domain verified in Resend (<i>Domains → Add domain</i>, then add the DNS records it shows in Cloudflare). After that, update the recipient list; see README.md.</li>
        </ul>
      </section>

      <section class="panel doc" id="hb-other"><h2>Google Form, domain and hosting</h2>
        <ul>
          <li><b>Membership form:</b> the <i>Become a member</i> page shows the Google Form "Membership registration form 26/27". Responses are in that form's <i>Responses</i> tab and linked Google Sheet, in the Google account that owns it. For a new year's form, the link in the code (<code>pages/join.html</code>) has to change.</li>
          <li><b>Domain</b> (novum-maastricht.nl): registered at One.com, with DNS managed in Cloudflare. Don't remove the One.com MX records there, or NovUM email stops working.</li>
          <li><b>Hosting:</b> the site files are published through [HOSTING, e.g. Cloudflare Pages]. Changes to the code go live when they are pushed to [GitHub repository].</li>
        </ul>
      </section>

      <section class="panel doc" id="hb-handover"><h2>New board checklist</h2>
        <ol>
          <li>Hand over the logins for Supabase, Resend, Cloudflare, One.com, Google (form owner) and GitHub. Change the passwords afterwards.</li>
          <li>Add the new board to this admin page (see <i>Supabase → Logging in to this admin page</i>) and remove the old board.</li>
          <li>Remove the old board members (delete them, or untick <i>Show on the website</i>) and add the new board with their photos.</li>
          <li>Make sure everyone pictured has agreed to their photo being on the site.</li>
          <li>Check the <i>Our work</i> pillars and achievements are still current.</li>
          <li>Delete old contact messages you no longer need (the privacy statement promises we don't keep them longer than necessary).</li>
          <li>Read the <i>Privacy statement</i> and update anything that changed (contact details, services used, retention periods).</li>
          <li>Update this handbook if anything changed. It lives in <code>js/admin.js</code> in the code.</li>
        </ol>
      </section>`;
  }

  // ---- CSV export
  function exportCsv(table) {
    const cols = table === 'members'
      ? ['created_at', 'full_name', 'email', 'faculty', 'programme', 'study_year', 'interests', 'message', 'status', 'notes']
      : ['created_at', 'name', 'email', 'topic', 'council', 'message', 'status', 'notes'];
    const kind = table === 'members' ? 'registrations' : 'messages';
    const f = state.filter[kind];
    const rows = D()[table].filter(r => f === 'all' || r.status === f);
    const cell = v => `"${String(Array.isArray(v) ? v.join('; ') : v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `novum-${kind}-${f}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  // ---- one click handler for the whole canvas
  app.addEventListener('click', e => {
    const jump = e.target.closest('a[href^="#hb-"]');
    if (jump) { e.preventDefault(); document.querySelector(jump.getAttribute('href'))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const t = e.target.closest('[data-filter],[data-open],[data-edit],[data-new],[data-export]');
    if (!t) return;
    if (t.dataset.filter) { const [k, s] = t.dataset.filter.split(':'); state.filter[k] = s; render(); return; }
    if (t.dataset.export) { exportCsv(t.dataset.export); return; }
    if (t.dataset.open || t.dataset.edit) {
      const [table, id] = (t.dataset.open || t.dataset.edit).split(':');
      const row = D()[table].find(r => String(r.id) === id);
      if (!row) return;
      ({ members: openRegistration, messages: openMessage, pillars: editPillar, achievements: a => editAchievement(a), people: p => editPerson(p) })[table](row);
      return;
    }
    if (t.dataset.new) {
      const [what, a, b] = t.dataset.new.split(':');
      if (what === 'pillar') editPillar();
      if (what === 'achievement') editAchievement({}, a);
      if (what === 'person') editPerson({}, a, b);
    }
  });
  app.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open],[data-edit][tabindex]')) { e.preventDefault(); e.target.click(); }
  });
  addEventListener('hashchange', () => {
    const r = location.hash.slice(1);
    if (SCREENS[r] && state.data) { state.route = r; state.search = ''; closeDrawer(); render(); scrollTo(0, 0); }
  });

  // ------------------------------------------------------------------ sign-in, setup, start
  const brand = `<span class="brand"><img src="img/logo.png" alt=""><span><b>NovUM</b><span>Board admin</span></span></span>`;

  function renderSetup() {
    app.innerHTML = `<div class="gate"><div class="panel setup">${brand}
      <h1>Connect the admin page to Supabase</h1>
      <p>The admin page needs a Supabase project before anyone can sign in. The full steps are in README.md.</p>
      <ol>
        <li>Create a free project at supabase.com.</li>
        <li>In the SQL Editor, run <code>supabase/schema.sql</code> and then <code>supabase/seed.sql</code>.</li>
        <li>Copy the project URL and anon key from Project Settings → API into <code>js/config.js</code>.</li>
        <li>Add each board member under Authentication → Users, and add their email to the <code>admins</code> table.</li>
      </ol>
      <p style="margin-top:20px"><a class="b b-primary" href="admin.html?demo">Try the demo with sample data</a></p></div></div>`;
  }

  function renderLogin(message) {
    app.innerHTML = `<div class="gate"><div class="panel">${brand}
      <h1>Sign in</h1><p>For NovUM board members.</p>
      <form id="login" method="post" novalidate>
        <div class="f"><label for="l-email">Email</label><input id="l-email" type="email" autocomplete="username" required></div>
        <div class="f"><label for="l-pass">Password</label><input id="l-pass" type="password" autocomplete="current-password" required></div>
        ${message ? `<p class="err" role="alert">${esc(message)}</p>` : ''}
        <button class="b b-primary" type="submit">Sign in</button>
        <button class="b b-quiet" type="button" id="forgot">Forgot your password?</button>
      </form></div></div>`;
    const form = document.getElementById('login');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const email = form.querySelector('#l-email').value.trim(), password = form.querySelector('#l-pass').value;
      if (!email || !password) return renderLogin('Enter your email and password.');
      form.querySelector('[type=submit]').disabled = true;
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return renderLogin(error.message === 'Invalid login credentials' ? 'That email and password don\'t match.' : error.message);
      start();
    });
    document.getElementById('forgot').addEventListener('click', async () => {
      const email = form.querySelector('#l-email').value.trim();
      if (!email) return renderLogin('Enter your email first, then press "Forgot your password?".');
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      toast(error ? error.message : 'Check your email for a link to set a new password.', !!error);
    });
  }

  function renderNewPassword() {
    app.innerHTML = `<div class="gate"><div class="panel">${brand}<h1>Set a new password</h1><p>At least 8 characters.</p>
      <form id="pw" method="post" novalidate><div class="f"><label for="p1">New password</label><input id="p1" type="password" autocomplete="new-password" minlength="8" required></div>
      <button class="b b-primary" type="submit">Save password</button></form></div></div>`;
    document.getElementById('pw').addEventListener('submit', async e => {
      e.preventDefault();
      const password = document.getElementById('p1').value;
      if (password.length < 8) return toast('Use at least 8 characters', true);
      const { error } = await client.auth.updateUser({ password });
      if (error) return toast(error.message, true);
      toast('Password saved'); history.replaceState(null, '', location.pathname); start();
    });
  }

  async function loadAndRender() {
    try { state.data = await store.load(); }
    catch (e) { console.error(e); app.innerHTML = `<div class="gate"><div class="panel">${brand}<h1>Could not load the data</h1><p>${esc(e.message)}</p><button class="b" type="button" id="retry">Try again</button></div></div>`; document.getElementById('retry').addEventListener('click', () => location.reload()); return; }
    const r = location.hash.slice(1);
    state.route = SCREENS[r] ? r : 'messages';
    render();
  }

  async function start() {
    if (DEMO) { state.email = 'Demo board member'; return loadAndRender(); }
    if (!api.configured) return renderSetup();
    const { data: { session } } = await client.auth.getSession();
    if (!session) return renderLogin();
    const { data: isAdmin, error } = await client.rpc('is_admin');
    if (error || !isAdmin) {
      await client.auth.signOut();
      return renderLogin(error ? error.message : 'This account is not on the NovUM admin list. Ask the board to add your email.');
    }
    state.email = session.user.email;
    loadAndRender();
  }

  if (client) client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') renderNewPassword(); });
  start();
})();
