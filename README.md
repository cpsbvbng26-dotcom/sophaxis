# Sophaxis

**Preprints in Philosophy and Mathematics**

Sophaxis is an overlay preprint server for philosophy, mathematics, logic and the philosophy of mathematics.
Authors deposit their preprint in Zenodo, figshare or OSF Preprints; Sophaxis moderates the submission and gives it a stable record page.

- **Acceptance is moderation, not peer review.**
- **Diamond open access.** Sophaxis charges nothing, to authors or to readers.
- **Language models and other generative models are allowed when disclosed.** No generative model can be an author.
- Sophaxis hosts no files and assigns no DOIs. The DOI comes from the repository.

Site: https://sophaxis.vercel.app/ (the domain `sophaxis.org` is planned).
Read the [policy](policy.md) before submitting.

## Submitting

Open a [submission issue](../../issues/new?template=submission.yml). The issue is public.

## How the site is made

```
node build.js                # writes site/ from site.json, policy.md and data/papers/*.json
node verification/check.js   # checks the records, the site and the policy
```

No dependencies. The site loads nothing from other servers and runs no scripts.
`site/` is generated; edit `site.json`, `policy.md` or `data/papers/` and run `node build.js`.

### Moderating

When a submission passes moderation, add `data/papers/<id>.json` (see `verification/fixtures/papers/` for the shape),
run `node build.js` and `node verification/check.js`, and open a pull request that closes the issue.
Ids run `2026.0001`, `2026.0002`, … in order of listing.

## Licence

Text: CC BY 4.0. Code: MIT ([LICENSE](LICENSE)). Each listed work keeps its own licence.

## Use of language models

This repository was built with Claude Code (Anthropic) at the operator's request.
The operator, Takuya Nemoto, is responsible for it. Claude is not an author.

---

## 日本語

Sophaxis（ソファクシス）は、哲学・数学・論理学・数理哲学のための、重ね合わせ型（オーバーレイ型）のプレプリントサーバーです。
著者が Zenodo・figshare・OSF Preprints のどれかに置いた稿を、モデレーションのうえで一覧に載せ、固定の頁を与えます。

- 受理はモデレーションであり、査読ではありません。
- 読む側からも書く側からも、費用を取りません（ダイヤモンド・オープンアクセス）。
- 言語モデルなどの生成モデルを使った稿は、使い方の開示を条件に受けます。画像や図を作るモデルも同じです。生成モデルは著者になれません。
- ファイルの保管と DOI の付与はしません。DOI は置いた先のリポジトリが付けます。

運営は根本卓哉です。
