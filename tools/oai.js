'use strict';
/* OAI-PMH 2.0 for Sophaxis: the protocol by which BASE, CORE, OpenDOAR, OpenAIRE and PhilPapers harvest repositories.
 * https://www.openarchives.org/OAI/openarchivesprotocol.html
 *
 * The answers are made by `handle`, a pure function of the request's arguments, the records and the time.
 * build.js writes site/api/oai.js: this file, the records, and a handler that Vercel runs as a function at /oai.
 * The function reads nothing and asks no other server; it answers from the records it was built with.
 *
 * Metadata: Dublin Core (oai_dc), following the OpenAIRE guidelines for literature repositories (v3) where they apply.
 * Sets: the fields of Sophaxis, and `openaire` with every record shown. Granularity: days.
 * Deleted records: persistent. A record removed under the Takedown Policy keeps its identifier, marked deleted.
 * No answer is split, so no resumption token is ever given; one that is sent is refused.
 */

const VERBS = {
  Identify: { required: [], optional: [] },
  ListMetadataFormats: { required: [], optional: ['identifier'] },
  ListSets: { required: [], optional: [] },
  GetRecord: { required: ['identifier', 'metadataPrefix'], optional: [] },
  ListIdentifiers: { required: ['metadataPrefix'], optional: ['from', 'until', 'set'], exclusive: 'resumptionToken' },
  ListRecords: { required: ['metadataPrefix'], optional: ['from', 'until', 'set'], exclusive: 'resumptionToken' },
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/* Text for XML: the five entities escaped, and the characters XML 1.0 forbids left out. */
function x(s) {
  return String(s == null ? '' : s)
    .replace(/[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/* Pure: the arguments of a request, as a list of [name, value] pairs, so that a repeated argument can be refused. */
function argsOf(search) {
  return [...new URLSearchParams(search).entries()];
}

function envelope(data, now, request, body) {
  const attrs = request.attrs.map(([k, v]) => ' ' + k + '="' + x(v) + '"').join('');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    + ' xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">\n'
    + '<responseDate>' + now.toISOString().replace(/\.\d{3}Z$/, 'Z') + '</responseDate>\n'
    + '<request' + attrs + '>' + x(data.baseURL) + '</request>\n'
    + body + '</OAI-PMH>\n';
}

const error = (code, text) => '<error code="' + code + '">' + x(text) + '</error>\n';

function header(r) {
  return '<header' + (r.deleted ? ' status="deleted"' : '') + '>'
    + '<identifier>' + x(r.identifier) + '</identifier><datestamp>' + r.datestamp + '</datestamp>'
    + r.sets.map((s) => '<setSpec>' + x(s) + '</setSpec>').join('') + '</header>';
}

function dc(r) {
  const el = (name, list) => (list || []).filter((v) => v !== null && v !== undefined && v !== '').map((v) => '<dc:' + name + '>' + x(v) + '</dc:' + name + '>').join('');
  const m = r.dc;
  return '<metadata><oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/"'
    + ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
    + ' xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai_dc/ http://www.openarchives.org/OAI/2.0/oai_dc.xsd">'
    + el('title', [m.title]) + el('creator', m.creators) + el('subject', m.subjects) + el('description', [m.description])
    + el('publisher', [m.publisher]) + el('date', [m.date]) + el('type', m.types) + el('format', m.formats)
    + el('identifier', m.identifiers) + el('language', m.languages) + el('relation', m.relations) + el('rights', m.rights)
    + '</oai_dc:dc></metadata>';
}

const record = (r) => '<record>' + header(r) + (r.deleted ? '' : dc(r)) + '</record>\n';

/* Pure: answer one request. `args` is a list of [name, value]; `data` is what build.js made; `now` is a Date. */
function handle(args, data, now) {
  const verbs = args.filter(([k]) => k === 'verb');
  const verb = verbs.length === 1 ? verbs[0][1] : null;
  const plain = (body) => envelope(data, now, { attrs: [] }, body);
  if (!verb || !VERBS[verb]) return plain(error('badVerb', verbs.length > 1 ? 'The verb is given more than once.' : 'No verb, or not one of ' + Object.keys(VERBS).join(', ') + '.'));
  const spec = VERBS[verb];
  const names = args.map(([k]) => k);
  const allowed = new Set(['verb'].concat(spec.required, spec.optional, spec.exclusive ? [spec.exclusive] : []));
  const repeated = names.filter((k, i) => names.indexOf(k) !== i);
  const unknown = names.filter((k) => !allowed.has(k));
  const a = Object.fromEntries(args);
  if (repeated.length) return plain(error('badArgument', 'Repeated argument: ' + repeated.join(', ') + '.'));
  if (unknown.length) return plain(error('badArgument', 'Not an argument of ' + verb + ': ' + unknown.join(', ') + '.'));
  if (spec.exclusive && a[spec.exclusive] !== undefined) {
    if (names.length > 2) return plain(error('badArgument', 'resumptionToken is an exclusive argument.'));
    return envelope(data, now, { attrs: args }, error('badResumptionToken', 'This repository gives no resumption tokens; every list is answered whole.'));
  }
  const missing = spec.required.filter((k) => a[k] === undefined || a[k] === '');
  if (missing.length) return plain(error('badArgument', 'Missing argument: ' + missing.join(', ') + '.'));
  const echo = (body) => envelope(data, now, { attrs: args }, body);
  const known = (id) => data.records.find((r) => r.identifier === id);

  if (verb === 'Identify') {
    return echo('<Identify>'
      + '<repositoryName>' + x(data.repositoryName) + '</repositoryName>'
      + '<baseURL>' + x(data.baseURL) + '</baseURL>'
      + '<protocolVersion>2.0</protocolVersion>'
      + data.adminEmails.map((e) => '<adminEmail>' + x(e) + '</adminEmail>').join('')
      + '<earliestDatestamp>' + data.earliestDatestamp + '</earliestDatestamp>'
      + '<deletedRecord>persistent</deletedRecord>'
      + '<granularity>YYYY-MM-DD</granularity>'
      + '<description><oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'
      + ' xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">'
      + '<scheme>oai</scheme><repositoryIdentifier>' + x(data.repositoryIdentifier) + '</repositoryIdentifier>'
      + '<delimiter>:</delimiter><sampleIdentifier>' + x(data.sampleIdentifier) + '</sampleIdentifier></oai-identifier></description>'
      + '</Identify>\n');
  }
  if (verb === 'ListMetadataFormats') {
    if (a.identifier !== undefined && !known(a.identifier)) return echo(error('idDoesNotExist', 'No record ' + a.identifier + '.'));
    return echo('<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix>'
      + '<schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>'
      + '<metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>\n');
  }
  if (verb === 'ListSets') {
    return echo('<ListSets>' + data.sets.map((s) => '<set><setSpec>' + x(s.spec) + '</setSpec><setName>' + x(s.name) + '</setName></set>').join('') + '</ListSets>\n');
  }
  if (a.metadataPrefix !== 'oai_dc') return echo(error('cannotDisseminateFormat', 'Only oai_dc is given.'));
  if (verb === 'GetRecord') {
    const r = known(a.identifier);
    return echo(r ? '<GetRecord>' + record(r) + '</GetRecord>\n' : error('idDoesNotExist', 'No record ' + a.identifier + '.'));
  }
  /* ListIdentifiers and ListRecords. */
  for (const k of ['from', 'until']) {
    if (a[k] === undefined) continue;
    if (SECONDS.test(a[k])) return echo(error('badArgument', k + ' is finer than the granularity of this repository (YYYY-MM-DD).'));
    if (!DAY.test(a[k]) || isNaN(Date.parse(a[k] + 'T00:00:00Z'))) return echo(error('badArgument', k + ' is not a date of the form YYYY-MM-DD.'));
  }
  if (a.from && a.until && a.from > a.until) return echo(error('badArgument', 'from is later than until.'));
  if (a.set !== undefined && !data.sets.some((s) => s.spec === a.set)) return echo(error('noRecordsMatch', 'No set ' + a.set + '.'));
  const list = data.records.filter((r) => (!a.from || r.datestamp >= a.from) && (!a.until || r.datestamp <= a.until) && (!a.set || r.sets.includes(a.set)));
  if (!list.length) return echo(error('noRecordsMatch', 'No record matches.'));
  return echo(verb === 'ListIdentifiers'
    ? '<ListIdentifiers>' + list.map((r) => header(r)).join('\n') + '</ListIdentifiers>\n'
    : '<ListRecords>' + list.map(record).join('') + '</ListRecords>\n');
}

/* The Vercel function: GET with the arguments in the query, or POST with them in the body (both are OAI-PMH). */
function handler(data) {
  return async (req, res) => {
    let search = (req.url || '').split('?')[1] || '';
    if (req.method === 'POST') {
      if (typeof req.body === 'string') search = req.body;
      else if (req.body && typeof req.body === 'object') search = new URLSearchParams(req.body).toString();
      else search = await new Promise((ok) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => ok(b)); });
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.end(handle(argsOf(search), data, new Date()));
  };
}

module.exports = { handle, handler, argsOf, VERBS, x };
