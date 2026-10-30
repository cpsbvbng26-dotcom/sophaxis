# sophaxis

Sophaxis の場そのもの。哲学と数理のオーバーレイ型プレプリントサーバー。配信は Vercel（`site/` を根にする）。

## 決めごと

1. `site/` は生成物。`site.json`・`policy.md`・`data/papers/*.json` を直して `node build.js`。手で直さない。
2. 掲載を決めるのは運営者（根本卓哉）。受理された Issue の中身から `data/papers/<id>.json` を作り、PR で入れる。勝手に受理しない。
3. 規約の約束（査読ではない、費用を取らない、言語モデルは開示で受ける・著者にしない、記録を消さない）を弱めない。`verification/check.js` が文で固めている。
4. DOI を推測で埋めない。投稿者が書いた DOI だけを使う。
5. 外部へリクエストを出さない。スクリプトを置かない。CSP は `default-src 'none'`。
6. 投稿の Issue は公開される。個人情報を記録に写さない。
7. 投稿は `tools/intake.js` が受ける（`.github/workflows/intake.yml`）。DOI の登録情報（DataCite・Crossref）と、
   ORCID の公開記録のうち名前・リンク・業績だけを読む。ORCID の記録をそのまま記録・ログ・コメントに写さない
   （メールアドレスや所在の国が入っている）。本人確認が通らない投稿は載せない。
   issue の本文は環境変数でだけ渡し、シェルに展開しない。
8. PDF の写しは `tools/fetch_pdf.js` が預け先から取る（`.github/workflows/pdf.yml`、手で起動）。`data/pdf/` に置き、
   記録の `pdfs` に sha256 と取得元を書く。写しは変えない。手で PDF を足さない。預け先が許さない場合は写さない。
9. `assets/favicon.svg` と `assets/og.png` は手で置いたもので、生成物ではない。`build.js` がそのまま `site/` へ写す。
   ロゴは文字のフォントを使わず、長方形だけで組んである。`og.png` はロゴを角を丸めずに 600 × 600 の PNG にしたもの。
   ロゴを変えたら、こちらも描き直す。

```
node build.js
node verification/check.js
```
