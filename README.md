# Sophaxis

**Preprints in Philosophy and Mathematics**

Sophaxis is an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
Authors deposit their preprint in Zenodo, Figshare, OSF Preprints, SocArXiv, MetaArXiv, arXiv, Preprints.org, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works or Jxiv; Sophaxis moderates the submission and gives it a stable record page.

- **Acceptance is moderation, not peer review.** The quality of listed work is not guaranteed.
- **No fees.** Sophaxis charges nothing, to authors or to readers.
- **Language models and other generative models are allowed when disclosed.** No generative model can be an author.
- Sophaxis assigns no DOIs. The DOI comes from the repository.
- It keeps an unmodified copy of the PDF where the repository allows it, so that search engines can index the full text.
- Search, field pages, author pages (by ORCID iD), an Atom feed (`feed.xml`), the records as JSON (`papers.json`), and citations in APA, Chicago and BibTeX, with BibTeX, RIS and CSL-JSON files (`cite/`).
- On each record page: related records (a shared ORCID iD or keyword), a link to report an error, and the saved copies at the Internet Archive.

Site: https://sophaxis.vercel.app/ (the domain `sophaxis.org` is planned).
Read the [policies](policy.md) before submitting: [Terms of Use](policies/terms.md), [Submission](policies/submission.md), [Moderation](policies/moderation.md), [Copyright](policies/copyright.md), [Licences](policies/licences.md), [Privacy](policies/privacy.md) and [Takedown](policies/takedown.md).

## Submitting

1. Add `https://github.com/<your username>` under "Websites & social links" in your ORCID record.
2. Open a [submission issue](../../issues/new?template=submission.yml) and give the DOI, your ORCID iD, the category and the statement on generative models. The issue is public.

The title, the authors, the abstract, the licence and the versions are taken from the DOI metadata.
An automatic check (`tools/intake.js`, run by `.github/workflows/intake.yml`) confirms that the GitHub account belongs to an author of the work,
and posts the result and a draft record in the issue. Only verified submissions are listed.
Where the repository does not let Sophaxis fetch the PDF (every repository except Zenodo, Figshare, arXiv and Research Square), the comment asks the authors to attach the deposited PDF to the issue.

Once a week (`tools/watch.js`, run by `.github/workflows/watch.yml`), Sophaxis checks that every DOI still resolves and keeps its licence,
notes new versions at Figshare and arXiv that a record does not list yet, and asks the Internet Archive to save the pages and the PDF copies.
It also looks in Crossref and DataCite for a published version linked to a listed preprint, and for retraction or correction notices on a recorded one; it records nothing by itself.

When a push to main changes the sitemap (`tools/indexnow.js`, run by `.github/workflows/indexnow.yml`), Sophaxis waits until the new pages are live,
then tells the search engines that take IndexNow (Bing, Yandex, Naver, Seznam and others) which record pages and PDF copies are new or changed.
Only those addresses and the home page are sent. Author pages, whose address carries an ORCID iD, are not.
Google does not take IndexNow. It reads the sitemap, which `robots.txt` names and which is registered in Google Search Console.

## How the site is made

```
node build.js                # writes site/ from site.json, policy.md, policies/*.md and data/papers/*.json
node verification/check.js   # checks the records, the site and the policies
```

No dependencies. The site loads nothing from other servers. The only script is `assets/search.js`, on the search page, which reads `papers.json` from the site itself.
`site/` is generated; edit `site.json`, `policy.md`, `policies/` or `data/papers/` and run `node build.js`.
`site/vercel.json` is generated with the rest of `site/`, because the Vercel project's root directory is `site/`. It gives the short addresses that arXiv also has: `/abs/<id>` leads to the record page, `/pdf/<id>` to its latest PDF copy, and `/pdf/<id>v<n>` to the copy of version n.
When a policy changes, change its "Last updated" date too.

### Moderating

When a verified submission passes moderation, add the draft record from the issue as `data/papers/<id>.json`,
run `node build.js` and `node verification/check.js`, and open a pull request that closes the issue.
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

### Pausing submissions

When the operator cannot work on Sophaxis at all for more than 30 days, set `"submissionsPaused": true` in `site.json`, rebuild and open a pull request.
The top page and the submit page then say that new submissions are paused. Set it back to `false` to reopen.

### Announcing a change to the policies

A change that takes away or narrows a right of authors or readers, or adds a duty, is announced at least 14 days before it takes effect.
Set `"termsNotice": { "text": "What changes, in one or two sentences.", "from": "YYYY-MM-DD" }` in `site.json`, rebuild and open a pull request; the top page shows it.
Merge the change itself on or after that date, then set `termsNotice` back to `null`.

### Withdrawing a record

Follow the [Withdrawal Policy](policies/withdrawal.md). A withdrawal issue runs `tools/withdraw.js`, which checks that the account asking belongs to an author
and posts the record as it is after withdrawal. Replace the record with it, delete its files in `data/pdf/`, rebuild and open a pull request that closes the issue.

### Recording a published version

Follow "When the work is published" in the [Submission Policy](policies/submission.md). A published-version issue runs `tools/published.js`, which checks that the account reporting belongs to an author
and that the DOI is a journal article, a conference paper, a book chapter or a book that shares an author with the record, and posts the record with its `published` object.
Replace the record with it, rebuild and open a pull request that closes the issue. The preprint stays listed.
When the weekly check reports a new retraction or correction notice on a published version, add it to `published.updates` with its type, DOI and date.

### Removing a record

Follow the [Takedown Policy](policies/takedown.md). Replace the record with only
`{ "id", "status": "removed", "removal_date", "removal_reason", "issue" }`, delete its files in `data/pdf/`, rebuild and open a pull request.
`removal_reason` is one of `copyright`, `personal-data`, `author-consent`, `legal`, or `under-review` while a request is reviewed.
The page keeps its address with a notice; the record leaves every list, the feed, the JSON and the sitemap.
The record stays in the git history; where the law requires it, ask GitHub to remove it from there too.

## Operator and contact

Sophaxis is operated by Takuya Nemoto. How to reach the operator is on the [Operator and contact](https://sophaxis.vercel.app/contact.html) page.
Sophaxis has a project page on OSF: <https://osf.io/mq7za/>, DOI [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA).
On 2026-11-01 the operator applied for Sophaxis to be listed in DOAPR, the Directory of Open Access Preprint Repositories run by COAR. Whether it is listed is DOAPR's decision.
Submission of the Sophaxis code to the Journal of Open Source Software (JOSS) is planned. JOSS asks for a repository that has been public for more than six months. The first commit here is from 2026-10-30, so the earliest possible submission is 2027-05-01. Nothing has been submitted yet. Whether a preprint server is within the scope of JOSS is for JOSS to decide.
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
| `versions` | Each `version` with its `doi` and `date` (YYYY-MM-DD), oldest first. |
| `pdfs` | The `version` and `url` of each PDF copy kept on Sophaxis, possibly empty. |
| `published` | Only when a later version has been published: its `doi`, `title`, `venue` (journal, proceedings or book), `date` (YYYY, YYYY-MM or YYYY-MM-DD) and `type` (journal article, conference paper, book chapter or book); `peer_reviewed` as the authors state it (true, false, or null for not stated); `evidence`, "publisher" when the publisher's metadata links the preprint and "authors" when only an author reported it; the date it was `reported`, the `issue` that reported it, and any `updates` (retraction, correction and other notices) with their type, DOI and date. |
| `status` | `listed` or `withdrawn`. Removed records are left out. |
| `llm_disclosure` | The authors' statement on the use of generative models. |

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
- 言語モデルなどの生成モデルを使った稿は、使い方の開示を条件に受けます。画像や図を作るモデルも同じです。生成モデルは著者になれません。
- DOI の付与はしません。DOI は置いた先のリポジトリが付けます。
- 検索エンジンが本文を読めるように、預け先が許す場合は PDF を変えずに写して置きます。
- 検索、分野ごとの一覧、著者ごとの頁（ORCID iD のある著者）、新着の Atom フィード、記録の JSON、APA・Chicago・BibTeX の引用形式があります。
- 引用は BibTeX・RIS・CSL-JSON のファイルでも取り出せます。記録の JSON の項目は、上の英語の節に書いてあります。
- 論文の頁には、関連する記録、誤りを報告する窓口、Internet Archive の保存版へのリンクがあります。
- main への push で sitemap が変わると、新しい頁が公開されるのを待ってから、IndexNow を受ける検索エンジン（Bing・Yandex・Naver・Seznam など）に、新しく載った論文の頁と PDF の写し、変わった頁を知らせます（`tools/indexnow.js`）。送るのはそれらとトップの頁の URL だけです。ORCID iD を含む著者の頁の URL は送りません。
- Google は IndexNow を受けません。Google には、`robots.txt` が示し、Google Search Console に登録した sitemap から読ませます。
- 投稿は DOI と ORCID iD を入れる形です。題・著者・要旨・ライセンス・版は、DOI の登録情報から取ります。
- 投稿できるのは著者本人だけです。ORCID の記録に投稿者の GitHub アカウントへのリンクがあり、その ORCID iD がその稿の著者のものであることを、自動の検査で確かめます。

貢献の窓口と、変更を確かめる手順は [CONTRIBUTING.md](CONTRIBUTING.md) に、これまでの変更は [CHANGELOG.md](CHANGELOG.md) にあります（どちらも英語）。

運営は根本卓哉です。
OSF にプロジェクトの頁があります（<https://osf.io/mq7za/>、DOI [10.17605/OSF.IO/MQ7ZA](https://doi.org/10.17605/OSF.IO/MQ7ZA)）。2026-11-01 に、COAR が運営する DOAPR（Directory of Open Access Preprint Repositories）への掲載を申請しました。掲載するかどうかは DOAPR が決めます。
Sophaxis のコードを、Journal of Open Source Software（JOSS）に投稿することを計画しています。JOSS は、公開から六か月を超えたリポジトリを求めます。ここの最初のコミットは 2026-10-30 なので、最短で 2027-05-01 です。まだ投稿していません。プレプリントサーバーが JOSS の範囲に入るかどうかは、JOSS が決めます。
