# Sophaxis

**Preprints in Philosophy and Mathematics**

Sophaxis is an overlay preprint server for philosophy, mathematics, logic and the philosophy of mathematics.
Authors deposit their preprint in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square; Sophaxis moderates the submission and gives it a stable record page.

- **Acceptance is moderation, not peer review.** The quality of listed work is not guaranteed.
- **Diamond open access.** Sophaxis charges nothing, to authors or to readers.
- **Language models and other generative models are allowed when disclosed.** No generative model can be an author.
- Sophaxis assigns no DOIs. The DOI comes from the repository.
- It keeps an unmodified copy of the PDF where the repository allows it, so that search engines can index the full text.

Site: https://sophaxis.vercel.app/ (the domain `sophaxis.org` is planned).
Read the [policy](policy.md) before submitting.

## Submitting

1. Add `https://github.com/<your username>` under "Websites & social links" in your ORCID record.
2. Open a [submission issue](../../issues/new?template=submission.yml) and give the DOI, your ORCID iD, the category and the statement on generative models. The issue is public.

The title, the authors, the abstract, the licence and the versions are taken from the DOI metadata.
An automatic check (`tools/intake.js`, run by `.github/workflows/intake.yml`) confirms that the GitHub account belongs to an author of the work,
and posts the result and a draft record in the issue. Only verified submissions are listed.

## How the site is made

```
node build.js                # writes site/ from site.json, policy.md and data/papers/*.json
node verification/check.js   # checks the records, the site and the policy
```

No dependencies. The site loads nothing from other servers and runs no scripts.
`site/` is generated; edit `site.json`, `policy.md` or `data/papers/` and run `node build.js`.

### Moderating

When a verified submission passes moderation, add the draft record from the issue as `data/papers/<id>.json`,
run `node build.js` and `node verification/check.js`, and open a pull request that closes the issue.
After it is merged, run the `pdf` workflow with the record id. It copies the PDFs onto a branch `claude/pdf-<id>`; open a pull request from it.
Ids run `2026.0001`, `2026.0002`, … in order of listing.

## Licence

Text: CC BY 4.0. Code: MIT ([LICENSE](LICENSE)). Each listed work keeps its own licence.

## Use of language models

This repository was built with Claude Code (Anthropic) at the operator's request.
The operator, Takuya Nemoto, is responsible for it. Claude is not an author.

---

## 日本語

Sophaxis（ソファクシス）は、哲学・数学・論理学・数理哲学のための、重ね合わせ型（オーバーレイ型）のプレプリントサーバーです。
著者が Zenodo・figshare・OSF Preprints・arXiv・Preprints.org・SSRN・Research Square のどれかに置いた稿を、モデレーションのうえで一覧に載せ、固定の頁を与えます。

- 受理はモデレーションであり、査読ではありません。載った稿の質は保証しません。
- 読む側からも書く側からも、費用を取りません（ダイヤモンド・オープンアクセス）。
- 言語モデルなどの生成モデルを使った稿は、使い方の開示を条件に受けます。画像や図を作るモデルも同じです。生成モデルは著者になれません。
- DOI の付与はしません。DOI は置いた先のリポジトリが付けます。
- 検索エンジンが本文を読めるように、預け先が許す場合は PDF を変えずに写して置きます。
- 投稿は DOI と ORCID iD を入れる形です。題・著者・要旨・ライセンス・版は、DOI の登録情報から取ります。
- 投稿できるのは著者本人だけです。ORCID の記録に投稿者の GitHub アカウントへのリンクがあり、その ORCID iD がその稿の著者のものであることを、自動の検査で確かめます。

運営は根本卓哉です。
