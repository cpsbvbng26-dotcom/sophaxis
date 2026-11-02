'use strict';
/* One-off probe, never merged (read only): the live Identify after the adminEmail was corrected. */
(async () => {
  for (let i = 0; i < 12; i++) {
    const t = await (await fetch('https://sophaxis.vercel.app/oai?verb=Identify')).text();
    const m = /<adminEmail>([^<]*)<\/adminEmail>/.exec(t);
    if (m && m[1].startsWith('wenwop21')) { console.log('adminEmail: ' + m[1]); return; }
    await new Promise((r) => setTimeout(r, 15000));
  }
  console.log('not corrected yet');
})();
