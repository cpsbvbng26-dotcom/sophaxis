# Sophaxis

**Preprints in Philosophy and Mathematics**

Sophaxis is an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
Authors deposit their preprint in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square; Sophaxis moderates the submission and gives it a stable record page.

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
Where the repository does not let Sophaxis fetch the PDF (OSF Preprints, Preprints.org, SSRN), the comment asks the authors to attach the deposited PDF to the issue.

Once a week (`tools/watch.js`, run by `.github/workflows/watch.yml`), Sophaxis checks that every DOI still resolves and keeps its licence,
notes new versions at figshare and arXiv that a record does not list yet, and asks the Internet Archive to save the pages and the PDF copies.

## How the site is made

```
node build.js                # writes site/ from site.json, policy.md, policies/*.md and data/papers/*.json
node verification/check.js   # checks the records, the site and the policies
```

No dependencies. The site loads nothing from other servers. The only script is `assets/search.js`, on the search page, which reads `papers.json` from the site itself.
`site/` is generated; edit `site.json`, `policy.md`, `policies/` or `data/papers/` and run `node build.js`.
When a policy changes, change its "Last updated" date too.

### Moderating

When a verified submission passes moderation, add the draft record from the issue as `data/papers/<id>.json`,
run `node build.js` and `node verification/check.js`, and open a pull request that closes the issue.
After it is merged, run the `pdf` workflow with the record id. It copies the PDFs onto a branch `claude/pdf-<id>`; open a pull request from it.
Where the repository does not let a script fetch the file (OSF Preprints, Preprints.org, SSRN), ask the authors to attach the PDF to their submission issue,
and run the workflow with `from` set to that attachment and `version` to the version it is.
Ids run `2026.0001`, `2026.0002`, … in order of listing.

### Removing a record

Follow the [Takedown Policy](policies/takedown.md). Replace the record with only
`{ "id", "status": "removed", "removal_date", "removal_reason", "issue" }`, delete its files in `data/pdf/`, rebuild and open a pull request.
`removal_reason` is one of `copyright`, `personal-data`, `author-consent`, `legal`, or `under-review` while a request is reviewed.
The page keeps its address with a notice; the record leaves every list, the feed, the JSON and the sitemap.
The record stays in the git history; where the law requires it, ask GitHub to remove it from there too.

## Licence

Text: CC BY 4.0. Code: MIT ([LICENSE](LICENSE)). Each listed work keeps its own licence.

## Use of language models

This repository was built with Claude Code (Anthropic) at the operator's request.
The operator, Takuya Nemoto, is responsible for it. Claude is not an author.

---

## 日本語

Sophaxis（ソファクシス）は、哲学・数学・論理学・数理哲学・科学哲学のための、重ね合わせ型（オーバーレイ型）のプレプリントサーバーです。
著者が Zenodo・figshare・OSF Preprints・arXiv・Preprints.org・SSRN・Research Square のどれかに置いた稿を、モデレーションのうえで一覧に載せ、固定の頁を与えます。

- 受理はモデレーションであり、査読ではありません。載った稿の質は保証しません。
- 読む側からも書く側からも、費用を取りません。
- 言語モデルなどの生成モデルを使った稿は、使い方の開示を条件に受けます。画像や図を作るモデルも同じです。生成モデルは著者になれません。
- DOI の付与はしません。DOI は置いた先のリポジトリが付けます。
- 検索エンジンが本文を読めるように、預け先が許す場合は PDF を変えずに写して置きます。
- 検索、分野ごとの一覧、著者ごとの頁（ORCID iD のある著者）、新着の Atom フィード、記録の JSON、APA・Chicago・BibTeX の引用形式があります。
- 投稿は DOI と ORCID iD を入れる形です。題・著者・要旨・ライセンス・版は、DOI の登録情報から取ります。
- 投稿できるのは著者本人だけです。ORCID の記録に投稿者の GitHub アカウントへのリンクがあり、その ORCID iD がその稿の著者のものであることを、自動の検査で確かめます。

運営は根本卓哉です。
