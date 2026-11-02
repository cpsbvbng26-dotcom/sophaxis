'use strict';
/* One-off probe, never merged (read only): the intake's dry run with deposit-check beside it, on one listed Zenodo DOI. */
const { execFileSync } = require('child_process');
const wf = require('fs').readFileSync('.github/workflows/intake.yml', 'utf8');
const ref = /repository: cpsbvbng26-dotcom\/deposit-check\n\s+ref: ([0-9a-f]{40})/.exec(wf)[1];
execFileSync('git', ['clone', '-q', 'https://github.com/cpsbvbng26-dotcom/deposit-check', 'deposit-check']);
execFileSync('git', ['-C', 'deposit-check', 'checkout', '-q', ref]);
const I = require('../tools/intake.js');
for (const doi of ['10.5281/zenodo.22057583', '10.5281/zenodo.22058624']) {
  const advice = I.metadataAdvice(doi, require('path').join(__dirname, '..', 'deposit-check'));
  console.log('==== ' + doi + ': ' + advice.length + ' findings');
  console.log(I.adviceNote(advice));
}
