'use strict';
/* One-off probe, never merged (read only): the texts the policies of Sophaxis and Nusquama cite, from their official sources. */
const UA = { 'User-Agent': 'probe (https://github.com/cpsbvbng26-dotcom/sophaxis)', 'Accept-Language': 'en,ja;q=0.8' };
const get = async (u) => { try { const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(90000), redirect: 'follow' }); return [r.status, await r.text(), r.url]; } catch (e) { return ['ERR', String(e), u]; } };
const plain = (x) => x.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
const at = (t, re, n) => { const m = new RegExp(re, 'i').exec(t); return m ? t.slice(m.index, m.index + n) : '(not found: ' + re + ')'; };
const J = [
  ['GDPR', 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679', [['Article 3 Territorial scope', 900], ['Article 6 Lawfulness of processing', 700], ['Article 13 Information to be provided where personal data are collected from the data subject', 1500], ['Article 17 Right to erasure', 200], ['3\\.\\s*Paragraphs 1 and 2 shall not apply to the extent that processing is necessary', 900], ['Article 20 Right to data portability', 700], ['Article 27 Representatives of controllers', 1100], ['Article 30 Records of processing activities', 300], ['Article 49 Derogations for specific situations', 900]]],
  ['DSA', 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065', [['Article 11 Points of contact for Member States', 700], ['Article 12 Points of contact for recipients', 500], ['Article 13 Legal representatives', 600], ['Article 14 Terms and conditions', 600], ['Article 16 Notice and action mechanisms', 900], ['Article 17 Statement of reasons', 700], ['Article 19 Exclusion for micro and small enterprises', 700], ['Article 20 Internal complaint-handling system', 700], ['Article 21 Out-of-court dispute settlement', 400]]],
  ['UK GDPR', 'https://www.legislation.gov.uk/eur/2016/679/article/27', [['Representatives of controllers', 1200]]],
  ['UK GDPR 3', 'https://www.legislation.gov.uk/eur/2016/679/article/3', [['Territorial scope', 900]]],
  ['CCPA 1798.140', 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140', [['\\(d\\)\\s*"Business" means', 1500]]],
  ['Italy 178/1951', 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1951-03-03;178', [['Art\\. 8', 900], ['Art\\. 7', 600]]],
  ['PPC Q&A', 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', [['12歳から15歳', 900], ['子ども', 600]]],
  ['CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0/legalcode.en', [['Section 2 . Scope|Section 2 – Scope', 1600], ['Patent and trademark rights are not licensed', 300], ['Section 3 . License Conditions|Section 3 – License Conditions', 1500]]],
  ['CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.en', [['ShareAlike', 900]]],
  ['CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en', [['Waiver', 700]]],
  ['Vercel Hobby', 'https://vercel.com/docs/plans/hobby', [['non-commercial|personal', 700]]],
  ['Vercel fair use', 'https://vercel.com/docs/limits/fair-use-guidelines', [['commercial', 900]]],
  ['ORCID public API terms', 'https://info.orcid.org/public-client-terms-of-service/', [['non-commercial|commercial', 900], ['Public API', 600]]],
  ['Crossref metadata', 'https://www.crossref.org/documentation/retrieve-metadata/rest-api/', [['CC0|no restriction|restrictions', 700]]],
  ['DataCite metadata', 'https://support.datacite.org/docs/datacite-metadata-licensing', [['CC0', 600]]],
  ['Internet Archive terms', 'https://archive.org/about/terms', [['Privacy|privacy', 900]]],
];
(async () => {
  for (const [name, u, pats] of J) {
    const [s, t, final] = await get(u);
    const p = plain(t);
    console.log('\n######## ' + name + ' ' + u + ' [' + s + '] final=' + final + ' len=' + p.length);
    console.log('HEAD: ' + p.slice(0, 300));
    for (const [re, n] of pats) console.log('---- ' + re.slice(0, 50) + ': ' + at(p, re, n));
    await new Promise((r) => setTimeout(r, 3000));
  }
  // e-Gov: the ID of the APPI enforcement rules (a rule of the Personal Information Protection Commission).
  const [s, t] = await get('https://laws.e-gov.go.jp/api/1/lawlists/4');
  const m = [...t.matchAll(/<LawId>([^<]+)<\/LawId>\s*<LawName>([^<]*個人情報の保護に関する法律施行規則[^<]*)<\/LawName>/g)];
  console.log('\n######## e-Gov lawlists/4 [' + s + '] ' + m.map((x) => x[1] + ' ' + x[2]).join(' | '));
  const tel = await get('https://laws.e-gov.go.jp/api/1/lawdata/359AC0000000086');
  console.log('######## 電気通信事業法 [' + tel[0] + '] title=' + ((/<LawTitle[^>]*>([^<]*)</.exec(tel[1]) || [])[1]));
})();
