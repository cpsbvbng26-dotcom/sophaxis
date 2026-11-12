#!/usr/bin/env node
/* Fetches the primary texts that the legal pages cite, and keeps the cited articles in verification/sources-raw.json,
 * with the address, the HTTP status and the day each was fetched.
 *
 * What to fetch is read from the pages themselves: tools/citations.js finds every numbered citation in the files that
 * verification/citations.json lists, and gives each its law. For each law with a source here, the text is fetched once,
 * cut into its articles (or sections) by the headings the source uses, and the cited ones are kept word for word,
 * together with the list of every heading found. Japanese laws are fetched from the e-Gov law API (v1), and reduced to
 * plain characters exactly as tools/statutes.js does, so that a text kept by both has the same SHA-256.
 *
 * verification/check.js then confirms that every citation is to an article that is in a fetched text, and that every
 * quotation on the site (verification/sources.json) occurs in the text it names. Nothing here is written by hand.
 *
 * Run from GitHub Actions (the hosts are not reachable from every machine); PDFs need pdftotext (poppler-utils):
 *   node tools/sources.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const Cit = require('./citations.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'verification', 'sources-raw.json');
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'citations.json'), 'utf8'));
const UA = 'Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* The foreign sources. `split` finds the headings in the plain text (the number is the first group);
 * `html` finds them in the markup instead, where the source marks its headings; `pages` are joined in order;
 * `each` fetches one page for each cited article, with {n} replaced by its number. */
const CELLAR = { accept: 'application/xhtml+xml, text/html;q=0.9', lang: 'eng', html: /<p[^>]*class="(?:oj-)?ti-art"[^>]*>\s*(?:<span[^>]*>)?\s*Article\s+(\d+)\s*(?:<\/span>)?\s*<\/p>/g };
const SOURCES = {
  gdpr: { url: 'https://publications.europa.eu/resource/celex/32016R0679', ...CELLAR },
  dsa: { url: 'https://publications.europa.eu/resource/celex/32022R2065', ...CELLAR },
  dsm: { url: 'https://publications.europa.eu/resource/celex/32019L0790', ...CELLAR },
  'directive-2015-1535': { url: 'https://publications.europa.eu/resource/celex/32015L1535', ...CELLAR },
  'uk-gdpr': { each: 'https://www.legislation.gov.uk/eur/2016/679/article/{n}', from: /Article (\d+)\s+[A-Z]/ },
  osa: { each: 'https://www.legislation.gov.uk/ukpga/2023/50/section/{n}', from: /\b(\d+)\s+[“"]?[A-Z]/ },
  coppa: { url: 'https://www.ecfr.gov/api/renderer/v1/content/enhanced/current/title-16?part=312', split: /§ ?312\.(\d+) / , whole: '312' },
  usc17: { url: 'https://www.law.cornell.edu/uscode/text/17/512', whole: '512', needle: 'Limitations on liability relating to material online' },
  fadp: { url: 'https://www.fedlex.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/2022/491/20230901/en/html/fedlex-data-admin-ch-eli-cc-2022-491-20230901-en-html-5.html', split: /\bArt\. (\d+) [A-Z]/g },
  anpd: { url: 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022', split: /\bArt\. (\d+)º?\.? /g },
  lgpd: { url: 'https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-publicacaooriginal-156212-pl.html', split: /\bArt\. (\d+)º?\.? /g },
  pipl: { pages: ['http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_2.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_3.htm', 'http://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559_4.htm'], split: /\bArticle (\d+) /g },
  'thai-pdpa': { url: 'https://www.etda.or.th/getattachment/e820df2c-848f-4e03-86cb-a9dad38cc713/ENG-Version.aspx', split: /\bSection (\d+) /g },
  'saudi-pdpl': { url: 'https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf', split: /\bArticle \(?(\d+|One|Two|Three)\)? /g },
  'india-act': { url: 'https://prsindia.org/files/bills_acts/acts_parliament/2023/Digital_Personal_Data_Protection_Act,_2023.pdf', split: / (\d+)\. (?=\(1\) |[A-Z])/g, max: 44, after: 'BE it enacted' },
  // The eGazette's server does not send its intermediate certificate, so the Ministry's own copy is read.
  'india-rules': { url: 'https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf', split: / (\d+)\. (?=[A-Z])/g, max: 23, alt: ['https://web.archive.org/web/2026id_/https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf'] },
  'korea-pipa': { url: 'https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=62389', split: /\bArticle (\d+(?:-\d+)?) \((?=[A-Z][a-z])/g },
  'korea-decree': { url: 'https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=66066', split: /\bArticle (\d+(?:-\d+)?) \((?=[A-Z][a-z])/g },
  // kremlin.ru writes Article 10¹ as 10<sup>1</sup>; `sup` reads it as 10.1, so that it is not taken for Article 101 and the articles after it are kept.
  'ru-152': { pages: ['http://www.kremlin.ru/acts/bank/24154/page/1', 'http://www.kremlin.ru/acts/bank/24154/page/2', 'http://www.kremlin.ru/acts/bank/24154/page/3', 'http://www.kremlin.ru/acts/bank/24154/page/4'], split: /Статья (\d+(?:\.\d+)?)\. /g, sup: true, altPrefix: 'https://web.archive.org/web/2026id_/' },
  // adilet.zan.kz answers with a page that asks for a script; the Internet Archive's copy is tried after it (`alt`).
  kz: { url: 'https://adilet.zan.kz/rus/docs/Z1300000094', split: /Статья (\d+)\. /g, alt: ['https://web.archive.org/web/2026id_/https://adilet.zan.kz/rus/docs/Z1300000094'] },
  // At the commit that the weekly watch recorded (verification/statutes.json), so that both read the same text.
  'github-terms': { url: 'https://raw.githubusercontent.com/github/site-policy/' + JSON.parse(fs.readFileSync(path.join(ROOT, 'verification', 'statutes.json'), 'utf8')).policies.find((p) => p.name === 'GitHub Terms of Service').commit + '/Policies/github-terms/github-terms-of-service.md', markdown: true },
  'vercel-terms': { url: 'https://vercel.com/legal/terms', split: /(?:^| )(\d+)\. (?=[A-Z][A-Za-z ,&'’-]{2,60} )/g },
  // Official guidance that reads the Japanese statutes: kept whole (as far as 120,000 characters), quoted from, not cited by article.
  'mic-entry-manual': { url: 'https://www.soumu.go.jp/main_content/000477428.pdf', whole: 'all' },
  'mic-entry-procedures': { url: 'https://www.soumu.go.jp/menu_seisaku/ictseisaku/denkitsushin_suishin/tetsuzuki/index.html', whole: 'all', lang: 'ja' },
  'ppc-guidelines': { url: 'https://www.ppc.go.jp/files/pdf/260614_guidelines01.pdf', whole: 'all' },
  'ppc-qa': { url: 'https://www.ppc.go.jp/personalinfo/faq/APPI_QA/', whole: 'all', lang: 'ja', keep: 400000 },
  // The legal codes open with a list of their sections; the sections themselves start at the last heading of section 1.
  'cc-by': { url: 'https://creativecommons.org/licenses/by/4.0/legalcode.en', split: /Section (\d+) – /g, fromLast: 'Section 1 – ' },
  'cc-by-sa': { url: 'https://creativecommons.org/licenses/by-sa/4.0/legalcode.en', split: /Section (\d+) – /g, fromLast: 'Section 1 – ' },
  cc0: { url: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode.en', split: /(?:^| )(\d+)\. (?=[A-Z])/g, fromLast: '1. Copyright and Related Rights' },
};

/* Pages that are not cited by article: the Commission's guidance and the pages of the services that receive or give
 * personal data (their names, postal addresses and handling). Each is kept as plain text (as far as `keep` characters,
 * 200,000 by default), with the links whose address or text matches `links`, so that a record can name the page a fact
 * came from. They are written under `pages` in verification/sources-raw.json. */
const PAGE = (url, o = {}) => ({ url, ...o });
const PPC_LINKS = /\.pdf|guideline|gaikoku|offshore|kaigai|foreign|outside|外国|ガイドライン|Ｑ＆Ａ|Q&A/i;
const PAGES = {
  // The Commission's index pages, from which the addresses of its guidance were found.
  'ppc-legal': PAGE('https://www.ppc.go.jp/personalinfo/legal/', { lang: 'ja', links: PPC_LINKS }),
  'ppc-kaiseihogohou': PAGE('https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/', { lang: 'ja', links: PPC_LINKS }),
  // The Commission's guidance on provision to a third party in a foreign country, and on the records of provision.
  'ppc-guidelines-offshore': PAGE('https://www.ppc.go.jp/files/pdf/251212_guidelines02.pdf', { keep: 400000 }),
  'ppc-guidelines-records': PAGE('https://www.ppc.go.jp/files/pdf/240401_guidelines03.pdf', { keep: 400000 }),
  // The information the Commission publishes on the systems of other countries.
  'ppc-laws': PAGE('https://www.ppc.go.jp/enforcement/infoprovision/laws/', { lang: 'ja', links: /offshore|report|america|usa|us_|kaigai|gaikoku|\.pdf|米国|アメリカ|調査/i }),
  'ppc-offshore-survey': PAGE('https://www.ppc.go.jp/files/pdf/220210_pp_offshore_kouhyou_sywkqc.pdf', { keep: 400000 }),
  'ppc-report-us': PAGE('https://www.ppc.go.jp/enforcement/infoprovision/laws/offshore_report_america/', { lang: 'ja', links: /\.pdf/i, keep: 400000 }),
  // Apple: the mailbox (iCloud Mail). The iCloud terms name the company that provides iCloud to each place.
  'apple-privacy': PAGE('https://www.apple.com/legal/privacy/en-ww/', { links: /privacy|contact|governance|cbpr|bbb/i }),
  'apple-affiliated': PAGE('https://www.apple.com/legal/privacy/en-ww/affiliated-company/'),
  'icloud-terms': PAGE('https://www.apple.com/legal/internet-services/icloud/en/terms.html'),
  'icloud-terms-jp': PAGE('https://www.apple.com/jp/legal/internet-services/icloud/jp/terms.html', { lang: 'ja' }),
  'apple-cbpr-seal-1': PAGE('https://privacyseals.bbbprograms.org/seal/Confirmation/1114171343'),
  'apple-cbpr-seal-2': PAGE('https://privacyseals.bbbprograms.org/seal/Confirmation/195838664'),
  'cbpr-directory': PAGE('https://www.globalcbpr.org/privacy-certifications/directory/'),
  'apple-leadership': PAGE('https://www.apple.com/leadership/'),
  // Vercel: the site and its request logs.
  'vercel-privacy': PAGE('https://vercel.com/legal/privacy-notice', { links: /legal|privacy|dpa|contact/i }),
  'vercel-dpa': PAGE('https://vercel.com/legal/dpa'),
  'vercel-logs-docs': PAGE('https://vercel.com/docs/logs'),
  'vercel-runtime-logs-docs': PAGE('https://vercel.com/docs/logs/runtime'),
  'vercel-limits-docs': PAGE('https://vercel.com/docs/limits'),
  // GitHub: the issues and the repository.
  'github-privacy': PAGE('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', { links: /privacy|contact|dpa|data-protection/i }),
  'github-leadership': PAGE('https://github.com/about/leadership'),
  // ORCID.
  'orcid-privacy': PAGE('https://info.orcid.org/privacy-policy/', { links: /contact|team|staff|board|privacy/i }),
  'orcid-team': PAGE('https://info.orcid.org/orcid-team/'),
  // The Internet Archive: its pages need a script; these are tried and recorded as they answer.
  'ia-terms': PAGE('https://archive.org/about/terms'),
  'ia-contact': PAGE('https://archive.org/about/contact'),
  'ia-help-contact': PAGE('https://help.archive.org/help/contact-us/'),
  'ia-help': PAGE('https://help.archive.org/', { links: /contact|privacy|terms|address/i }),
  // DataCite, Crossref and JaLC: the DOI metadata.
  'datacite-privacy': PAGE('https://datacite.org/privacy-policy/', { links: /imprint|privacy|contact|team/i }),
  'datacite-imprint': PAGE('https://datacite.org/imprint/'),
  'crossref-privacy': PAGE('https://www.crossref.org/operations-and-sustainability/privacy/', { links: /contact|privacy|people|governance/i }),
  'crossref-people': PAGE('https://www.crossref.org/people/'),
  'crossref-about': PAGE('https://www.crossref.org/community/about/', { links: /contact|address|governance/i }),
  'crossref-terms': PAGE('https://www.crossref.org/membership/terms/'),
  'jalc-privacy': PAGE('https://japanlinkcenter.org/top/privacy_policy.html', { lang: 'ja' }),
  'jalc-about': PAGE('https://japanlinkcenter.org/top/about/index.html', { lang: 'ja' }),
  'jalc-committee': PAGE('https://japanlinkcenter.org/top/about/about_committee.html', { lang: 'ja' }),
  // The language models given the public parts of a submission while it is reviewed.
  'anthropic-privacy': PAGE('https://www.anthropic.com/legal/privacy', { links: /privacy|legal|contact/i }),
  'anthropic-company': PAGE('https://www.anthropic.com/company'),
  'openai-privacy': PAGE('https://openai.com/policies/privacy-policy/', { links: /privacy|contact/i }),
  'openai-privacy-row': PAGE('https://openai.com/policies/row-privacy-policy/'),
  'xai-privacy': PAGE('https://x.ai/legal/privacy-policy', { links: /privacy|legal|contact/i }),
  'xai-company': PAGE('https://x.ai/company'),

  /* Added on 2026-11-12, to close the gaps that the legal audit of that day left (docs/legal-audit-2026-11-12.md).
   * `follow` also fetches the links that match it (as many as `max`), each kept under the key with ">" and its place;
   * `alt` is one official alternative tried when the page is refused or asks for a script. */
  // The Ministry's guidance on the rules for external transmission (Article 27-12 of the Telecommunications Business Act).
  'mic-external-transmission': PAGE('https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu.html', { lang: 'ja', links: /\.pdf|faq|ＦＡＱ|Ｑ＆Ａ|Q&A|解説|gaibu/i }),
  // Its two pages: the laws, guidelines and leaflets, and the FAQ; with the PDFs they link.
  'mic-et-guidelines': PAGE('https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00001.html', { lang: 'ja', links: /\.pdf/i, follow: { re: /\.pdf/i, max: 8 }, keep: 400000 }),
  'mic-et-faq': PAGE('https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html', { lang: 'ja', links: /\.pdf/i, follow: { re: /\.pdf/i, max: 4 }, keep: 400000 }),
  // The Ministry's pages on the Act on Information Distribution Platforms: the designation of large-scale providers.
  'mic-ihoyugai': PAGE('https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/ihoyugai.html', { lang: 'ja', links: /指定|大規模|プラットフォーム|対処法|\.pdf/i, follow: { re: /001001530|001001532|001001527|001059536/, max: 4 } }),
  // Court decisions on quotation (Article 32 of the Copyright Act), as the courts' own search gives them.
  'courts-search': PAGE('https://www.courts.go.jp/hanrei/search1/index.html', { lang: 'ja', links: /hanrei|search|list/i, forms: true, scripts: true }),
  'courts-howto': PAGE('https://www.courts.go.jp/hanrei/tukaikata/index.html', { lang: 'ja', links: /hanrei|search|list|detail/i }),
  // The Agency for Cultural Affairs on copyright, and the Consumer Affairs Agency's commentary on the Consumer Contract Act.
  'bunka-copyright': PAGE('https://www.bunka.go.jp/seisaku/chosakuken/', { lang: 'ja', links: /テキスト|textbook|引用|seidokaisetsu|\.pdf/i }),
  'bunka-seidokaisetsu': PAGE('https://www.bunka.go.jp/seisaku/chosakuken/seidokaisetsu/index.html', { lang: 'ja', links: /テキスト|textbook|\.pdf|引用/i, follow: { re: /テキスト|textbook/i, max: 2 }, keep: 400000 }),
  // The commentary on the articles the Terms of Use are read against: Articles 2, 8, 8-2, 8-3, 9 and 10.
  'caa-cca-annotations': PAGE('https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations/', { lang: 'ja', links: /\.pdf|annotations/i, follow: { re: /230915_(04|13|14|15|16|17)\.pdf/, max: 6 } }),
  // The old Copyright Act (Act No. 39 of 1899) is not in the e-Gov law API, which holds laws in force; the NDL's index is tried.
  'ndl-hourei': PAGE('https://hourei.ndl.go.jp/simple/', { lang: 'ja', links: /simple|detail|search/i, forms: true, scripts: true }),
  // Vercel: what it calls commercial use, for the Hobby plan.
  'vercel-fair-use': PAGE('https://vercel.com/docs/limits/fair-use-guidelines'),
  'vercel-hobby': PAGE('https://vercel.com/docs/plans/hobby'),
  'vercel-plans': PAGE('https://vercel.com/docs/plans'),
  // Zenodo and OSF. The OSF terms are kept in Markdown by the Center for Open Science on GitHub, read at a fixed commit.
  'zenodo-terms': PAGE('https://about.zenodo.org/terms/'),
  'zenodo-policies': PAGE('https://about.zenodo.org/policies/'),
  'osf-terms': PAGE('https://raw.githubusercontent.com/CenterForOpenScience/cos.io/1a760e083cd53dfdc270919e8d6322ea179fa118/TERMS_OF_USE.md', { markdown: true }),
  // The addresses that the records of provision still lack: the Internet Archive, OpenAI, xAI, Crossref, the Japan Link Center.
  'ia-terms-archived': PAGE('https://web.archive.org/web/2026id_/https://archive.org/about/terms.php'),
  'ia-contact-archived': PAGE('https://web.archive.org/web/2026id_/https://archive.org/about/contact.php'),
  'ia-terms-archived-2022': PAGE('https://web.archive.org/web/2022id_/https://archive.org/about/terms.php'),
  'openai-privacy-archived': PAGE('https://web.archive.org/web/2026id_/https://openai.com/policies/row-privacy-policy/'),
  'openai-privacy-us-archived': PAGE('https://web.archive.org/web/2026id_/https://openai.com/policies/privacy-policy/'),
  'xai-legal': PAGE('https://x.ai/legal', { links: /legal|privacy|terms/i }),
  'xai-terms': PAGE('https://x.ai/legal/terms-of-service'),
  'xai-europe-privacy': PAGE('https://x.ai/legal/europe-privacy-policy-addendum'),
  'crossref-contact': PAGE('https://www.crossref.org/contact/', { alt: 'https://web.archive.org/web/2026id_/https://www.crossref.org/contact/' }),
  'jalc-top': PAGE('https://japanlinkcenter.org/top/', { lang: 'ja', links: /contact|toiawase|問い合わせ|about|api|規約|terms|policy|利用/i }),
  'jalc-metadata': PAGE('https://japanlinkcenter.org/top/service/about_metadata.html', { lang: 'ja', links: /api|規約|terms|利用|\.pdf/i }),
  'jalc-faq': PAGE('https://japanlinkcenter.org/top/faq/index.html', { lang: 'ja' }),
  // For the other repositories: the terms of the services they use or name, kept here so that they can be copied.
  'ssrn-terms': PAGE('https://www.ssrn.com/index.cfm/en/terms-of-use/', { alt: 'https://web.archive.org/web/2026id_/https://www.ssrn.com/index.cfm/en/terms-of-use/' }),
  'philarchive-home': PAGE('https://philarchive.org/', { links: /terms|help|polic|licen|copyright/i, alt: 'https://web.archive.org/web/2026id_/https://philarchive.org/', keep: 20000 }),
  'philarchive-about': PAGE('https://philarchive.org/help/about.html'),
  'philarchive-faq': PAGE('https://philarchive.org/help/faq.html'),
  'philpapers-terms': PAGE('https://philpapers.org/help/terms.html', { alt: 'https://web.archive.org/web/2026id_/https://philpapers.org/help/terms.html' }),
  'orcid-terms': PAGE('https://info.orcid.org/terms-of-use/', { links: /terms|api|public|licen/i }),
  'orcid-public-api-terms': PAGE('https://info.orcid.org/public-client-terms-of-service/'),
  'edx-terms': PAGE('https://www.edx.org/edx-terms-service', { alt: 'https://web.archive.org/web/2026id_/https://www.edx.org/edx-terms-service' }),
  'joss-about': PAGE('https://joss.theoj.org/about'),
  'joss-policies-src': PAGE('https://raw.githubusercontent.com/openjournals/joss/02100739082f2830cedbfd5c41b6f46c2fc9f3db/docs/policies.md', { markdown: true }),
  'joss-sidebar-src': PAGE('https://raw.githubusercontent.com/openjournals/joss/02100739082f2830cedbfd5c41b6f46c2fc9f3db/app/views/papers/_sidebar_published.html.erb', { markdown: true }),
  'datacite-terms': PAGE('https://datacite.org/terms-and-conditions/', { links: /terms|licen|cc0|api/i }),
  'datacite-api-docs': PAGE('https://support.datacite.org/docs/api', { links: /terms|licen|cc0|usage/i }),
  'crossref-rest-api': PAGE('https://www.crossref.org/documentation/retrieve-metadata/rest-api/', { links: /retrieve-metadata|licen|etiquette|terms|polite|tips/i }),
  'crossref-metadata-license': PAGE('https://www.crossref.org/documentation/retrieve-metadata/rest-api/rest-api-metadata-license-information/'),
  'openalex-license-src': PAGE('https://raw.githubusercontent.com/ourresearch/openalex-docs/8cec9dba1ee17af56e5de4666f63650a02fb798b/license.md', { markdown: true }),
  'openalex-limits-src': PAGE('https://raw.githubusercontent.com/ourresearch/openalex-docs/8cec9dba1ee17af56e5de4666f63650a02fb798b/how-to-use-the-api/rate-limits-and-authentication.md', { markdown: true }),
  'openalex-home': PAGE('https://openalex.org/', { links: /terms|licen|privacy|about/i }),
  'paperreview-home': PAGE('https://paperreview.ai/', { links: /terms|privacy|polic/i }),
  'paperreview-terms': PAGE('https://paperreview.ai/terms'),
  'conatus-about': PAGE('https://ejournals.epublishing.ekt.gr/index.php/conatus/about', { links: /about|submission|polic|copyright|licen/i, alt: 'https://web.archive.org/web/2026id_/https://ejournals.epublishing.ekt.gr/index.php/conatus/about' }),
  'conatus-submissions': PAGE('https://ejournals.epublishing.ekt.gr/index.php/conatus/about/submissions', { alt: 'https://web.archive.org/web/2026id_/https://ejournals.epublishing.ekt.gr/index.php/conatus/about/submissions' }),
};

/* Japanese laws, cabinet orders and ministerial ordinances read beyond the cited articles: found by their title in the e-Gov
 * law list, fetched whole, and kept with the articles whose text matches `keep` (or all of them), each with its SHA-256,
 * and with the supplementary provisions when `suppl` asks ("original": the first only; "all"). The articles are reduced as
 * the cited ones are (egovPlain), so that the same article has the same SHA-256 in both places. Written under `laws`. */
const LAWS = {
  'telecom-rules': { title: '電気通信事業法施行規則', keep: /二十七条の十二|百六十四条/ },
  'ipa-order': { title: '特定電気通信による情報の流通によって発生する権利侵害等への対処に関する法律施行令', keep: 'all' },
  'ipa-rules': { title: '特定電気通信による情報の流通によって発生する権利侵害等への対処に関する法律施行規則', keep: 'all' },
  'appi-order': { title: '個人情報の保護に関する法律施行令', keep: 'all' },
  'copyright-act-suppl': { title: '著作権法', keep: null, suppl: 'all' },
  'swords-act': { title: '銃砲刀剣類所持等取締法', keep: /刃体|刃物|刀剣/ },
  'swords-order': { title: '銃砲刀剣類所持等取締法施行令', keep: 'all' },
  'swords-rules': { title: '銃砲刀剣類所持等取締法施行規則', keep: /刃体|刃物|刀剣|ナイフ|あいくち/ },
};

const plain = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;|&#8217;/g, '’').replace(/&lsquo;|&#8216;/g, '‘').replace(/&ldquo;|&#8220;/g, '“').replace(/&rdquo;|&#8221;/g, '”')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&sect;/g, '§').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([a-z])(grave|acute|circ|tilde|cedil);/gi, (m, v, k) => (v + { grave: '̀', acute: '́', circ: '̂', tilde: '̃', cedil: '̧' }[k.toLowerCase()]))
  .normalize('NFC').replace(/\s+/g, ' ').trim();
// e-Gov: as tools/statutes.js reduces an article (ruby readings and tags dropped, white space collapsed).
const egovPlain = (x) => x.replace(/<Rt>[^<]*<\/Rt>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x, 'utf8').digest('hex');

/* One address with curl: the status, the final address and the text (a PDF through pdftotext). */
function curl(url, s = {}) {
  const tmp = path.join(require('os').tmpdir(), 'sophaxis-source');
  // --compressed: the Internet Archive sends its copies gzipped. The content type is read for the character set.
  const args = ['-sSL', '--compressed', '--max-time', '90', '-A', UA, '-o', tmp, '-w', '%{http_code} %{url_effective} %{content_type}', '-H', 'Accept-Language: ' + (s.lang || 'en'), url];
  if (s.accept) args.splice(0, 0, '-H', 'Accept: ' + s.accept);
  let out;
  try { out = execFileSync('curl', args, { encoding: 'utf8' }); } catch (e) { return { error: String(e.stderr || e.message).trim().slice(0, 300) }; }
  const [status, final, ...ctype] = out.trim().split(' ');
  const buf = fs.readFileSync(tmp);
  let text;
  if (buf.slice(0, 5).toString() === '%PDF-') {
    try { text = execFileSync('pdftotext', ['-layout', tmp, '-'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).replace(/\s+/g, ' ').trim(); } catch (e) { return { status: +status, error: 'pdftotext: ' + e.message }; }
    return { status: +status, final, pdf: true, text, raw: '' };
  }
  // Pages in Shift_JIS or EUC-JP (the Ministry of Internal Affairs and Communications) are decoded as they declare.
  const head = buf.slice(0, 4000).toString('latin1');
  const cs = ((/charset=["']?([\w-]+)/i.exec(ctype.join(' ')) || /<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || [])[1] || 'utf-8').toLowerCase();
  let raw;
  try { raw = /^(shift[_-]?jis|sjis|x-sjis|windows-31j|cp932|euc-jp)$/.test(cs) ? new TextDecoder(cs.replace(/^(sjis|x-sjis|windows-31j|cp932)$/, 'shift_jis')).decode(buf) : buf.toString('utf8'); } catch (e) { raw = buf.toString('utf8'); }
  if (s.sup) raw = raw.replace(/<sup[^>]*>\s*(\d+)\s*<\/sup>/gi, '.$1');
  return { status: +status, final, text: s.markdown ? raw : plain(raw), raw };
}

/* Email addresses on the pages are not kept: the repository holds no email address but the few it allows. */
const noMail = (x) => x.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, '[email address]');

/* The links of a page whose address or text matches `re`, as [text, absolute address], each once (300 at most). */
function linksOf(raw, base, re) {
  const seen = new Set(), out = [];
  for (const m of raw.matchAll(/<a\b[^>]*?href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href;
    try { href = new URL(m[1].replace(/&amp;/g, '&'), base).href; } catch (e) { continue; }
    const text = plain(m[2]).slice(0, 200);
    if (!re.test(href) && !re.test(text)) continue;
    if (seen.has(href)) continue;
    seen.add(href); out.push([text, href]);
    if (out.length >= 300) break;
  }
  return out;
}

/* The articles of a plain text, by a heading pattern: { number: text from its heading to the next }.
 * Only headings that come in rising order count, so that a mention of an article in the text is not taken for its heading. */
function cut(text, re, max = Infinity) {
  const hits = [];
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) hits.push({ n: m[1], at: m.index });
  const num = (n) => parseFloat(String(n).replace(/[^\d.-]/g, '').replace('-', '.')) || 0;
  const rising = [];
  for (const h of hits) if (num(h.n) <= max && (!rising.length || num(h.n) > num(rising[rising.length - 1].n))) rising.push(h);
  const out = {};
  rising.forEach((h, i) => { out[h.n] = text.slice(h.at, i + 1 < rising.length ? rising[i + 1].at : Math.min(text.length, h.at + 30000)).trim(); });
  return out;
}

/* GitHub's terms are Markdown: "## D. User-Generated Content" and "### 4. License Grant to Us" make section D.4. */
function cutMarkdown(md) {
  const out = {};
  let letter = null, cur = null;
  for (const line of md.split('\n')) {
    const a = /^## ([A-Z])\. /.exec(line), b = /^### (\d+)\. /.exec(line);
    if (a) { letter = a[1]; cur = letter; out[cur] = ''; } else if (b && letter) { cur = letter + '.' + b[1]; out[cur] = ''; }
    if (cur) out[cur] += line + '\n';
  }
  for (const k of Object.keys(out)) out[k] = out[k].replace(/\s+/g, ' ').trim();
  return out;
}

/* What the pages cite: { law: Set of articles }. */
function wanted() {
  const C = Cit.compile(REG);
  const want = {};
  for (const c of Cit.all(ROOT, REG, C).found) (want[c.law] = want[c.law] || new Set()).add(c.article);
  for (const [law, extra] of Object.entries(REG.fetchAlso || {})) for (const a of extra) (want[law] = want[law] || new Set()).add(a);
  return want;
}

async function egov(law, articles) {
  const id = REG.laws[law].egov;
  const url = 'https://laws.e-gov.go.jp/api/1/lawdata/' + id;
  const r = curl(url, { lang: 'ja' });
  const out = { url, status: r.status, error: r.error };
  if (r.error || r.status !== 200) return out;
  const xml = r.raw;
  out.title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
  const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
  out.headings = [...main.matchAll(/<Article[^>]*\sNum="([^"]+)"/g)].map((m) => m[1].replace('_', '-'));
  out.articles = {};
  out.shape = {};
  for (const a of [...articles].sort()) {
    const m = new RegExp('<Article[^>]*\\sNum="' + a.replace('-', '_') + '"[^>]*>[\\s\\S]*?</Article>').exec(main);
    if (!m) continue;
    out.articles[a] = egovPlain(m[0]);
    // The paragraphs, and the items of each, so that "第 32 条第 1 項第四号" can be confirmed.
    out.shape[a] = [...m[0].matchAll(/<Paragraph[^>]*>[\s\S]*?<\/Paragraph>/g)].map((p) => (p[0].match(/<Item[ >]/g) || []).length);
    out.sha256 = out.sha256 || {};
    out.sha256[a] = sha(out.articles[a]);
  }
  return out;
}

/* A foreign source; when it gives none of the wanted articles, each official alternative (`alt`) is tried in turn, and every
 * attempt is kept under `tried`. */
async function foreign(key, s, articles) {
  let out = await foreignOnce(key, s, articles);
  const got = (o) => Object.keys(o.articles || {}).length > 0;
  if (got(out) || !s.alt) return out;
  const tried = [{ url: out.url, status: out.status, error: out.error }];
  for (const u of s.alt) {
    const o = await foreignOnce(key, { ...s, url: u, pages: undefined, alt: undefined }, articles);
    tried.push({ url: u, status: o.status, error: o.error });
    if (got(o)) { out = o; break; }
  }
  out.tried = tried;
  return out;
}

async function foreignOnce(key, s, articles) {
  const out = { url: s.url || s.each || s.pages };
  if (s.each) {
    out.articles = {}; out.status = {};
    for (const a of [...articles].sort((x, y) => parseFloat(x) - parseFloat(y))) {
      const u = s.each.replace('{n}', a);
      const r = curl(u, s);
      out.status[a] = r.status || r.error;
      if (r.text) {
        const at = r.text.search(new RegExp(s.from.source.replace('(\\d+)', a.replace('.', '\\.'))));
        if (at >= 0) out.articles[a] = r.text.slice(at, at + 30000);
        else out['head' + a] = r.text.slice(0, 1500);
      }
      await sleep(1500);
    }
    out.headings = Object.keys(out.articles);
    return out;
  }
  let text = '', raw = '';
  const statuses = [];
  for (const u of s.pages || [s.url]) {
    let r = curl(u, s);
    // A page of several that is refused is read from the Internet Archive's copy (`altPrefix`), and the copy is named.
    if (s.altPrefix && (r.error || r.status !== 200)) { await sleep(1500); const a = curl(s.altPrefix + u, s); (out.alt_pages = out.alt_pages || []).push({ url: s.altPrefix + u, refused: r.status || r.error, status: a.status || a.error }); if (a.status === 200) r = a; }
    statuses.push(r.status || r.error);
    out.status = s.pages ? statuses : statuses[0];
    if (r.error) { out.error = r.error; break; }
    if (r.final && r.final !== u) out.final = r.final;
    if (r.pdf) out.pdf = true;
    text += (text ? ' ' : '') + r.text; raw += r.raw;
    await sleep(1500);
  }
  out.length = text.length;
  if (!text) return out;
  let all = {};
  if (s.markdown) all = cutMarkdown(text);
  else if (s.whole) all = s.needle && !text.includes(s.needle) ? {} : { [s.whole]: text.slice(0, s.keep || 120000) };
  else if (s.html) {
    const hits = [...raw.matchAll(s.html)].map((m) => ({ n: m[1], at: m.index }));
    hits.forEach((h, i) => { all[h.n] = plain(raw.slice(h.at, i + 1 < hits.length ? hits[i + 1].at : h.at + 60000)); });
    if (!hits.length) all = cut(text, /\bArticle (\d+) (?=[A-Z])/g);
  } else all = cut(s.after && text.includes(s.after) ? text.slice(text.indexOf(s.after)) : s.fromLast && text.includes(s.fromLast) ? text.slice(text.lastIndexOf(s.fromLast)) : text, s.split, s.max);
  if (s.split && s.whole) Object.assign(all, cut(text, s.split));
  // The recitals that verification/duties.json quotes, from the preamble ("(23) In order to ensure ... (24) ...").
  const want = (REG.recitals || {})[key];
  if (want && s.html) {
    const pre = text.slice(0, text.search(/HAVE ADOPTED THIS (?:REGULATION|DIRECTIVE)/));
    out.recitals = {};
    for (const n of want) {
      const m = new RegExp('\\(' + n + '\\) ([\\s\\S]*?) \\(' + (Number(n) + 1) + '\\) ').exec(pre);
      if (m) out.recitals[n] = '(' + n + ') ' + m[1];
    }
  }
  out.headings = Object.keys(all);
  out.articles = {};
  for (const a of articles) if (all[a] !== undefined) out.articles[a] = all[a];
  if (!out.headings.length) out.head = text.slice(0, 3000);
  return out;
}

/* The e-Gov law list (laws, cabinet orders, ministerial ordinances), read once: [{ id, name, num }]. When the list of API v1
 * does not answer, the title is searched with API v2. */
let LIST = null;
function lawList() {
  if (LIST) return LIST;
  LIST = [];
  const r = curl('https://laws.e-gov.go.jp/api/1/lawlists/1', { lang: 'ja' });
  for (const m of (r.raw || '').matchAll(/<LawNameListInfo>([\s\S]*?)<\/LawNameListInfo>/g)) {
    const g = (t) => (new RegExp('<' + t + '>([^<]*)</' + t + '>').exec(m[1]) || [])[1] || '';
    LIST.push({ id: g('LawId'), name: g('LawName'), num: g('LawNo') });
  }
  LIST.status = r.status || r.error;
  return LIST;
}
function resolveLaw(title) {
  const hit = lawList().find((l) => l.name === title);
  if (hit) return { ...hit, via: 'api/1/lawlists/1' };
  const url = 'https://laws.e-gov.go.jp/api/2/laws?law_title=' + encodeURIComponent(title);
  const r = curl(url, { lang: 'ja', markdown: true });
  try {
    const j = JSON.parse(r.raw);
    for (const l of j.laws || []) {
      const name = ((l.revision_info || l.current_revision_info || {}).law_title) || '';
      if (name === title) return { id: l.law_info.law_id, name, num: l.law_info.law_num, via: url };
    }
  } catch (e) { /* recorded below as not found */ }
  return null;
}

async function fetchLaw(key, L) {
  const out = { wanted: L.title, fetched: new Date().toISOString().slice(0, 10) };
  const hit = resolveLaw(L.title);
  if (!hit) {
    out.error = 'not found in the e-Gov law list (' + (LIST && LIST.status) + ')';
    const stem = L.title.replace(/(施行令|施行規則)$/, '');
    out.near = lawList().filter((l) => l.name.startsWith(stem)).map((l) => l.name + ' (' + l.id + ')').slice(0, 20);
    return out;
  }
  Object.assign(out, { id: hit.id, num: hit.num, resolved_by: hit.via });
  out.url = 'https://laws.e-gov.go.jp/api/1/lawdata/' + hit.id;
  const r = curl(out.url, { lang: 'ja' });
  out.status = r.status || r.error;
  if (r.error || r.status !== 200) return out;
  const xml = r.raw;
  out.title = (/<LawTitle[^>]*>([^<]*)<\/LawTitle>/.exec(xml) || [])[1] || '';
  out.law_num = (/<LawNum>([^<]*)<\/LawNum>/.exec(xml) || [])[1] || '';
  const main = (/<MainProvision[\s\S]*?<\/MainProvision>/.exec(xml) || [''])[0];
  const arts = [...main.matchAll(/<Article[^>]*\sNum="([^"]+)"[^>]*>[\s\S]*?<\/Article>/g)];
  out.headings = arts.map((m) => m[1].replace(/_/g, '-'));
  out.articles = {}; out.sha256 = {};
  if (L.keep) for (const m of arts) {
    const t = egovPlain(m[0]);
    if (L.keep === 'all' || L.keep.test(t)) { const a = m[1].replace(/_/g, '-'); out.articles[a] = t; out.sha256[a] = sha(t); }
  }
  // A cabinet order or ordinance without articles keeps its main provision whole.
  if (L.keep && !arts.length && main) { const t = egovPlain(main); out.articles.main = t; out.sha256.main = sha(t); }
  if (L.suppl) {
    out.suppl = [];
    for (const m of xml.matchAll(/<SupplProvision(?:\s+AmendLawNum="([^"]*)")?[^>]*>[\s\S]*?<\/SupplProvision>/g)) {
      if (L.suppl === 'original' && m[1]) continue;
      const t = egovPlain(m[0]);
      out.suppl.push({ amend: m[1] || '', text: t, sha256: sha(t) });
    }
  }
  return out;
}

/* One page, with its official alternative and the links it is told to follow; returns { key: record }. */
async function fetchPage(key, p) {
  const one = (url) => {
    const r = curl(url, p);
    const o = { url, status: r.status || r.error, fetched: new Date().toISOString().slice(0, 10) };
    if (r.final && r.final !== url) o.final = r.final;
    if (r.pdf) o.pdf = true;
    if (r.text) { o.length = r.text.length; o.text = noMail(r.text.replace(/\s+/g, ' ')).slice(0, p.keep || 200000); o.sha256 = sha(o.text); }
    if (p.links && r.raw) o.links = linksOf(r.raw, r.final || url, p.links).map(([t, h]) => [noMail(t), noMail(h)]);
    // A search page: its forms (action, method, and the names and values of the fields), to build the address of a search.
    if (p.forms && r.raw) o.forms = [...r.raw.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)].slice(0, 10).map((f) => ({
      attrs: f[1].replace(/\s+/g, ' ').trim().slice(0, 300),
      fields: [...f[2].matchAll(/<(input|select|textarea)\b([^>]*)>/gi)].map((x) => x[2].replace(/\s+/g, ' ').trim().slice(0, 200)).slice(0, 80),
    }));
    if (p.scripts && r.raw) o.scripts = [...r.raw.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map((x) => x[1]).slice(0, 40);
    return o;
  };
  // A refusal, or a page that only asks for a script.
  const failed = (o) => o.status !== 200 || !o.text || o.length < 400 || /Javascript is required|enable JavaScript|Just a moment|Access Denied/i.test(o.text.slice(0, 600));
  const out = {};
  let o = one(p.url);
  if (p.alt && failed(o)) {
    const tried = { url: o.url, status: o.status, length: o.length || 0, head: (o.text || '').slice(0, 200) };
    await sleep(1500);
    o = one(p.alt);
    o.tried = tried;
  }
  out[key] = o;
  if (p.follow && o.links) {
    let n = 0;
    for (const [t, h] of o.links) {
      if (n >= p.follow.max) break;
      if (!p.follow.re.test(h) && !p.follow.re.test(t)) continue;
      await sleep(1500);
      const f = one(h);
      delete f.links;
      f.from = key; f.link_text = t;
      out[key + '>' + (++n)] = f;
    }
  }
  return out;
}

async function main() {
  // SOURCES_ONLY: a comma-separated list of keys (of SOURCES, PAGES or LAWS) fetched again, or "new" for every key not yet
  // in the file; the rest of the file is kept as it was, with its date. Without it, everything is fetched afresh.
  const only = (process.env.SOURCES_ONLY || '').split(',').map((x) => x.trim()).filter(Boolean);
  const prev = only.length && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
  const out = prev || { fetched: new Date().toISOString().slice(0, 10), agent: UA, sources: {} };
  out.pages = out.pages || {}; out.laws = out.laws || {};
  const take = (bag, key) => !prev || only.includes(key) || (only.includes('new') && !(key in bag));
  const want = wanted();
  for (const [law, set] of Object.entries(want).sort()) {
    const L = REG.laws[law];
    if (!L) continue;
    const key = L.egov ? 'egov:' + L.egov : L.source;
    if (prev && !only.includes(key)) continue;
    let r;
    if (L.egov) { r = await egov(law, set); await sleep(1500); } else if (L.source && SOURCES[L.source]) {
      if (out.sources[L.source] && out.sources[L.source].fetched_now) { for (const a of set) out.sources[L.source].want.push(a); continue; }
      r = await foreign(L.source, SOURCES[L.source], [...set]);
    } else continue;
    r.want = [...set];
    if (prev) r.fetched = new Date().toISOString().slice(0, 10);
    // Fetched again with fewer of the wanted articles than before: the earlier text stays, and the attempt is noted on it.
    const before = out.sources[key];
    if (prev && before && Object.keys(before.articles || {}).length > Object.keys(r.articles || {}).length) {
      before.attempts = (before.attempts || []).concat([{ fetched: r.fetched, status: r.status, alt_pages: r.alt_pages, headings: r.headings, articles: Object.keys(r.articles || {}) }]);
      console.log(law, 'kept the earlier text:', JSON.stringify(before.attempts.slice(-1)));
      continue;
    }
    r.fetched_now = true;
    out.sources[key] = r;
    console.log(law, r.status || r.error, (r.headings || []).length, Object.keys(r.articles || {}).length + '/' + set.size);
  }
  for (const [key, p] of Object.entries(PAGES)) {
    if (!take(out.pages, key)) continue;
    const got = await fetchPage(key, p);
    for (const k of Object.keys(out.pages)) if (k.startsWith(key + '>')) delete out.pages[k];
    Object.assign(out.pages, got);
    for (const [k, o] of Object.entries(got)) console.log('page', k, o.status, o.length || 0, (o.links || []).length, o.tried ? 'alt' : '');
    await sleep(1500);
  }
  for (const [key, L] of Object.entries(LAWS)) {
    if (!take(out.laws, key)) continue;
    const r = await fetchLaw(key, L);
    out.laws[key] = r;
    console.log('law', key, r.status || r.error, r.title || '', (r.headings || []).length, Object.keys(r.articles || {}).length, (r.suppl || []).length);
    await sleep(1500);
  }
  // Keys no longer in the lists are dropped, so that the file holds only what tools/sources.js names.
  for (const k of Object.keys(out.pages)) if (!PAGES[k.split('>')[0]]) delete out.pages[k];
  for (const k of Object.keys(out.laws)) if (!LAWS[k]) delete out.laws[k];
  // A source shared by two laws (the GDPR and the UK GDPR are not; GitHub's terms are named two ways) is fetched once.
  for (const r of Object.values(out.sources)) { if (r.want) r.want = [...new Set(r.want)].sort(); delete r.fetched_now; }
  if (!Object.keys(out.laws).length) delete out.laws;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
}

module.exports = { cut, cutMarkdown, plain, egovPlain, linksOf, SOURCES, PAGES, LAWS };

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
