'use strict';
/* One-off probe, never merged (read only): run the submission check as a dry run on the operator's own Zenodo DOIs. */
const { execFileSync } = require('child_process');
const dois = [
  ['10.5281/zenodo.22057583', 'philosophy'], ['10.5281/zenodo.22058254', 'philosophy'], ['10.5281/zenodo.22064241', 'philosophy'],
  ['10.5281/zenodo.22058624', 'mathematics'], ['10.5281/zenodo.22058777', 'mathematics'], ['10.5281/zenodo.22058964', 'mathematics'],
  ['10.5281/zenodo.22765695', 'philosophy'],
];
for (const [doi, cat] of dois) {
  console.log('==== ' + doi);
  try {
    const out = execFileSync('node', ['tools/intake.js', '--dry-run', '--doi', doi, '--orcid', '0009-0000-1406-0547', '--login', 'cpsbvbng26-dotcom', '--category', cat], { encoding: 'utf8', timeout: 120000 });
    console.log(out.split('\n').filter((l) => /^\| (pass|\*\*fail)/.test(l) || /"title"|"license"|"date"|"doi"|"keywords"|versions:/.test(l)).join('\n'));
  } catch (e) { console.log('error ' + e.message.slice(0, 300)); }
  /* DataCite: the resource type, the version and the related identifiers (concept or version DOI) */
  try {
    const r = execFileSync('curl', ['-s', 'https://api.datacite.org/dois/' + doi], { encoding: 'utf8' });
    const a = JSON.parse(r).data.attributes;
    console.log('type=' + JSON.stringify(a.types && a.types.resourceTypeGeneral) + ' version=' + a.version + ' lang=' + a.language + ' rights=' + JSON.stringify((a.rightsList || []).map((x) => x.rightsIdentifier || x.rights))
      + ' rel=' + JSON.stringify((a.relatedIdentifiers || []).filter((x) => /Version/.test(x.relationType)).map((x) => x.relationType + ':' + x.relatedIdentifier)) + ' abstractLen=' + ((a.descriptions || []).filter((d) => d.descriptionType === 'Abstract').map((d) => d.description.length).join(',')));
  } catch (e) { console.log('datacite error ' + e.message.slice(0, 200)); }
}
