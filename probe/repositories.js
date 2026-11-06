'use strict';
/* One-off probe, never merged (read only): the ROAR record of Sophaxis. */
(async () => {
  const r = await fetch('https://roar.eprints.org/27422/', { headers: { 'User-Agent': 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)' } });
  const t = await r.text();
  const plain = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
  const i = plain.indexOf('Sophaxis');
  console.log('==== ' + r.status + '\n' + plain.slice(Math.max(0, i - 100), i + 2500));
})();
