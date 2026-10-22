// Data access for the public pages.
// Uses Supabase when js/config.js is filled in, otherwise the built-in content in js/data.js.
(function () {
  const cfg = window.NOVUM_CONFIG || {};
  const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

  const bySort = (a, b) => (a.sort ?? 0) - (b.sort ?? 0);

  function demoContent() {
    const d = window.NOVUM_DEMO;
    return {
      councils: [...d.councils].sort(bySort),
      pillars: [...d.pillars].sort(bySort),
      achievements: d.achievements.map((a, i) => ({ ...a, sort: i })),
      people: [...d.people].sort(bySort),
      demo: true
    };
  }

  async function loadContent() {
    if (!client) return demoContent();
    const [councils, pillars, achievements, people] = await Promise.all([
      client.from('councils').select('*').order('sort'),
      client.from('pillars').select('*').order('sort'),
      client.from('achievements').select('*').order('sort'),
      client.from('people').select('*').order('sort')
    ]);
    const failed = [councils, pillars, achievements, people].find(r => r.error);
    if (failed) throw failed.error;
    return {
      councils: councils.data, pillars: pillars.data, achievements: achievements.data,
      people: people.data, demo: false
    };
  }

  async function signUp(row) {
    if (!client) throw new Error('not-configured');
    const { error } = await client.from('members').insert(row);
    if (error) throw error;
  }

  async function sendMessage(row) {
    if (!client) throw new Error('not-configured');
    const { error } = await client.from('messages').insert(row);
    if (error) throw error;
  }

  // ---- student priorities poll: anonymous votes, public totals
  async function pollResults() {
    if (!client) {
      let mine = {};
      try { mine = JSON.parse(localStorage.getItem('novum-demo-votes') || '{}'); } catch {}
      return [...window.NOVUM_DEMO.pillars.map(p => ({ pillar_id: p.id, title: p.title, votes: mine[p.id] || 0 })),
              { pillar_id: null, title: 'Something else', votes: mine.other || 0 }];
    }
    const { data, error } = await client.rpc('priority_results');
    if (error) throw error;
    return data.map(r => ({ ...r, votes: Number(r.votes) }));
  }

  // pillarId null = "something else" (then detail is required)
  async function castVote(pillarId, faculty, detail) {
    if (!client) {
      let mine = {};
      try { mine = JSON.parse(localStorage.getItem('novum-demo-votes') || '{}'); } catch {}
      const k = pillarId || 'other';
      mine[k] = (mine[k] || 0) + 1;
      try { localStorage.setItem('novum-demo-votes', JSON.stringify(mine)); } catch {}
      return;
    }
    const { error } = await client.from('priority_votes').insert({ pillar_id: pillarId, faculty: faculty || '', detail: (detail || '').trim().slice(0, 280) });
    if (error) throw error;
  }

  // ---- editable texts (e.g. the privacy statement); null when none saved or not reachable
  async function loadText(slug) {
    if (!client) return null;
    const { data, error } = await client.from('site_texts').select('body, updated_at').eq('slug', slug).maybeSingle();
    if (error) { console.warn('site text not available', error.message); return null; }
    return data;
  }

  window.NovumAPI = { configured, client, loadContent, demoContent, signUp, sendMessage, pollResults, castVote, loadText };
})();
