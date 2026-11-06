'use strict';
/* One-off probe, never merged (read only): the public DOAPR issue for Sophaxis. */
const H = { 'User-Agent': 'Sophaxis probe', Accept: 'application/vnd.github+json' };
(async () => {
  const i = await (await fetch('https://api.github.com/repos/antleaf/doapr/issues/105', { headers: H })).json();
  console.log('==== issue ' + JSON.stringify({ state: i.state, state_reason: i.state_reason, title: i.title, created_at: i.created_at, updated_at: i.updated_at, closed_at: i.closed_at, labels: (i.labels || []).map((l) => l.name), comments: i.comments, user: i.user && i.user.login }));
  const c = await (await fetch('https://api.github.com/repos/antleaf/doapr/issues/105/comments', { headers: H })).json();
  (Array.isArray(c) ? c : []).forEach((x) => console.log('==== comment ' + x.user.login + ' ' + x.created_at + ' ' + x.body.replace(/\s+/g, ' ').slice(0, 800)));
  const t = await (await fetch('https://api.github.com/repos/antleaf/doapr/issues/105/timeline?per_page=100', { headers: H })).json();
  (Array.isArray(t) ? t : []).filter((x) => x.event && x.event !== 'commented').forEach((x) => console.log('==== event ' + x.event + ' ' + (x.created_at || '') + ' ' + ((x.label && x.label.name) || '') + ' ' + ((x.actor && x.actor.login) || '')));
  const o = await (await fetch('https://api.github.com/repos/antleaf/doapr/issues?state=all&per_page=10&sort=updated', { headers: H })).json();
  (Array.isArray(o) ? o : []).forEach((x) => console.log('==== recent #' + x.number + ' ' + x.state + ' ' + x.updated_at + ' [' + x.labels.map((l) => l.name).join(',') + '] ' + x.title.slice(0, 80)));
})();
