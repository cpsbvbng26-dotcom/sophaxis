'use strict';
/* One-off probe, never merged (read only): the intake's dry run with deposit-check beside it, on one listed Zenodo DOI. */
const { execFileSync } = require('child_process');
const wf = require('fs').readFileSync('.github/workflows/intake.yml', 'utf8');
const ref = /repository: cpsbvbng26-dotcom\/deposit-check\n\s+ref: ([0-9a-f]{40})/.exec(wf)[1];
execFileSync('git', ['clone', '-q', 'https://github.com/cpsbvbng26-dotcom/deposit-check', 'deposit-check']);
execFileSync('git', ['-C', 'deposit-check', 'checkout', '-q', ref]);
const out = execFileSync('node', ['tools/intake.js', '--dry-run', '--doi', '10.5281/zenodo.22057583', '--orcid', '0009-0000-1406-0547', '--login', 'cpsbvbng26-dotcom', '--category', 'philosophy'], { encoding: 'utf8', timeout: 300000 });
console.log(out.slice(out.indexOf('**Advice') >= 0 ? out.indexOf('**Advice') : 0).slice(0, 1500));
