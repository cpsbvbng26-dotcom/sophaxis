'use strict';
/* One-off probe, never merged (read only): the wiki of the OSF project of Sophaxis, and the repository its GitHub add-on points to. */
const H = { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)', Accept: 'application/vnd.api+json' };
(async () => {
  const w = await (await fetch('https://api.osf.io/v2/nodes/mq7za/wikis/', { headers: H })).json();
  for (const d of w.data) { const c = await (await fetch(d.links.download, { headers: { 'User-Agent': H['User-Agent'] } })).text(); console.log('==== wiki ' + d.attributes.name + ' len ' + c.length + '\n' + c.slice(0, 1500)); }
  const a = await (await fetch('https://api.osf.io/v2/nodes/mq7za/addons/github/', { headers: H })).json();
  console.log('==== github addon ' + JSON.stringify((a.data || {}).attributes || a).slice(0, 400));
})();
