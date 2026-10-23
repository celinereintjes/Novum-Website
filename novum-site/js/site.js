(function () {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => (u && /^(https?:\/\/|img\/|\/)/i.test(u) ? esc(u) : '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ams = d => new Date(new Date(d).toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }));
  const dayFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric' });
  const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short' });
  const longFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Amsterdam' });

  let data;

  // ---------- our work: the five pillars and what we achieved ----------
  const slug = t => String(t).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Credits for the pillar photos (Wikimedia Commons). Required by their licences; keep them with the photos.
  const PHOTO_CREDITS = {
    "education": {
      "author": "Romaine",
      "license": "CC0",
      "licenseUrl": "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
      "source": "https://commons.wikimedia.org/wiki/File:Maastricht-Universiteitsbibliotheek_aan_de_Nieuwenhofstraat_(1).jpg"
    },
    "internationalism": {
      "author": "Kleon3",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "source": "https://commons.wikimedia.org/wiki/File:2023_Maastricht,_Gouvernement_aan_de_Maas_(15).jpg"
    },
    "wellbeing": {
      "author": "Arthur Crbz",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "source": "https://commons.wikimedia.org/wiki/File:Stadspark_Maastricht_Fountain_1.jpg"
    },
    "housing": {
      "author": "Ben Bender",
      "license": "CC BY-SA 3.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
      "source": "https://commons.wikimedia.org/wiki/File:Sint_Bernardusstraat,_Maastricht,_Netherlands_-_panoramio_(23).jpg"
    },
    "sustainability": {
      "author": "Mark Ahsmann",
      "license": "CC BY-SA 4.0",
      "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
      "source": "https://commons.wikimedia.org/wiki/File:20150312_Maastricht;_Bicycles_at_Station_Maastricht_01.jpg"
    }
  };
  // A pillar's own image_url wins, unless it is one of the old bundled drawings: then the photo is used.
  const pillarArt = p => {
    const own = safeUrl(p.image_url);
    if (own && !/^img\/pillars\/[a-z-]+\.svg$/.test(own)) return own;
    return PHOTO_CREDITS[slug(p.title)] ? `img/pillars/${slug(p.title)}.jpg` : (own || `img/pillars/${slug(p.title)}.svg`);
  };
  const photoCredit = p => {
    const c = PHOTO_CREDITS[slug(p.title)];
    if (!c || (safeUrl(p.image_url) && !/^img\/pillars\/[a-z-]+\.svg$/.test(p.image_url))) return '';
    return `<figcaption class="photo-credit">Photo: <a href="${esc(c.source)}" target="_blank" rel="noopener">${esc(c.author)}</a>, <a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener">${esc(c.license)}</a></figcaption>`;
  };

  function renderPillarCards() {
    if (!$('#pillarCards')) return;
    $('#pillarCards').innerHTML = data.pillars.map(p => `<li class="pillar-card reveal">
      <a href="work.html#${slug(p.title)}">
        <img src="${pillarArt(p)}" alt="" loading="lazy">
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.summary)}</p>
        <span class="more">Read more</span>
      </a></li>`).join('');
  }

  function renderPillars() {
    if (!$('#pillars')) return;
    $('#pillarJump').innerHTML = data.pillars.map((p, i) => `<a class="st-col" href="#${slug(p.title)}">
      <span class="st-cap"></span><span class="st-shaft"><b>${String(i + 1).padStart(2, '0')}</b><strong>${esc(p.title)}</strong></span></a>`).join('');
    $('#pillars').innerHTML = data.pillars.map(p => {
      const wins = data.achievements.filter(a => a.pillar_id === p.id);
      const art = pillarArt(p);
      return `<article class="pillar" id="${slug(p.title)}">
        <figure class="pillar-art reveal"><img src="${art}" alt="" loading="lazy">${photoCredit(p)}</figure>
        <div class="pillar-body">
          <h3 class="reveal">${esc(p.title)}</h3>
          <p class="pillar-summary reveal">${esc(p.summary)}</p>
          ${wins.length ? `<details class="pillar-more reveal">
            <summary>What we've achieved <span class="count">${wins.length}</span></summary>
            <ul class="pillar-wins">${wins.map(a => `<li><b>${esc(a.title)}</b><span>${esc(a.description)}</span></li>`).join('')}</ul>
          </details>` : ''}
        </div>
      </article>`;
    }).join('');
  }

  // ---------- our work: what our councillors did in each faculty council ----------
  function renderFacultyWork() {
    if (!$('#fwChoices')) return;
    const faculties = data.councils.filter(c => c.id !== 'uc');
    // until supabase/our_work_feedback.sql has run, live achievements have no council: take it from js/data.js by title
    const builtIn = ((window.NOVUM_DEMO || {}).achievements || []);
    const councilOf = a => 'council_id' in a ? a.council_id : (builtIn.find(b => b.title === a.title) || {}).council_id;
    const work = id => data.achievements.filter(a => councilOf(a) === id);
    const reps = id => data.people.filter(p => p.kind === 'councillor' && p.council_id === id && p.active !== false);
    const pillarOf = a => data.pillars.find(p => p.id === a.pillar_id);
    $('#fwChoices').innerHTML = faculties.map(c => `<button type="button" data-id="${esc(c.id)}" aria-pressed="false" title="${esc(c.name)}">
      ${esc(c.short_name)}${work(c.id).length ? `<span class="n">${work(c.id).length}</span>` : ''}</button>`).join('');
    const show = id => {
      const c = faculties.find(x => x.id === id);
      if (!c) return;
      $('#fwChoices').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
      const items = work(id), names = reps(id).map(p => p.name);
      $('#fwResult').innerHTML = `
        <div class="fw-head"><h3>${esc(c.name)}</h3>
          ${names.length ? `<p>Your NovUM councillors: ${names.map(esc).join(', ')}</p>` : ''}</div>
        ${items.length ? `<ul class="fw-list">${items.map(a => `<li>
            ${pillarOf(a) ? `<span class="fw-tag">${esc(pillarOf(a).title)}</span>` : ''}
            <b>${esc(a.title)}</b><span>${esc(a.description)}</span></li>`).join('')}</ul>`
          : `<p class="fw-empty">We haven't listed work from the ${esc(c.short_name)} council here yet. Our councillors there are busy: ask them what they're working on, or tell them what should change.</p>`}
        <div class="actions">
          <a class="btn" href="contact.html?council=${esc(c.id)}">Message your ${esc(c.short_name)} councillors</a>
          <a class="btn btn-outline" href="councils.html?faculty=${esc(c.id)}#finder">Who represents me?</a>
        </div>`;
    };
    $('#fwChoices').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) show(b.dataset.id); });
    // work.html?faculty=fse opens that faculty; otherwise start with the first faculty that has work listed
    const pre = new URLSearchParams(location.search).get('faculty');
    show(faculties.some(c => c.id === pre) ? pre : (faculties.find(c => work(c.id).length) || faculties[0]).id);
  }

  // ---------- our work: the councillors in each council (names only) ----------
  function renderCouncilList() {
    if (!$('#councilList')) return;
    $('#councilList').innerHTML = data.councils.map(c => {
      const reps = data.people.filter(p => p.kind === 'councillor' && p.council_id === c.id && p.active !== false);
      const title = c.short_name === 'University' ? 'University Council' : c.short_name;
      return `<article class="council-box reveal">
        <h3>${esc(title)}</h3>
        <p class="council-full">${esc(c.short_name === 'University' ? 'The university-wide council' : c.name)}</p>
        ${reps.length ? `<ul class="names">${reps.map(p => `<li>${esc(p.name)}</li>`).join('')}</ul>` : '<p class="quiet">To be announced</p>'}
        <a class="council-msg" href="contact.html?council=${esc(c.id)}">Message the ${esc(title)} councillors</a>
      </article>`;
    }).join('');
  }

  // ---------- home: "Who represents me?" ----------
  function renderFinder() {
    if (!$('#finderChoices')) return;
    const faculties = data.councils.filter(c => c.id !== 'uc');
    const uc = data.councils.find(c => c.id === 'uc');
    const reps = id => data.people.filter(p => p.kind === 'councillor' && p.council_id === id && p.active !== false);
    $('#finderChoices').innerHTML = faculties.map(c =>
      `<button type="button" data-id="${esc(c.id)}" aria-pressed="false" title="${esc(c.name)}">${esc(c.short_name)}</button>`).join('');
    $('#finderChoices').addEventListener('click', e => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      $('#finderChoices').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      const c = faculties.find(x => x.id === b.dataset.id);
      const list = people => people.length
        ? `<ul>${people.map(p => `<li>${esc(p.name)}</li>`).join('')}</ul>`
        : '<p class="quiet">To be announced</p>';
      const mine = reps(c.id), ucReps = uc ? reps(uc.id) : [];
      $('#finderResult').innerHTML = `
        <h3>${mine.length ? `You have ${mine.length} NovUM councillor${mine.length > 1 ? 's' : ''} at ${esc(c.short_name)}` : `Your NovUM councillors at ${esc(c.short_name)}`}</h3>
        <p class="council-full">${esc(c.name)}</p>
        <div class="finder-groups">
          <div><p>In your faculty council</p>${list(mine)}</div>
          <div><p>In the University Council</p>${list(ucReps)}</div>
        </div>
        <div class="actions">
          <a class="btn" href="contact.html?council=${esc(c.id)}">Message your ${esc(c.short_name)} councillors</a>
          <a class="btn btn-outline" href="work.html">What we've achieved</a>
        </div>`;
    });
    // links like councils.html?faculty=fse#finder open that faculty straight away
    const pre = new URLSearchParams(location.search).get('faculty');
    if (pre) $(`#finderChoices button[data-id="${CSS.escape(pre)}"]`)?.click();
  }

  // ---------- home: "What should NovUM fight for next?" poll ----------
  // One vote per browser per academic year (a soft limit; the database also caps votes per hour).
  const academicYear = (() => { const d = new Date(); const y = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1; return `${y}-${String(y + 1).slice(2)}`; })();
  const VOTE_KEY = `novum-poll-${academicYear}`;
  const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  function setupPoll() {
    const form = $('#pollForm');
    if (!form) return;
    $('#pollOptions').innerHTML = data.pillars.map((p, i) => `
      <label class="poll-option">
        <input type="radio" name="pillar" value="${esc(p.id)}" ${i === 0 ? 'required' : ''}>
        <img src="${pillarArt(p)}" alt="" loading="lazy">
        <span>${esc(p.title)}</span>
      </label>`).join('') + `
      <label class="poll-option poll-other">
        <input type="radio" name="pillar" value="other">
        <i aria-hidden="true">+</i>
        <span>Something else</span>
      </label>`;
    // "Something else" makes the text box required and changes its wording
    const detailLabel = $('#pollDetailLabel'), detail = $('#pollDetail');
    form.addEventListener('change', e => {
      if (e.target.name !== 'pillar') return;
      const other = e.target.value === 'other';
      detail.required = other;
      detailLabel.innerHTML = other ? 'What should we fight for? <span class="opt">(required)</span>' : 'What exactly should we fight for? <span class="opt">(optional)</span>';
      detail.placeholder = other ? 'Tell us the issue in a few words' : 'For example: more affordable rooms for first-years';
      if (other) detail.focus();
    });
    $('#pollFaculty').insertAdjacentHTML('beforeend',
      data.councils.filter(c => c.id !== 'uc').map(c => `<option value="${esc(c.short_name)}">${esc(c.short_name)}</option>`).join(''));

    const show = async mine => {
      let rows;
      try { rows = await NovumAPI.pollResults(); }
      catch (err) { console.error(err); $('#pollMsg').className = 'form-msg err'; $('#pollMsg').textContent = 'The results could not be loaded right now.'; return; }
      const total = rows.reduce((n, r) => n + r.votes, 0);
      const max = Math.max(1, ...rows.map(r => r.votes));
      const sorted = [...rows].sort((a, b) => b.votes - a.votes);
      $('#pollTotal').textContent = total ? `${total.toLocaleString('en-GB')} ${total === 1 ? 'student has' : 'students have'} voted in ${academicYear}` : `Be the first to vote in ${academicYear}`;
      const box = $('#pollResults');
      box.innerHTML = `<h3>${mine ? 'Thanks for voting. Here is where students stand:' : 'Where students stand so far'}</h3>
        <ol class="poll-bars">${sorted.map((r, i) => {
          const pct = total ? Math.round(100 * r.votes / total) : 0;
          const isMine = mine && (r.pillar_id === mine || (mine === 'other' && r.pillar_id === null));
          return `<li class="${isMine ? 'mine' : ''}${i === 0 && total ? ' lead' : ''}">
            <div class="bar-label"><b>${esc(r.title)}</b>${isMine ? '<span class="you">Your vote</span>' : ''}<span class="pct">${pct}%</span></div>
            <div class="bar"><span style="--w:${(100 * r.votes / max).toFixed(1)}%"></span></div>
          </li>`; }).join('')}</ol>
        <p class="poll-note">Our councillors use these results to set priorities for ${academicYear}.${mine ? '' : ' <button type="button" class="poll-back" id="pollBack">Vote now</button>'}</p>`;
      form.hidden = true; box.hidden = false;
      requestAnimationFrame(() => box.classList.add('in'));
      $('#pollBack')?.addEventListener('click', () => { box.hidden = true; box.classList.remove('in'); form.hidden = false; });
    };

    const voted = store.get(VOTE_KEY);
    if (voted) show(voted); else NovumAPI.pollResults().then(rows => {
      const total = rows.reduce((n, r) => n + r.votes, 0);
      $('#pollTotal').textContent = total ? `${total.toLocaleString('en-GB')} ${total === 1 ? 'student has' : 'students have'} voted in ${academicYear}` : `Be the first to vote in ${academicYear}`;
    }).catch(() => {});

    $('#pollPeek').addEventListener('click', () => show(null));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = $('#pollMsg'); msg.className = 'form-msg'; msg.textContent = '';
      const choice = form.elements.pillar.value;
      const text = form.elements.detail.value.trim();
      if (!choice) { msg.className = 'form-msg err'; msg.textContent = 'Pick the issue that matters most to you first.'; return; }
      if (choice === 'other' && text.length < 3) { msg.className = 'form-msg err'; msg.textContent = 'Tell us in a few words what we should fight for.'; form.elements.detail.focus(); return; }
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Voting…';
      try {
        await NovumAPI.castVote(choice === 'other' ? null : choice, form.elements.faculty.value, text);
        store.set(VOTE_KEY, choice);
        show(choice);
      } catch (err) {
        console.error(err);
        msg.className = 'form-msg err';
        msg.textContent = /too many/i.test(err.message || '') ? 'Lots of votes right now. Please try again in a little while.' : 'Your vote could not be saved. Please try again.';
        btn.disabled = false; btn.textContent = 'Cast my vote';
      }
    });
  }

  // ---------- councils: "Who can fix this?" problem navigator ----------
  function setupFixit() {
    const box = $('#fixitChoices');
    if (!box || !window.NOVUM_ISSUES) return;
    const issues = window.NOVUM_ISSUES;
    box.innerHTML = issues.map(i => `<button type="button" data-id="${esc(i.id)}" aria-pressed="false">
      <b>${esc(i.title)}</b>${i.subtitle ? `<span>${esc(i.subtitle)}</span>` : ''}</button>`).join('');
    const faculties = data.councils.filter(c => c.id !== 'uc');
    const show = id => {
      const i = issues.find(x => x.id === id);
      if (!i) return;
      box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
      const res = $('#fixitResult');
      res.innerHTML = `<h3>${esc(i.title)}</h3>
        <p class="fixit-sub">Who to go to${i.steps.length > 1 ? ', in this order' : ''}:</p>
        <ol class="fixit-steps">${i.steps.map(([who, what]) => `<li><b>${esc(who)}</b><span>${esc(what)}</span></li>`).join('')}</ol>
        <div class="fixit-novum"><p class="fixit-novum-title">How NovUM can help</p><p>${esc(i.novum)}</p></div>
        <form class="fixit-cta" id="fixitCta" method="get" action="contact.html">
          ${i.faculty ? `<label><span>My faculty</span><select name="council"><option value="uc">Not faculty-specific</option>${faculties.map(c => `<option value="${esc(c.id)}">${esc(c.short_name)}</option>`).join('')}</select></label>` : `<input type="hidden" name="council" value="${esc(i.council || 'uc')}">`}
          <input type="hidden" name="issue" value="${esc(i.id)}">
          <button class="btn" type="submit">Ask our councillors about this</button>
        </form>`;
      res.classList.remove('in'); void res.offsetWidth; res.classList.add('in');
      if (matchMedia('(max-width: 960px)').matches) res.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    };
    box.addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (b) show(b.dataset.id); });
    // links like councils.html?problem=housing#fixit open that problem straight away
    const pre = new URLSearchParams(location.search).get('problem');
    if (pre && issues.some(i => i.id === pre)) show(pre);
  }

  // contact page: pre-fill from "Who can fix this?" (contact.html?issue=grade&council=fse)
  function prefillFromIssue() {
    const form = $('#contactForm'), q = new URLSearchParams(location.search), id = q.get('issue');
    if (!form || !id || !window.NOVUM_ISSUES) return;
    const i = window.NOVUM_ISSUES.find(x => x.id === id);
    if (!i) return;
    const topic = $('#c-topic');
    if ([...topic.options].some(o => o.value === i.topic || o.text === i.topic)) topic.value = i.topic;
    if (!form.elements.message.value) form.elements.message.value = `About: ${i.title}\n\n`;
  }

  // ---------- board ----------
  function renderBoard() {
    if (!$('#people')) return;
    // Instagram details (From, Studies, Year, Why, Interests). If the live database doesn't have them yet
    // (supabase/board_profiles.sql not run), use the built-in ones from js/data.js for the same person.
    const builtIn = name => ((window.NOVUM_DEMO || {}).people || []).find(x => x.kind === 'board' && x.name === name) || {};
    const pick = (p, k) => p[k] || (p.hometown === undefined || !p.hometown ? builtIn(p.name)[k] : '') || '';
    const facts = p => [['From', pick(p, 'hometown')], ['Studies', pick(p, 'study')], ['Year', pick(p, 'study_year')]]
      .filter(f => f[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
    const tags = p => String(pick(p, 'interests')).split(',').map(t => t.trim()).filter(Boolean).map(t => t[0].toUpperCase() + t.slice(1));
    const cards = $('#people').classList.contains('people-cards');  // the home page shows a compact row without details
    const profile = p => cards && (facts(p) || pick(p, 'why_novum') || tags(p).length ? `<div class="profile">
        ${facts(p) ? `<dl class="facts">${facts(p)}</dl>` : ''}
        ${pick(p, 'why_novum') ? `<blockquote class="why"><span>Why I joined NovUM</span>${esc(pick(p, 'why_novum'))}</blockquote>` : ''}
        ${tags(p).length ? `<div class="interests"><span>Interests</span><ul class="tags">${tags(p).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
      </div><span class="more-hint" aria-hidden="true">More about ${esc(p.name.split(' ')[0])}</span>` : '');
    const inner = p => `<div class="ph">${safeUrl(p.photo_url) ? `<img src="${safeUrl(p.photo_url)}" alt="${esc(p.name)}" loading="lazy">` : ''}${profile(p)}</div>
      <h3>${esc(p.name)}</h3><p class="role">${esc(p.role)}</p><p class="bio">${esc(p.bio)}</p>`;
    // home page: each member links to their card on the board page; board page: cards get an id to land on
    $('#people').innerHTML = data.people.filter(p => p.kind === 'board').map(p => cards
      ? `<li class="person reveal${profile(p) ? ' has-profile" tabindex="0' : ''}" id="${slug(p.name)}">${inner(p)}</li>`
      : `<li class="person reveal"><a class="person-link" href="board.html#${slug(p.name)}">${inner(p)}</a></li>`).join('');
    // arriving from the home page (board.html#name): scroll to that person and flip their card
    const target = cards && location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) { target.classList.add('show', 'in'); requestAnimationFrame(() => target.scrollIntoView({ block: 'center' })); }
    // phones have no hover: a tap opens the details, another tap (or Escape) closes them
    $('#people').querySelectorAll('.has-profile').forEach(li => {
      li.addEventListener('click', () => li.classList.toggle('show'));
      li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.classList.toggle('show'); } if (e.key === 'Escape') { li.classList.remove('show'); li.blur(); } });
    });
  }

  // ---------- board page: advisory council and confidential person (each part hidden until someone is added) ----------
  function renderSupport() {
    if (!$('#support')) return;
    // until supabase/advisory_confidential.sql has run, the live database has no email column and none of these people:
    // show the built-in ones from js/data.js instead
    const ready = data.demo || data.people.some(p => 'email' in p);
    const source = ready ? data.people : ((window.NOVUM_DEMO || {}).people || []);
    const of = kind => source.filter(p => p.kind === kind && p.active !== false);
    const initials = n => n.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    const face = p => safeUrl(p.photo_url) ? `<img src="${safeUrl(p.photo_url)}" alt="" loading="lazy">` : `<span aria-hidden="true">${esc(initials(p.name))}</span>`;
    const advisors = of('advisory'), confidential = of('confidential');
    $('#advisors').innerHTML = advisors.map(p => `<li class="advisor reveal">
      <div class="advisor-ph">${face(p)}</div>
      <div><h3>${esc(p.name)}</h3>${p.role ? `<p class="role">${esc(p.role)}</p>` : ''}${p.bio ? `<p>${esc(p.bio)}</p>` : ''}</div></li>`).join('');
    $('#confidentialPeople').innerHTML = confidential.map(p => `<div class="confidant">
      <div class="advisor-ph">${face(p)}</div>
      <div><h3>${esc(p.name)}</h3>${p.role ? `<p class="role">${esc(p.role)}</p>` : ''}${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email || '') ? `<a class="btn confidant-mail" href="mailto:${esc(p.email)}">Email ${esc(p.name.split(' ')[0])} in confidence</a>` : ''}</div></div>`).join('');
    $('#advisoryBlock').hidden = !advisors.length;
    $('#confidentialBlock').hidden = !confidential.length;
    $('#support').hidden = !advisors.length && !confidential.length;
    $('#support').classList.toggle('support-single', !advisors.length || !confidential.length);
  }

  // ---------- forms ----------
  function fillSelects() {
    document.querySelectorAll('[data-faculties]').forEach(s => s.insertAdjacentHTML('beforeend',
      data.councils.filter(c => c.id !== 'uc').map(c => `<option value="${esc(c.short_name)}">${esc(c.name)}</option>`).join('')));
    document.querySelectorAll('[data-councils]').forEach(s => s.insertAdjacentHTML('beforeend',
      data.councils.map(c => `<option value="${esc(c.id)}">${esc(c.short_name === 'University' ? 'University Council' : c.short_name + ' council')}</option>`).join('')));
    // preselect from links like contact.html?council=fasos
    const q = new URLSearchParams(location.search);
    if ($('#contactForm')) {
      if (q.get('council') && data.councils.some(c => c.id === q.get('council'))) {
        $('#c-council').value = q.get('council'); $('#c-topic').value = 'An issue in my faculty';
      }
    }
  }

  // One handler for both forms: validate, honeypot, send, then replace the form with a thank-you.
  function setupForm(form, { required, build, send, buttonText, thanks }) {
    if (!form) return;
    const msg = form.querySelector('.form-msg'), btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      msg.className = 'form-msg'; msg.textContent = '';
      let firstBad = null;
      required.forEach(n => {
        const el = form.elements[n];
        const bad = !el.value.trim() || !el.checkValidity();
        el.setAttribute('aria-invalid', bad);
        if (bad && !firstBad) firstBad = el;
      });
      if (firstBad) {
        msg.className = 'form-msg err'; msg.textContent = 'Please fill in the highlighted fields.';
        firstBad.focus(); return;
      }
      const f = new FormData(form);
      if (f.get('website')) return done(); // bots fill the hidden field
      btn.disabled = true; btn.textContent = 'Sending…';
      try { await send(build(f)); done(); }
      catch (err) {
        console.error(err);
        msg.className = 'form-msg err';
        msg.textContent = err.message === 'not-configured'
          ? 'This form is not connected yet. Please message us on Instagram for now.'
          : /too many messages/i.test(err.message || '')
            ? 'You have sent several messages in a short time. Please wait an hour, or email novum@maastrichtuniversity.nl.'
            : 'Something went wrong while sending. Please try again in a moment.';
        btn.disabled = false; btn.textContent = buttonText;
      }
    });
    function done() {
      const name = (form.elements.full_name || form.elements.name).value.trim().split(' ')[0] || 'there';
      const box = document.createElement('div');
      box.className = 'form-done'; box.tabIndex = -1;
      box.innerHTML = thanks(esc(name));
      form.replaceWith(box); box.focus();
    }
  }

  function setupForms() {
    $('#pollForm')?.addEventListener('submit', e => e.preventDefault()); // until the poll is ready
    setupForm($('#joinForm'), {
      required: ['full_name', 'email'], buttonText: 'Send my registration', send: NovumAPI.signUp,
      build: f => ({
        full_name: f.get('full_name').trim(), email: f.get('email').trim().toLowerCase(),
        faculty: f.get('faculty') || '', study_year: f.get('study_year') || '',
        programme: (f.get('programme') || '').trim(), interests: f.getAll('interests'),
        message: (f.get('message') || '').trim()
      }),
      thanks: n => `<h3>Thanks, ${n}. You're on the list.</h3><p>Someone from the board will get in touch by email.</p>`
    });
    setupForm($('#contactForm'), {
      required: ['name', 'email', 'message'], buttonText: 'Send message', send: NovumAPI.sendMessage,
      build: f => ({
        name: f.get('name').trim(), email: f.get('email').trim().toLowerCase(),
        topic: f.get('topic') || 'General question', council: f.get('council') || '',
        message: f.get('message').trim()
      }),
      thanks: n => `<h3>Thanks, ${n}. Your message is with us.</h3><p>We'll reply by email, usually within a few days.</p>`
    });
  }

  // ---------- membership: load the Google Form only after the visitor asks for it ----------
  function setupFormGate() {
    const gate = $('#formGate');
    if (!gate) return;
    $('#loadForm').addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = gate.dataset.src;
      frame.title = 'NovUM membership registration form';
      gate.replaceWith(frame);
      frame.focus();
    });
  }

  // ---------- privacy statement: show the version the board saved in the admin page ----------
  async function loadLegalText() {
    const box = $('#legalText');
    if (!box || !window.NovumText) return;
    const saved = await NovumAPI.loadText('privacy');
    if (!saved || !saved.body.trim()) return; // keep the built-in version
    box.innerHTML = NovumText.render(saved.body);
    const d = new Date(saved.updated_at);
    if ($('#legalUpdated')) $('#legalUpdated').textContent = `Last updated: ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }

  // ---------- chrome ----------
  function setupMenu() {
    const btn = $('#menuBtn'), links = $('#links');
    const set = open => {
      links.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
      btn.setAttribute('aria-expanded', open); btn.textContent = open ? 'Close' : 'Menu';
    };
    btn.addEventListener('click', () => set(!links.classList.contains('open')));
    links.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  }

  // Fit display lines to the content width by measuring, so they end exactly on the right margin.
  function fitLines() {
    document.querySelectorAll('[data-fit]').forEach(el => {
      const cs = getComputedStyle(el.parentElement);
      const box = el.parentElement.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      el.style.fontSize = '100px';
      const lines = el.children.length ? [...el.children] : [el];
      const widest = Math.max(...lines.map(l => { l.style.display = 'inline-block'; const w = l.getBoundingClientRect().width; l.style.display = ''; return w; }));
      el.style.fontSize = Math.min(100 * box / widest, Number(el.dataset.fitMax) || Infinity) + 'px';
    });
  }

  function setupReveal() {
    const els = [...document.querySelectorAll('.reveal:not(.in)')];
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
    els.filter(el => el.getBoundingClientRect().top < innerHeight).forEach((el, i) => {
      el.style.setProperty('--d', `${i * 90}ms`); el.classList.add('in');
    });
    const io = new IntersectionObserver(entries => {
      entries.filter(e => e.isIntersecting).forEach((e, i) => {
        e.target.style.setProperty('--d', `${i * 75}ms`);
        e.target.classList.add('in'); io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    els.filter(el => !el.classList.contains('in')).forEach(el => io.observe(el));
  }

  async function init() {
    setupMenu(); setupFormGate();
    setupForms(); loadLegalText(); // before any await, so a form can never submit the browser's default way
    document.fonts.ready.then(fitLines);
    let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(fitLines, 100); });
    try { data = await NovumAPI.loadContent(); }
    catch (err) { console.error('Could not load content, showing built-in content', err); data = NovumAPI.demoContent(); }
    renderPillarCards(); renderPillars(); renderFacultyWork();
    // drop an illustration frame if its image fails to load
    document.querySelectorAll('.pillar-art img').forEach(img => img.addEventListener('error', () => img.parentElement.remove()));
    renderFinder(); setupFixit(); setupPoll(); renderCouncilList(); renderBoard(); renderSupport(); fillSelects(); prefillFromIssue();
    setupReveal();
  }
  init();
})();
