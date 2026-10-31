#!/usr/bin/env node
/* Register or update the DOI of every record with DataCite, once Sophaxis has a DOI prefix of its own.
 *
 *   node tools/register_doi.js --dry-run       # print what would be sent; needs no account
 *   node tools/register_doi.js --test          # send to the DataCite test system (api.test.datacite.org)
 *   node tools/register_doi.js                 # send to DataCite
 *
 * Needs "doi": { "prefix": "10.xxxxx", "suffix": "sophaxis.{id}" } in site.json, a build (site/datacite/),
 * and, unless --dry-run, DATACITE_REPOSITORY_ID and DATACITE_PASSWORD in the environment.
 * Every record gets one DOI, made from its Sophaxis id, so no two records can share one.
 * A request is a PUT of the whole metadata, so running it again updates the DOIs and creates none twice.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));

async function main() {
  const dry = process.argv.includes('--dry-run');
  const api = process.argv.includes('--test') ? 'https://api.test.datacite.org' : 'https://api.datacite.org';
  if (!SITE.doi || !SITE.doi.prefix) throw new Error('site.json gives no DOI prefix; Sophaxis does not register DOIs yet');
  const dir = path.join(ROOT, 'site', 'datacite');
  if (!fs.existsSync(dir)) throw new Error('no site/datacite/; run node build.js first');
  const id = process.env.DATACITE_REPOSITORY_ID;
  const pw = process.env.DATACITE_PASSWORD;
  if (!dry && (!id || !pw)) throw new Error('DATACITE_REPOSITORY_ID and DATACITE_PASSWORD are needed');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const body = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const doi = body.data.attributes.doi;
    if (dry) { console.log('would send ' + doi + ' (' + body.data.attributes.event + ')'); continue; }
    const r = await fetch(api + '/dois/' + encodeURIComponent(doi), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/vnd.api+json', Authorization: 'Basic ' + Buffer.from(id + ':' + pw).toString('base64'), 'User-Agent': 'Sophaxis (' + SITE.repo + ')' },
      body: JSON.stringify(body),
    });
    console.log(doi + ': HTTP ' + r.status);
    if (!r.ok) throw new Error(doi + ': ' + (await r.text()).slice(0, 300));
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
