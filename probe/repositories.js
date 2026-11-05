'use strict';
/* One-off probe, never merged (read only): what the OSF project of Sophaxis holds. */
const H = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/vnd.api+json' };
const get = async (u) => { const r = await fetch(u, { headers: H }); return [r.status, r.ok ? await r.json() : await r.text()]; };
(async () => {
  const [s, n] = await get('https://api.osf.io/v2/nodes/mq7za/');
  console.log('==== node ' + s);
  if (s === 200) { const a = n.data.attributes; console.log(JSON.stringify({ title: a.title, description: a.description, category: a.category, tags: a.tags, public: a.public, date_created: a.date_created, date_modified: a.date_modified, wiki_enabled: a.wiki_enabled, node_license: a.node_license }, null, 1)); console.log('license rel: ' + JSON.stringify((n.data.relationships.license || {}).data)); }
  for (const rel of ['files', 'wikis', 'children', 'linked_nodes', 'identifiers', 'contributors', 'preprints', 'addons']) {
    const [st, j] = await get('https://api.osf.io/v2/nodes/mq7za/' + rel + '/');
    console.log('==== ' + rel + ' ' + st + ' ' + (st === 200 ? (j.data || []).map((d) => (d.attributes && (d.attributes.name || d.attributes.title || d.attributes.value || d.attributes.full_name || d.attributes.provider)) || d.id).join(' | ') : String(j).slice(0, 120)));
  }
  const [st2, f] = await get('https://api.osf.io/v2/nodes/mq7za/files/osfstorage/');
  console.log('==== osfstorage ' + st2 + ' ' + (st2 === 200 ? (f.data || []).map((d) => d.attributes.name + ' (' + d.attributes.kind + ')').join(' | ') : ''));
})();
