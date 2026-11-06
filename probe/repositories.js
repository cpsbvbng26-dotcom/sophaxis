'use strict';
/* One-off probe, never merged (read only): the ROAR line on the live top page of Sophaxis. */
(async () => {
  const t = await (await fetch('https://sophaxis.vercel.app/', { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } })).text();
  console.log('==== ' + ((/<p class="meta">Listed in.*?<\/p>/.exec(t) || ['not found'])[0]));
})();
