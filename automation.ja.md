# 自動で動く手順（日本語訳）

最終更新：2026-11-13。

これは英語の [What runs by itself](./automation.md) の訳です。訳と英語の文が食い違うときは、英語の文が適用されます。

Sophaxis には、ひとりでに動く手順がいくつかあります。
公開のリポジトリの GitHub Actions として動くものと、Vercel での配信として動くものです。
この頁は、そのすべてを挙げます。いつ動くか、何を読むか、何を書くか、何を運営者に残すかです。
どの手順のコードも公開しており、各節からリンクしています。

- 投稿・撤回・訂正・削除の求めについて判断する自動の手順はありません。判断はすべて運営者が下します。
- この頁の手順のうち GitHub Actions として動くものは、GitHub に頼っています。GitHub の規約は、GitHub が GitHub Actions の利用を制限することを認めています。Actions が止まることもあります。動かないあいだは、どの手順もひとりでには動きません。運営者ができしだい手で行い、どれもすぐには行われません。
- 運営者の判断の前に動く手順が一つだけあります。削除依頼の issue が個人情報の露出を報告したとき、GitHub Actions が動いている限り、記録の頁（題・著者・要旨・PDF の写し）をすぐに下げる手順です。本人を守るためのもので、依頼についての判断ではありません。依頼が認められなければ元に戻します。
- 言語モデルを使う手順はありません。どの手順も通常のコードです。
- どのアカウントにもサインインする手順はありません。鍵は、GitHub が実行ごとに渡すトークンだけで、その権限は手順に要る最小限です。IndexNow の鍵は、仕組みのうえで公開のものです。
- 記録を変える手順は、先にサイトを組み立て、すべての検査を走らせます。検査が一つでも落ちれば、何も変えません。
- これらの手順が扱う個人データは、[個人情報の取り扱いについて](./policies/privacy.ja.md)に書いてあります。

## 投稿の issue が開かれたか編集されたとき、または著者がコメントで確かめたとき

- 読むもの：DataCite、Crossref、JaLC のどれかにある DOI のメタデータ。そのメタデータが作品の前の版として挙げる DOI それぞれの登録の日。Crossref がその DOI について記録している通知。最新の版の PDF。これは預け先がスクリプトに取得を許している場合だけで、モデレーターのために形を読むだけです。読んだあとは消します。issue が開かれた日。様式に書かれた公開の ORCID の記録の、氏名・ウェブサイト・業績。deposit-check によるメタデータについての助言。
- 書くもの：それぞれの確認の結果と記録の下書きを載せたコメント。`verified` か `unverified` のラベル。
- 様式の必須のボックスすべてに印があるかを確かめます。ボックスは、リポジトリにある二つの投稿の様式から読みます。確認の群はいつも、同意の群は 2026-11-21 から、著者の住んでいる場所の群は 2026-11-22 からです。[投稿の規程](./policies/submission.ja.md#投稿者が確認すること)にも同じボックスを並べてあります。
- 2026-11-21 から、[投稿の規程](./policies/submission.ja.md)が定めるとおり、ほかの著者それぞれの同意の確認も数えます。
- 2026-11-23 から、投稿の規程が定めるとおり、作品の最初の DOI が登録されてから 6 か月がたっているかも確かめます。数えるのは、issue が開かれた日までです。
- 2026-11-23 から、Crossref がその DOI について撤回・取り下げ・削除を記録していないかも確かめます。懸念表明は運営者に回します。
- 2026-11-24 から、研究資金、利益相反、人を対象とする研究と研究倫理についての申告が書かれているかも確かめます。書かれた中身は判断しません。
- 2026-11-23 から、載っている作品の著者にまだなっていない投稿者については、作品を紹介する研究者も数えます。その研究者の公開の ORCID の記録の、氏名・ウェブサイト・業績を読みます。そうしたコメントが書かれたり、編集されたり、消されたりすると、もう一度動きます。
- 運営者に残すこと：投稿を受理するか、断るか。
- コード：[tools/intake.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/intake.js)。[intake.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/intake.yml) が動かします。

## 撤回の issue が開かれたか編集されたとき

- 読むもの：記録と、様式に書かれた公開の ORCID の記録。
- 書くもの：それぞれの確認の結果を載せたコメント。撤回のときは、撤回したあとの記録の姿も載せます。`verified` か `unverified` のラベル。
- 運営者に残すこと：プルリクエストで記録を撤回すること。または、確かめられた issue に `upheld` のラベルを付けて、記録を削除すること。
- コード：[tools/withdraw.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/withdraw.js)。

## 出版された版が報告されたとき

- 読むもの：記録、出版された版の DOI のメタデータ、様式に書かれた公開の ORCID の記録。
- 書くもの：それぞれの確認の結果と、出版された版を加えた記録を載せたコメント。
- 運営者に残すこと：出版された版を記録すること。
- コード：[tools/published.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/published.js)。

## 削除依頼の issue が開かれたか編集されたとき

- 読むもの：記録と、リポジトリの issue。
- 書くもの：受け取ったことの知らせ。運営者が答える目安の日を添えます。著者の投稿の issue での、著者への知らせ。
- issue が個人情報の露出を報告しているときは、[削除の規程](./policies/takedown.ja.md)のとおり、GitHub Actions が動いている限り、記録の頁（題・著者・要旨・PDF の写し）もすぐに下げます。GitHub Actions が動かないときは、運営者が手で下げ、すぐには下がりません。
- 運営者に残すこと：判断。
- コード：[tools/removal.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/removal.js)。[removal.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/removal.yml) が動かします。

## 運営者が求めに `upheld` か `not-upheld` のラベルを付けたとき

- リポジトリの持ち主が付けたラベルにだけ応じます。
- 認めたとき：削除の規程の「削除した記録に残るもの」のとおり、記録を削除します。その記録についての自動のコメントを消し、その記録を挙げる issue を空にして閉じ、ロックします。
- 認めなかったとき：下げたものを、git の履歴から戻します。
- 削除のあと、手で行うことを挙げる後始末の issue を開きます。空にした issue の削除、文面を添えた Internet Archive への依頼、リポジトリの履歴についての GitHub の手続きです。
- 運営者に残すこと：判断の理由。空にした issue の削除。GitHub と Internet Archive への依頼を送ること。
- メールで届いた求めも、同じように扱います。運営者が Sophaxis の id を与えて、この手順を手で動かします。判断のときは理由も与えます。理由は、著者の投稿の issue を空にする前に、そこに載ります。

## 一日に一度、日本時間の 09:17

- 読むもの：開いている削除の求めと、確かめられた撤回。
- 書くもの：運営者が答えていないものそれぞれに、催促を一つ。7 日が尽きる 2 日前から書きます。
- 削除の後始末：GitHub が消えたと答えた issue に、印を付けます。Wayback Machine が記録の頁とその PDF の写しの保存を一つも挙げなくなったら、Internet Archive への依頼に印を付けます。すべてに印が付けば、後始末の issue を閉じます。残っているものは、週に一度知らせます。

## 月に一度、1 日の日本時間 09:17

- Sophaxis が無料のサービスに収まっているかを測ります。直近 30 日でいちばん多かった日の配信の数を Vercel の無料の枠の 1 日 100 回と、PDF の写しを `site.json` の上限と、リポジトリの大きさを GitHub が勧める 1 GB と比べます。表を実行のまとめに書き、どれかが 80 パーセントに達したときだけ issue を書きます。Vercel の転送量と関数の使用は測りません。運営者の Vercel のアカウントでだけ見られます。
- 2026-11-13 までは、X の公式アカウントのための投稿文を載せた issue も書いていました。いまは書きません。GitHub の規約は、GitHub の実行環境での GitHub Actions を、ソフトウェアのプロジェクトの制作・検査・配備・公開のためにだけ認めており、投稿文はそのどれにも当たらないからです。X へは何も自動で投稿しません。
- コード：[tools/limits.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/limits.js)。[monthly.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/monthly.yml) が動かします。

## 年に一度、1 月 2 日の日本時間 12:23

- 読むもの：submission・withdrawal・removal のラベルが付いた公開の issue。断った投稿へのリポジトリの持ち主のコメント。記録。
- 書くもの：前の年の数を載せた issue。開かれた投稿、受理した投稿、断った投稿、まだ決めていない投稿の数です。断るときに挙げた理由、投稿から判断までの日数、求め、撤回した記録と削除した記録も数えます。
- 運営者に残すこと：数を `data/reports/` に記録すること。[年ごとの判断](https://sophaxis.vercel.app/decisions.html)の頁は、そこから組み立てます。
- コード：[tools/report.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/report.js) と [tools/report_issue.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/report_issue.js)。[report.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/report.yml) が動かします。

## 年に一度、10 月 30 日の日本時間 09:17

- 読むもの：運営者の手順を書いた [docs/operations.md](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/operations.md) の「Yearly audit」の節。
- 書くもの：Sophaxis が始まった日に、その一覧に印を付けるための issue。同じ題の issue があれば開きません。
- 運営者に残すこと：点検そのもの。
- コード：[tools/audit.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/audit.js)。[audit.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/audit.yml) が動かします。

## push とプルリクエストのたびに、と週に一度

- 記録・規程・組み立てたサイトに対して、[verification/check.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/verification/check.js) のすべての検査を走らせます。
- その中に、リポジトリのすべてのファイルから、鍵・トークンと、検査が認めた少数のほかのメールアドレスを探す走査があります。
- 同じ検査は、週に一度、月曜日の日本時間 14:07 にも main に対して走ります。日付に掛かる検査と走査を、push が無いときにも走らせるためです。落ちたときは、リポジトリの Actions に出て、GitHub が運営者に知らせます。
- 運営者は、検査が通ったときだけ、変更をマージします。

## サイトが変わったとき

- Vercel は、リポジトリの `site/` にあるファイルを配信します。そのファイルは、`build.js` が記録から組み立てます。OAI-PMH の口は、同じ記録を読む Vercel 上の小さな関数です。
- 新しい頁が公開されると、IndexNow を受け付ける検索エンジンに、新しい記録の頁と PDF の写し、変わったもの、消えたものを知らせます。新しいものと変わったものは、著者が同意していれば Internet Archive に保存します。消えた頁は保存しません。
- Vercel が保つ以前の版のサイトは、公開していません。
- main への push のたびと、一日に一度、日本時間の 11:41 に、`site/` のすべてのファイルを公開中のサイトから取り、main とバイトごとに比べます。10 分間たっても違いが残れば、issue を開きます。配信が失敗したときや、無料のプランの一日の上限で断られたときです。その issue は、サイトが一致すればひとりでに閉じます。
- コード：[tools/live.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/live.js)。[live.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/live.yml) が動かします。
- `robots.txt` は、サイトのほかの部分と一緒に組み立てます。削除した記録と、著者が保存に同意していない記録を集めないよう、Internet Archive のクローラーに求めます。
- コード：[tools/indexnow.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/indexnow.js)。[indexnow.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/indexnow.yml) が動かし、削除の手順の push のあとにも動きます。

## 週に一度、月曜日の日本時間 13:37

- 読むもの：載っているすべての版の DOI のメタデータ。それぞれについて Crossref が記録している通知。出版された版のメタデータ。OpenAlex がそれぞれの作品をどう収めているか。同じ時刻に別のワークフローで、[法的な検討](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/legal-review.md)が拠る日本の法令の条文と GitHub の規約を、e-Gov の法令 API と GitHub から読みます。Vercel と Apple のプライバシーの方針も、それぞれのサイトから読みます。
- 書くもの：DOI が解決しなくなったとき、ライセンスが変わったとき、記録に無い通知を Crossref が記録したとき、新しい版が現れたとき、出版された版があるかもしれないときは、issue を書きます。法令の条文、GitHub の規約、Vercel か Apple のプライバシーの方針の最終更新日が、`verification/statutes.json` に記録した値と違うときは、プルリクエストを書きます。そこには新しい値と文を載せ、条文なら文の違いも載せます。リポジトリがワークフローにプルリクエストを開かせないときは、それを開くリンクを添えた issue にします。そのどれかを読めないときも、issue を書きます。ほかに、実行のまとめを書きます。著者が同意したすべての頁と PDF の写しを、Internet Archive に保存します。
- 運営者に残すこと：issue が報告することに応じること。記録する前に、違いを読むこと。
- コード：[tools/watch.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/watch.js) と [tools/statutes.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/statutes.js)。前者は [watch.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/watch.yml) が動かします。後者は [statutes.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/statutes.yml) が動かし、プルリクエストでは表示するだけです。

## 運営者が毎週の確認のプルリクエストに `record` のラベルを付けたとき

- リポジトリの持ち主が付けたラベルにだけ応じます。応じるのはブランチ `statutes/record` だけで、そのブランチが変えてよいのは `verification/statutes.json`、`verification/statutes-texts.json`、変更履歴だけです。
- それを main にマージし、変更履歴にプルリクエストの番号を書き入れます。マージした結果に対して、すべての検査と毎週の確認そのものを走らせ、すべて通ったときだけ push します。マージは、ワークフローを共著者として挙げます。
- 運営者に残すこと：違いを読むこと。変更が求めるなら、先に規程を変えること。
- コード：[tools/record.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/record.js)。[record.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/record.yml) が動かします。

## 運営者が動かしたときだけ

- 載っている記録の PDF を預け先から取り、専用のブランチに写します。運営者が見直すプルリクエストのためです。
- コード：[tools/fetch_pdf.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/fetch_pdf.js)。
- 法令の頁が引く法令・ライセンス・規約の文を、公式の出どころから取り寄せます。引かれた条を `verification/sources-raw.json` に書き、新しいブランチ `sources/<date>` に置きます。main には置きません。運営者は、それを読んでから、`verification/sources.json` の引用に使います。
- 法令は丸ごと残します。サービスの規約・ライセンス・手引きの頁のような、ほかの文は、所在・日付・取り寄せた文の SHA-256 と、リポジトリが引くか拠る部分だけをコミットします。取り寄せた文の全体は、その実行の成果物として 90 日のあいだ残し、リポジトリには置きません。SSRN・edX・DataCite のサイトのように、規約が機械による要求や収集を禁じている所からは、直に取り寄せません。そうした所の頁は、Internet Archive の写しから読みます。
- コード：[tools/sources.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/sources.js)。[sources.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/sources.yml) が動かします。

## 手で行うこと

- すべての判断と、その理由。
- 空にした issue の削除。後始末の issue がそれを挙げます。
- リポジトリの履歴から素材を除くよう GitHub に頼むこと。以前の写しを除外するよう Internet Archive に頼むこと。文面は後始末の issue にあります。
- 変わった法令や規約の文を、`record` のラベルで記録すること。
- 索引や登録簿に Sophaxis を登録すること。
- メールに答えること。
