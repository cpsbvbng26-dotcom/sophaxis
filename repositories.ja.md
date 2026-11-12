# 預け先と DOI 登録機関へ（日本語訳）

最終更新：2026-11-12。

これは英語の [For repositories and DOI registration agencies](./repositories.md) の訳です。訳と英語の文が食い違うときは、英語の文が適用されます。

この頁は、Sophaxis が載せている作品の預け先と、その DOI を登録する機関に宛てたものです。
Sophaxis がそれぞれのサービスから何を読むか、どのくらいの頻度で読むか、読んだものをどう使うかを書きます。

## 載せている預け先

{{repositories}}

作品を載せるのは、その著者が投稿したときだけです。DOI のメタデータに CC BY 4.0、CC BY-SA 4.0、CC0 1.0 のどれかが記されていることも要ります。
Sophaxis は、どの預け先からも収集やミラーをしません。

## Sophaxis が読むもの

- 投稿された作品の DOI のメタデータ。DataCite と Crossref の公開の REST API から読み、Jxiv の作品は JaLC から読みます。作品が投稿されたときと、その issue が編集されたときに一度読みます。載っている DOI はそれぞれ週に一度読み、まだ解決し、ライセンスを保っていることを確かめます。
- 作品の版の一覧。同じメタデータから読みます。
- 版の PDF。手を加えずに取ります。取るのは、作品のライセンスが許し、預け先が自らの頁でスクリプトによる取得を認めている場合だけです（Zenodo と arXiv）。Zenodo の REST API と、arXiv の export.arxiv.org を通します。2026-11-12 までは、Figshare と Research Square からも取っていました。2026-11-13 からは取りません。どちらの規約もロボットとスクリプトを禁じており、[著作権の規程](./policies/copyright.ja.md)がその文を引いています。写しは版ごとに一度、運営者が手で始めたときに取ります。投稿の issue が開かれたときと編集されたときにも、確認の手順が最新の版の PDF を取ります。モデレーターのために形を読むためだけで、読んだあとは消します。預け先がチェックサムを公開している場合、写しはそれと一致しなければなりません。

Sophaxis 自身のコードが出す要求は、どれも User-Agent に Sophaxis とそのリポジトリを書きます。`Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)` です。投稿の確認の助言の段階は [deposit-check](https://github.com/cpsbvbng26-dotcom/deposit-check) を走らせ、deposit-check は自分の名を書きます。`deposit-check (https://github.com/cpsbvbng26-dotcom/deposit-check)` です。
Sophaxis は、人が読むための頁を読みません。どんな上限も遮断も、すり抜けません。

## Sophaxis が示すもの

それぞれの記録の頁は、DOI へリンクし、預け先の名を挙げます。読者には、その DOI を引用するよう求めます。
引用の先は DOI のままです。Sophaxis は、自分の DOI を与えません。
要旨と PDF の写しは、[著作権の規程](./policies/copyright.ja.md)が定めるとおり、作品自身のライセンスのもとで、著者とともに示します。

## 何かを変えるべきとき

Sophaxis の読む頻度が許す範囲を超えているとき、規約が許さないものを読んでいるとき、サービスからファイルを写すのをやめるべきときは、運営者に知らせてください。
Sophaxis は、それを変えるか、やめます。
預けたものそのものについての求めは、預け先が扱います。Sophaxis は、預けたものを変えることも削除することもできません。

運営者には、[issue](https://github.com/cpsbvbng26-dotcom/sophaxis/issues) か、運営者の [ORCID の記録](https://orcid.org/0009-0000-1406-0547)にあるアドレスへのメールで連絡できます。

## 預け先と登録機関に対する免責

Sophaxis は独立しています。どの預け先とも、どの登録機関とも、組織のうえのつながりはなく、後ろ盾も受けておらず、協力関係にもありません。
Sophaxis は、載せている作品の Zenodo の記録のために、Zenodo にコミュニティ（<https://zenodo.org/communities/sophaxis>）を置いています。
コミュニティは、Zenodo の利用者ならだれでも開けます。これによって Sophaxis が Zenodo の一部になるわけではありません。
Sophaxis の記録は、預けたものについての Sophaxis 自身の説明です。預け先や登録機関が述べたものではありません。
それらは、Sophaxis にも、その記録にも、そのモデレーションにも、それらのメタデータを示すときに Sophaxis が持ち込んだ誤りにも、責任を負いません。
それらの名は、それぞれのサービスを示すためだけに使っています。商標はそれぞれの持ち主に属し、Sophaxis はどのロゴも示しません。
Sophaxis は、それぞれのサービスを公開の口を通して使い、公表された規約の範囲で使います。規約の範囲は、Sophaxis が理解しているとおりです。サービスが違うことを述べるときは、Sophaxis はサービスに従います。
[免責事項](./disclaimer.ja.md)も見てください。

## 謝辞

Sophaxis があるのは、これらのサービスが研究とそのメタデータを開かれた形で示しているからです。Sophaxis は、次のサービスに感謝します。

{{acknowledgements}}

Thank you to arXiv for use of its open access interoperability.
arXiv のオープンアクセスの相互運用性を使えることに、arXiv に感謝します。
