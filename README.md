# Sophaxis

**Preprints in Philosophy and Mathematics**

Sophaxis is an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
Authors deposit their preprint in Zenodo, Figshare, OSF Preprints, SocArXiv, MetaArXiv, arXiv, Preprints.org, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works or Jxiv; Sophaxis moderates the submission and gives it a stable record page.

- **Acceptance is moderation, not peer review.** The quality of listed work is not guaranteed.
- **No fees.** Sophaxis charges nothing, to authors or to readers.
- **Not offered in 28 places**, among them the European Union, the European Economic Area, the United Kingdom, China, Thailand and Russia; the Submission Policy lists them all, with the law of each. From 2026-11-22 Sophaxis does not list work by an author who lives there, or who stays there between the submission and the listing, even briefly. This depends only on where an author lives or stays, not on nationality, race or ethnic origin. The reason is laws that require, or are reported to require, a local representative, the storage of personal data there, or registration there (among them GDPR and UK GDPR Article 27, EU Digital Services Act Article 13, China's Personal Information Protection Law Article 53 and Thailand's Personal Data Protection Act section 37(5)), and Sophaxis has none of these.
- **Language models and other generative models are allowed when disclosed.** No generative model can be an author.
- Sophaxis assigns no DOIs. The DOI comes from the repository.
- It keeps an unmodified copy of the PDF where the repository allows it, so that search engines can index the full text.
- Search, field pages, author pages (by ORCID iD), an Atom feed (`feed.xml`), the records as JSON (`papers.json`), and citations in APA, Chicago and BibTeX, with BibTeX, RIS and CSL-JSON files (`cite/`).
- On each record page: related records (a shared ORCID iD or keyword), a link to report an error, and the saved copies at the Internet Archive.

Site: https://sophaxis.vercel.app/. Sophaxis has no domain of its own; when one might be considered is said under [Operator and contact](#operator-and-contact).
Read the [policies](policy.md) before submitting: [Terms of Use](policies/terms.md), [Submission](policies/submission.md), [Moderation](policies/moderation.md), [Copyright](policies/copyright.md), [Licences](policies/licences.md), [Privacy](policies/privacy.md) and [Takedown](policies/takedown.md).

## Sophaxis itself: DOI, listings and registrations under review

The [OSF project page](https://osf.io/mq7za/) describes Sophaxis and gives it a DOI: [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA).
The DOI names Sophaxis as a project, not a listed work. Cite it to refer to Sophaxis itself.

The code and the records are archived at Zenodo with each release. Version 1.0.0: [10.5281/zenodo.24033372](https://doi.org/10.5281/zenodo.24033372). Every version: [10.5281/zenodo.24033371](https://doi.org/10.5281/zenodo.24033371), which resolves to the latest. Cite these for the software; `CITATION.cff` gives the citation.

Sophaxis keeps a community at Zenodo, opened on 2026-11-07: <https://zenodo.org/communities/sophaxis>. It gathers the Zenodo records of works listed on Sophaxis. A record is added only when the same version is listed on Sophaxis, and every addition is reviewed. A request to add the record of a work by an author who lives in a place where Sophaxis is not offered, as the Submission Policy lists them, is declined from 2026-11-22, because such a work is not listed on Sophaxis; the request itself stays with Zenodo, under CERN's own terms. Any Zenodo user can open a community; it is not an affiliation with Zenodo, and Zenodo does not endorse Sophaxis.

Sophaxis has been listed in ROAR, the Registry of Open Access Repositories at the University of Southampton, since 2026-11-06 (Japan time): <https://roar.eprints.org/27422/>.

Since 2026-11-09 (Japan time), Sophaxis has been listed under Philosophy and under Mathematics on the [Disciplinary repositories](https://oad.simmons.edu/oadwiki/Disciplinary_repositories) page of the Open Access Directory. The directory is hosted by the School of Library and Information Science at Simmons University and supervised by an independent editorial board, and only accounts approved by its editor can edit it. The operator's account, requested on 2026-11-03, was approved, and the operator added the entry. The directory's guide for contributors describes no review of each entry before it appears, so the listing is not a review of Sophaxis.

Sophaxis has also applied to the registries below. None of them has listed it yet, and each decides for itself. The dates are Japan time; the state is as of 2026-11-09.

| Registry | What it is | Applied | State |
| --- | --- | --- | --- |
| DOAPR (COAR) | Directory of Open Access Preprint Repositories | 2026-11-01 | Under review |
| PhilPapers | Open Access Gateway, the archives whose papers PhilPapers indexes | 2026-11-03 | Requested; each archive is vetted |
| OpenDOAR (Jisc) | Directory of Open Access Repositories | 2026-11-08 | Asked; likely eligible, but new submissions are paused until an update in January 2027 |

Each application is described under [Operator and contact](#operator-and-contact).

## Submitting

1. Add `https://github.com/<your username>` under "Websites & social links" in your ORCID record.
2. Open a [submission issue](../../issues/new?template=submission.yml) and give the DOI, your ORCID iD, the category and the statement on generative models. The issue is public.

The title, the authors, the abstract, the licence and the versions are taken from the DOI metadata.
An automatic check (`tools/intake.js`, run by `.github/workflows/intake.yml`) confirms that the GitHub account belongs to an author of the work,
and posts the result and a draft record in the issue. Only verified submissions are listed.
For a verified submission the comment also gives advice on the DOI metadata from [deposit-check](https://github.com/cpsbvbng26-dotcom/deposit-check), checked out at a pinned commit: its errors and warnings, such as a missing abstract or licence. The advice does not decide the listing.
Where the repository does not let Sophaxis fetch the PDF (every repository except Zenodo, Figshare, arXiv and Research Square), the comment asks the authors to attach the deposited PDF to the issue.

Once a week (`tools/watch.js`, run by `.github/workflows/watch.yml`), Sophaxis checks that every DOI still resolves and keeps its licence,
notes new versions at Figshare and arXiv that a record does not list yet, and asks the Internet Archive to save the pages and the PDF copies.
It also looks in Crossref and DataCite for a published version linked to a listed preprint, and for retraction or correction notices on a recorded one; it records nothing by itself.
For information, it reads how OpenAlex holds each work shown: whether OpenAlex has the work and its abstract, and whether a Sophaxis record page is among its locations. It writes this to the summary of the run, and to the weekly issue when there is one; it does not open an issue by itself.

When a push to main changes the sitemap (`tools/indexnow.js`, run by `.github/workflows/indexnow.yml`), Sophaxis waits until the new pages are live,
then tells the search engines that take IndexNow (Bing, Yandex, Naver, Seznam and others) which record pages and PDF copies are new, changed or gone.
A gone address is one that left the sitemap, such as a removed record, so that the engines visit it again and drop what they held.
The new and changed pages are saved to the Internet Archive at once; a gone one never is. The weekly check saves every page again.
A push made by the removal workflow starts no other workflow, so that workflow does the same itself after it pushes.
Only those addresses and the home page are sent. Author pages, whose address carries an ORCID iD, are not.
Google does not take IndexNow. It reads the sitemap, which `robots.txt` names and which is registered in Google Search Console.

For language models and the search services built on them, the site serves `llms.txt` (https://sophaxis.vercel.app/llms.txt) and `llms-full.txt`, in the form of the llms.txt proposal.
`llms.txt` gives the facts taken from `site.json` and the records, and links every policy and page; `llms-full.txt` holds every policy and page word for word, from the same Markdown.
Both are built by `build.js`, say that the policies apply where they differ, and give no email address.

## How the site is made

```
node build.js                # writes site/ from site.json, policy.md, policies/*.md and data/papers/*.json
node verification/check.js   # checks the records, the site and the policies
node verification/check_keyboard.js   # Tab through every page and measure the layout (needs playwright and Chromium)
```

No dependencies. The site loads nothing from other servers. The only script is `assets/search.js`, on the search page, which reads `papers.json` from the site itself.
`site/` is generated; edit `site.json`, `policy.md`, `policies/` or `data/papers/` and run `node build.js`.
`site/vercel.json` is generated with the rest of `site/`, because the Vercel project's root directory is `site/`. It gives the short addresses that arXiv also has: `/abs/<id>` leads to the record page, `/pdf/<id>` to its latest PDF copy, and `/pdf/<id>v<n>` to the copy of version n.
When a policy changes, change its "Last updated" date too.

### Moderating

When a verified submission passes moderation, add the draft record from the issue as `data/papers/<id>.json`, set `listed` to the day it is merged,
run `node build.js` and `node verification/check.js`, and open a pull request that closes the issue.
When a record changes later (a new version, a note, a published version), set `updated` to that day. OAI-PMH harvesters read the later of the two as the day the record changed.
After it is merged, run the `pdf` workflow with the record id. It copies the PDFs onto a branch `claude/pdf-<id>`; open a pull request from it.
Where the repository does not let a script fetch the file (OSF Preprints, Preprints.org, SSRN), ask the authors to attach the PDF to their submission issue,
and run the workflow with `from` set to that attachment and `version` to the version it is.
Ids run `2026.0001`, `2026.0002`, … in order of listing.
The id in a draft is provisional. If `data/papers/<id>.json` already exists when the record is added, give the record the next free id instead.
`verification/check.js` reads the whole git history and fails if an id that was ever given to one work now holds another, or has disappeared.

### DOIs of Sophaxis's own

Sophaxis does not register DOIs today. If it becomes a DataCite member, set `"doi": { "prefix": "10.xxxxx", "suffix": "sophaxis.{id}" }` in `site.json`.
The build then gives every record the DOI `<prefix>/sophaxis.<id>`, shows it on the record page and writes its DataCite metadata to `site/datacite/<id>.json`.
`node tools/register_doi.js --dry-run`, then `--test`, then without a flag, registers them. The pages that say that Sophaxis assigns no DOIs must change in the same pull request; the check fails until they do.

### ISSN

The top page shows the day the records last changed and how often they are updated, as the ISSN Japan Centre asks of a database.
If an ISSN is assigned, set `"issn": "NNNN-NNNC"` in `site.json`; the top page then shows it. The build refuses a number whose check digit does not match. No ISSN is set until one is assigned.

### Pausing submissions

When the operator cannot work on Sophaxis at all for more than 30 days, set `"submissionsPaused": true` in `site.json`, rebuild and open a pull request.
The top page and the submit page then say that new submissions are paused. Set it back to `false` to reopen.

### Announcing a change to the policies

A change that takes away or narrows a right of authors or readers, or adds a duty, is announced at least 14 days before it takes effect.
Set `"termsNotice": { "text": "What changes, in one or two sentences.", "from": "YYYY-MM-DD" }` in `site.json`, rebuild and open a pull request; the top page shows it.
Merge the change itself on or after that date, then set `termsNotice` back to `null`.

### Withdrawing a record

Follow the [Withdrawal Policy](policies/withdrawal.md). A withdrawal issue runs `tools/withdraw.js`, which checks that the account asking belongs to an author.
The author chooses withdrawal or removal. For withdrawal, the check posts the record as it is after withdrawal: replace the record with it, delete its files in `data/pdf/`, rebuild and open a pull request that closes the issue.
For removal, label the verified issue `upheld`: `tools/removal.js` removes the record as for an upheld removal request, and empties, closes and locks the withdrawal issue too.

### Recording a published version

Follow "When the work is published" in the [Submission Policy](policies/submission.md). A published-version issue runs `tools/published.js`, which checks that the account reporting belongs to an author
and that the DOI is a journal article, a conference paper, a book chapter or a book that shares an author with the record, and posts the record with its `published` object.
Replace the record with it, rebuild and open a pull request that closes the issue. The preprint stays listed.
When the weekly check reports a new retraction or correction notice on a published version, add it to `published.updates` with its type, DOI and date.

### What runs by itself

Every automatic step is listed, with when it runs, what it reads and writes and what it leaves to the operator, on the page [What runs by itself](https://sophaxis.vercel.app/automation.html) (`automation.md`).
In short: the checks of each submission, withdrawal and reported published version; the acknowledgement of removal requests, the authors' notice, and taking exposed personal data offline at once; the operator's decision carried out on the label `upheld` or `not-upheld`; a daily reminder of requests near 7 days; the checks on every push; IndexNow and the Internet Archive on every change; and the weekly watch.
No automatic step decides on a request, uses a language model or holds a key other than the run's own GitHub token.

### Removing a record

Follow the [Takedown Policy](policies/takedown.md). A removal issue runs `tools/removal.js` (`.github/workflows/removal.yml`).
It acknowledges the request with the day the answer is due, tells the authors in their submission issue, and, where the issue reports exposure of personal data,
takes the record page (title, authors, abstract and PDF copy) offline at once by making the record a notice under review.
To decide, label the issue `upheld` or `not-upheld`; only the repository owner's label acts.
Upheld, the record becomes a notice that says only that it was removed, every automatic comment about it is deleted, and the issues that name it are emptied, closed and locked, for the owner to delete; not upheld, what was taken offline is put back from the git history.
Every change is built and checked before it is pushed to `main`. A request sent by email is handled by running the workflow by hand with the id.
Once a day, removal requests and verified withdrawals that the operator has not answered get a reminder two days before the 7 days run out.

A removed record keeps only `{ "id", "status": "removed", "removal_date" }`, with no reason, and its files in `data/pdf/` are deleted.
While a request is reviewed, the record is `{ "id", "status": "removed", "removal_date", "removal_reason": "under-review", "issue" }`.
The page keeps its address with a notice; the record leaves every list, the feed, the JSON and the sitemap.
The record stays in the git history; where the law requires it, ask GitHub to remove it from there too.

## Operator and contact

Sophaxis is operated by Takuya Nemoto. How to reach the operator is on the [Operator and contact](https://sophaxis.vercel.app/contact.html) page.
The operator, who is at present also the only moderator, runs Sophaxis as an unpaid volunteer. It is served only within the free services of GitHub and Vercel; the operator pays personally for Claude Code, with which it is written. Sophaxis began because the operator looked for one place that lists open preprints in philosophy and in mathematics side by side, and did not find one; it is kept for the operator's own reading and for anyone who works on the same questions. The operator keeps Sophaxis as a hobby, as an extension of a personal reading shelf. Only the authors of a work can submit it, and the operator does not list a work by someone else because the operator has read it; see the [Disclaimer](https://sophaxis.vercel.app/disclaimer.html).
Sophaxis has a project page on OSF: <https://osf.io/mq7za/>, DOI [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA).
On 2026-11-01 the operator applied for Sophaxis to be listed in DOAPR, the Directory of Open Access Preprint Repositories run by COAR. Whether it is listed is DOAPR's decision.
On 2026-11-03 (Japan time) the OAI-PMH base URL, <https://sophaxis.vercel.app/oai>, passed the initial tests of the validator of the Open Archives Initiative. The Initiative stopped registering data providers on 2025-07-18, so this is a validation, not a listing.
On the same day the operator asked PhilPapers to add Sophaxis to its Open Access Gateway, the list of archives whose papers PhilPapers indexes. Each archive is vetted before it is added, so whether it is added is PhilPapers' decision.
On the same day the operator submitted a record of Sophaxis to ROAR, the Registry of Open Access Repositories at the University of Southampton. It passed editorial review, and Sophaxis has been listed there since 2026-11-06 (Japan time): <https://roar.eprints.org/27422/>.
On 2026-11-08 (Japan time) the operator asked OpenDOAR, the Directory of Open Access Repositories run by Jisc, whether Sophaxis meets its inclusion criteria. Jisc answered that a preprint server that holds the PDFs on its own server would likely meet them, and that new submissions are paused while OpenDOAR is under review, with an update promised for January 2027. Sophaxis will apply after that update; whether it is listed is OpenDOAR's decision.
Submission of the Sophaxis code to the Journal of Open Source Software (JOSS) is planned. JOSS asks for a repository that has been public for more than six months. The first commit here is from 2026-10-30, so the earliest possible submission is 2027-05-01. Nothing has been submitted yet. Whether a preprint server is within the scope of JOSS is for JOSS to decide.
If the number of listed works reaches 1,000, the operator may, after preparation, consider giving Sophaxis a domain of its own and running it through an international non-governmental organisation (NGO). This is a possibility, not a plan or a promise: nothing has been decided, no such organisation exists, and Sophaxis does not ask for or accept money, donations or members for it. Any such step would be taken only within the law and announced on the top page before it takes effect. Until then, Sophaxis is run by one person in Japan at <https://sophaxis.vercel.app/>.
Short answers to common questions are in the [FAQ](https://sophaxis.vercel.app/faq.html); where they differ from a policy, the policy applies.
What Sophaxis does not promise is in the [Disclaimer](https://sophaxis.vercel.app/disclaimer.html). Repositories and DOI registration agencies can read what Sophaxis takes from them on [a page of their own](https://sophaxis.vercel.app/repositories.html).

## Reusing the records

Every shown record is in `papers.json`, newest first. The fields:

| Field | Content |
| --- | --- |
| `id` | The Sophaxis id, such as `2026.0001`. It never changes and is never reused. |
| `url` | The record page. |
| `title` | The title, from the DOI metadata. |
| `authors` | Each author's `name`, and `orcid` where the metadata gives one. |
| `abstract` | The abstract. It is part of the work and stays under the work's licence. |
| `abstract_source` | `"authors"` when the DOI metadata has no abstract and the authors gave it in the submission issue; absent when the abstract comes from the DOI metadata. |
| `keywords` | The keywords from the DOI metadata, possibly empty. |
| `categories` | The fields of `site.json` the record is listed in, the main one first. |
| `license` | The SPDX id of the work's licence: `CC-BY-4.0`, `CC-BY-SA-4.0` or `CC0-1.0`. |
| `language` | Where known, the language of the work as ISO 639-3, such as `eng`. The draft from the intake takes it from the DOI metadata. |
| `versions` | Each `version` with its `doi` and `date` (YYYY-MM-DD), oldest first. |
| `listed` | The day the record was added to Sophaxis (YYYY-MM-DD). |
| `updated` | Only when the record changed later: the day of its last change on Sophaxis. |
| `pdfs` | The `version` and `url` of each PDF copy kept on Sophaxis, possibly empty. |
| `published` | Only when a later version has been published: its `doi`, `title`, `venue` (journal, proceedings or book), `date` (YYYY, YYYY-MM or YYYY-MM-DD) and `type` (journal article, conference paper, book chapter or book); `peer_reviewed` as the authors state it (true, false, or null for not stated); `evidence`, "publisher" when the publisher's metadata links the preprint and "authors" when only an author reported it; the date it was `reported`, the `issue` that reported it, and any `updates` (retraction, correction and other notices) with their type, DOI and date. |
| `status` | `listed` or `withdrawn`. Removed records are left out. |
| `llm_disclosure` | The authors' statement on the use of generative models. |

The records can also be harvested with OAI-PMH 2.0, at the base URL `https://sophaxis.vercel.app/oai` (for example https://sophaxis.vercel.app/oai?verb=Identify).
- Metadata: Dublin Core (`oai_dc`). The record page, the DOI and the PDF copy are among its identifiers.
- Metadata: `oai_openaire`, the application profile of the OpenAIRE Guidelines for Literature Repositories v4. Each record is an open access preprint (COAR `c_abf2`, `c_816b`); its identifier is the record page; it is `IsIdenticalTo` the DOI of the deposited work, whose repository is the publisher; the PDF copy is its full-text file; the ORCID iD of each author is given. Every listed record validates against the guidelines' schema 4.0 (checked with `xmllint` on 2026-11-08).
- Sets: the fields, and `openaire` with every record shown, as the OpenAIRE guidelines for literature repositories (v3) ask; v4 asks for no set. The language is given as ISO 639-3 where the record has one. Sophaxis has not applied to OpenAIRE.
- Identifiers: `oai:sophaxis.vercel.app:<id>`.
- Datestamp: the later of `listed`, `updated` and the last change of the record, in days. A removed record stays, marked deleted.
- Lists are answered whole, with no resumption token.
- `tools/oai.js` makes the answers; the build writes it with the records to `site/api/oai.js`, which Vercel runs as a function.

Identify gives an `adminEmail`, set in `site.json`, for the administrators of harvesters. It is an address the operator made for this use. Other requests go as the [contact page](https://sophaxis.vercel.app/contact.html) says.

`feed.xml` is an Atom feed of the same records, and `cite/<id>.bib`, `cite/<id>.ris` and `cite/<id>.json` (CSL-JSON) hold the citation of each one.

## Contributing

Where each kind of contribution goes, and how to build and check a change, is in [CONTRIBUTING.md](CONTRIBUTING.md). The changes so far are in [CHANGELOG.md](CHANGELOG.md).

## Licence

Text: CC BY 4.0. Code: MIT ([LICENSE](LICENSE)). Each listed work keeps its own licence.

## Use of language models

This repository was built with Claude Code (Anthropic) at the operator's request.
The operator, Takuya Nemoto, is responsible for it. Claude is not an author.

---

## 日本語

Sophaxis（ソファクシス）は、哲学・数学・論理学・数理哲学・科学哲学のための、重ね合わせ型（オーバーレイ型）のプレプリントサーバーです。
著者が Zenodo・Figshare・OSF Preprints・SocArXiv・MetaArXiv・arXiv・Preprints.org・SSRN・Research Square・SciELO Preprints・Qeios・ScienceOpen Preprints・Advance・KC Works・Jxiv のどれかに置いた稿を、モデレーションのうえで一覧に載せ、固定の頁を与えます。

- 受理はモデレーションであり、査読ではありません。載った稿の質は保証しません。
- 稿の中身・権利・生成モデルの開示の責任は、すべて著者が負います。法律が許す範囲で、第三者からの請求も著者の責任です。
- 読む側からも書く側からも、費用を取りません。
- 2026-11-22 から、著者のだれかが、Sophaxis を提供しない 28 の国と地域に住んでいるか、投稿から掲載までのあいだにそこに滞在している作品は載せません。旅行・出張・留学のような短い滞在も含みます。欧州連合・欧州経済領域・英国・中国・タイ・ロシアなどです。一覧と、それぞれの法令は、投稿の規程の表にあります。これらの国と地域には、現地に代理人を置くことや、個人データを国内に保存することなどを求める法令があり、Sophaxis はそれを満たせないためです。決めているのは住んでいる場所と滞在している場所だけで、国籍・人種・民族によるものではありません。
- 言語モデルなどの生成モデルを使った稿は、使い方の開示を条件に受けます。画像や図を作るモデルも同じです。生成モデルは著者になれません。
- DOI の付与はしません。DOI は置いた先のリポジトリが付けます。
- 検索エンジンが本文を読めるように、預け先が許す場合は PDF を変えずに写して置きます。
- 検索、分野ごとの一覧、著者ごとの頁（ORCID iD のある著者）、新着の Atom フィード、記録の JSON、APA・Chicago・BibTeX の引用形式があります。
- 引用は BibTeX・RIS・CSL-JSON のファイルでも取り出せます。記録の JSON の項目は、上の英語の節に書いてあります。
- 論文の頁には、関連する記録、誤りを報告する窓口、Internet Archive の保存版へのリンクがあります。
- main への push で sitemap が変わると、新しい頁が公開されるのを待ってから、IndexNow を受ける検索エンジン（Bing・Yandex・Naver・Seznam など）に、新しく載った論文の頁と PDF の写し、変わった頁、sitemap から外れた頁（削除した記録など）を知らせます（`tools/indexnow.js`）。新しい頁と変わった頁は、その場で Internet Archive にも保存します。外れた頁は保存しません。削除の自動処理が push したときも、同じことをその場で行います。送るのはそれらとトップの頁の URL だけです。ORCID iD を含む著者の頁の URL は送りません。
- 自動で動く手順は、いつ動き、何を読み、何を書き、何を運営者に残すかとともに、[What runs by itself](https://sophaxis.vercel.app/automation.html) の頁にすべて挙げています。どの手順も依頼の判断はせず、言語モデルを使わず、実行ごとに GitHub が渡すトークンのほかに鍵を持ちません。
- Google は IndexNow を受けません。Google には、`robots.txt` が示し、Google Search Console に登録した sitemap から読ませます。
- 言語モデルと、それを使う検索のために、`llms.txt`（https://sophaxis.vercel.app/llms.txt）と `llms-full.txt` を置いています。`llms.txt` は `site.json` と記録から取った事実と、すべての規程と頁へのリンクです。`llms-full.txt` は、すべての規程と頁を、頁と同じ Markdown から一字一句そのまま収めたものです。どちらも `build.js` が作り、食い違うときは規程が優先すると書き、メールアドレスは載せません。
- 投稿は DOI と ORCID iD を入れる形です。題・著者・要旨・ライセンス・版は、DOI の登録情報から取ります。
- 確かめが通った投稿には、預け先の登録情報についての助言も返します（[deposit-check](https://github.com/cpsbvbng26-dotcom/deposit-check) による、要旨やライセンスの欠けなど）。助言は掲載の可否を決めません。
- 投稿できるのは著者本人だけです。ORCID の記録に投稿者の GitHub アカウントへのリンクがあり、その ORCID iD がその稿の著者のものであることを、自動の検査で確かめます。

### Sophaxis 自体の DOI、掲載先と、審査中の登録

[OSF のプロジェクトの頁](https://osf.io/mq7za/)が Sophaxis を説明し、DOI を与えています。DOI は [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA) です。
この DOI が指すのは、プロジェクトとしての Sophaxis です。載っている稿ではありません。Sophaxis そのものを挙げるときに引きます。

コードと記録は、版を出すたびに Zenodo に保存しています。版 1.0.0 の DOI は [10.5281/zenodo.24033372](https://doi.org/10.5281/zenodo.24033372) です。すべての版に共通する DOI は [10.5281/zenodo.24033371](https://doi.org/10.5281/zenodo.24033371) で、いちばん新しい版を指します。ソフトウェアとして挙げるときは、こちらを引きます。

Zenodo に Sophaxis のコミュニティを置いています。2026-11-07 に開きました（<https://zenodo.org/communities/sophaxis>）。Sophaxis に載っている稿のうち、Zenodo にあるものを集めています。入れるのは、同じ版が Sophaxis に載っているものだけです。追加はどれも審査を経ます。2026-11-22 から、著者のだれかが Sophaxis を提供しない国と地域（投稿の規程の表にあります）に住んでいる作品については、記録を足す依頼を断ります。その作品は Sophaxis に載らないためです。依頼そのものは、CERN の規約のもとで Zenodo に残ります。コミュニティは Zenodo の利用者なら誰でも開けるもので、Zenodo との提携ではありません。Zenodo が Sophaxis を推薦しているわけでもありません。

サウサンプトン大学の Registry of Open Access Repositories（ROAR）に、2026-11-06（日本時間）から載っています（<https://roar.eprints.org/27422/>）。

2026-11-09（日本時間）から、Open Access Directory の [Disciplinary repositories](https://oad.simmons.edu/oadwiki/Disciplinary_repositories) の頁で、Philosophy と Mathematics の二つの節に Sophaxis が載っています。この一覧は、シモンズ大学の図書館情報学の大学院が運営し、独立した編集委員会が監督しています。編集できるのは、編集者が承認したアカウントだけです。2026-11-03 に申請した運営者のアカウントが承認され、運営者が項目を足しました。寄稿者向けの案内には、項目が載る前に一件ずつ審査する手順は書かれていないので、この掲載は Sophaxis の審査ではありません。

ほかに、次の登録簿に申請しています。こちらはまだ載っていません。載せるかどうかは、それぞれが決めます。日付は日本時間です。状態は 2026-11-09 の時点のものです。

| 登録先 | 何か | 申請日 | 状態 |
| --- | --- | --- | --- |
| DOAPR（COAR） | オープンアクセスのプレプリントリポジトリの一覧 | 2026-11-01 | 審査中 |
| PhilPapers | Open Access Gateway。PhilPapers が論文を索引するアーカイブの一覧 | 2026-11-03 | 依頼済み。一件ずつ審査がある |
| OpenDOAR（Jisc） | オープンアクセスのリポジトリの一覧 | 2026-11-08 | 問い合わせ済み。基準を満たす見込みだが、新しい登録は 2027 年 1 月の案内まで止まっている |

貢献の窓口と、変更を確かめる手順は [CONTRIBUTING.md](CONTRIBUTING.md) に、これまでの変更は [CHANGELOG.md](CHANGELOG.md) にあります（どちらも英語）。

運営は根本卓哉です。
運営者は、現在ただ一人のモデレーターを兼ね、無報酬のボランティアとして運営しています。配信は GitHub と Vercel の無料の範囲だけで行っています。サイトとコードを書く Claude Code の利用料は、運営者が個人で払っています。哲学と数学の公開済みのプレプリントを並べて載せる場を探し、見つからなかったことが始まりです。運営者自身が読むためであり、同じ問いを考える人のためでもあります。ほかのアーカイブを評価するものではありません。運営者は、趣味の読書棚の延長として Sophaxis を使っています。載せるのは、著者本人が投稿した論文だけです。運営者が読んだからといって、他人の論文を載せることはありません。営利ではなく、投稿料も閲覧料も広告もありません。詳しくは [Disclaimer](https://sophaxis.vercel.app/disclaimer.html) にあります（英語）。
OSF にプロジェクトの頁があります（<https://osf.io/mq7za/>、DOI [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA)）。2026-11-01 に、COAR が運営する DOAPR（Directory of Open Access Preprint Repositories）への掲載を申請しました。掲載するかどうかは DOAPR が決めます。
2026-11-03（日本時間）に、OAI-PMH の入口（<https://sophaxis.vercel.app/oai>）が Open Archives Initiative の検証ツールの初期テストを通りました。この組織は 2025-07-18 にデータ提供者の登録を終えています。これは検証であって、一覧への掲載ではありません。
同じ日に、PhilPapers に、Open Access Gateway へ Sophaxis を加えるよう依頼しました。PhilPapers が論文を索引するアーカイブの一覧です。加える前に一件ずつ審査があります。加えるかどうかは PhilPapers が決めます。
同じ日に、サウサンプトン大学の Registry of Open Access Repositories（ROAR）に、Sophaxis の記録を出しました。編集の審査を通り、2026-11-06（日本時間）から載っています（<https://roar.eprints.org/27422/>）。
2026-11-08（日本時間）に、Jisc が運営する OpenDOAR（Directory of Open Access Repositories）に、Sophaxis が掲載の基準を満たすかを問い合わせました。Jisc からは、PDF を自分のサーバーに置くプレプリントサーバーなら基準を満たす見込みが高いこと、OpenDOAR を見直すあいだ新しい登録を止めていて、2027 年 1 月に案内を出すことの返事がありました。その案内のあとに申請します。載せるかどうかは OpenDOAR が決めます。
Sophaxis のコードを、Journal of Open Source Software（JOSS）に投稿することを計画しています。JOSS は、公開から六か月を超えたリポジトリを求めます。ここの最初のコミットは 2026-10-30 なので、最短で 2027-05-01 です。まだ投稿していません。プレプリントサーバーが JOSS の範囲に入るかどうかは、JOSS が決めます。
収録が 1,000 件に達したら、運営者は、準備を経て、Sophaxis に独自のドメインを取ることと、国際的な非政府組織（NGO）として運営することを検討する可能性があります。これは可能性であり、計画でも約束でもありません。まだ何も決まっておらず、そのための団体もありません。Sophaxis は、そのための資金・寄付・会員を求めず、受け取りません。こうした変更は法令の範囲でだけ行い、効力が始まる前にトップの頁で告知します。それまでは、日本に住む一人の運営者が <https://sophaxis.vercel.app/> で運営します。
