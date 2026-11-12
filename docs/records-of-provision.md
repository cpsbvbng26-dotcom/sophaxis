# Records of provision to third parties

Last updated: 2026-11-12.

This file is the record that Article 29 of Japan's Act on the Protection of Personal Information asks Sophaxis to keep when it provides personal data to a third party, together with the issues and the history of the public repository that it points to. It also names each service that gives Sophaxis personal data, for Article 30 of Japan's Act on the Protection of Personal Information.
Claude decided on 2026-11-12 (2026-11-12 に Claude が決めました) to keep it in this form, because the issues and the history already hold the date, the people and the items of each provision, and what they lacked were the recipients' names and addresses and the period of keeping.

Every name and address below is taken from the recipient's own page, fetched by `tools/sources.js` on 2026-11-12 and kept in `verification/sources-raw.json` under `pages`. The column "Page" gives the key. Nothing here is written from memory: where a page could not be fetched, or gives no address, the row says so.

## What the law asks

Article 29(1) of Japan's Act on the Protection of Personal Information asks for a record of each provision of personal data to a third party, except a provision under one of the items of Article 27(1) or Article 27(5); for a provision under Article 28(1), only the items of Article 27(1) are excepted.
Article 19 of the APPI Enforcement Rules lets the record be a document or an electronic record, made each time, or made once for a third party to which personal data is provided continuously or repeatedly.
For a provision made with the person's consent, Article 20(1)(ii) of the APPI Enforcement Rules lists the items: that the consent was obtained, the recipient's name and address and, for a corporation, its representative's name (or, for a provision to many unspecified people, that fact), what identifies the person, and the items of the personal data.
Article 21 of the APPI Enforcement Rules sets how long a record is kept: three years, or, for a record made once for continuous provision, three years from the last provision.

The Commission's guidelines on the duties to confirm and to record (第三者提供時の確認・記録義務編), fetched on 2026-11-12, read some provisions as outside these duties. They are quoted here in Japanese, as fetched:

- A person's own posting on a service: 「事業者が運営する SNS 等に本人が入力した内容が、自動的に個人データとして不特定多数の第三者が取得できる状態に置かれている場合は、実質的に「本人による提供」をしているものである。」
- Public information: 「不特定多数の者が取得できる公開情報は、本来であれば受領者も自ら取得できる情報であり、それをあえて提供者から受領者に提供する行為は、受領者による取得行為を提供者が代行しているものであることから、実質的に確認・記録義務を課すべき第三者提供には該当せず、同義務は適用されない。」
- But a first publication is recorded: 「なお、当初に、個人データを公開に供する行為については、提供者として記録を作成しなければならない（規則第 20 条第 1 項第 1 号ロ括弧書き）。」
- Reading is not receiving: 「単に閲覧する行為については、「提供を受ける」行為があるとは言えず、法第 30 条の義務は適用されない。」
- Consent shown by the system: 「個人情報取扱事業者のシステムの設定により、本人の同意を得た場合のみ第三者提供が実施されることとなっている場合には、それをもって同意の存在を示す証跡があるものとすることができる。」
- Many unspecified people: 「個人データをインターネット上に公開し、不特定多数の者が閲覧できる状態に置いている場合」

## The provisions Sophaxis makes

| Provision | Recipient | Personal data | Basis | Record | Where the record is |
| --- | --- | --- | --- | --- | --- |
| A person opens or comments on a submission, withdrawal, published-version, correction or removal issue | GitHub, and through it many unspecified people | What the person writes, and their GitHub username | The person's own act | Not required: a provision by the person (本人による提供) | The issue itself |
| Listing a work: the record pages, author pages, lists, search, `feed.xml`, `papers.json`, the OAI-PMH interface, and the record files in the repository | Many unspecified people, through GitHub and Vercel | The record: the authors' names and ORCID iDs, the abstract, the statement on generative models, notes | Every author's consent to the provision to third parties in a foreign country (Article 28(1) of Japan's Act on the Protection of Personal Information) | Not required for what was public before the listing (the deposit's metadata and the issue); kept all the same | `data/papers/<id>.json` and its history (the date and what was provided, the people named); the submission issue and the automatic check, which lists a work only after every consent is given (the consent); this file (the recipients) |
| Saving the pages and the PDF copies to the Internet Archive | The Internet Archive | The public pages and PDF copies | A separate consent of every author | Not required: public information | The consent box in the submission issue |
| Help with the review of a submission | Anthropic, OpenAI and xAI | The public parts of the submission: the issue, the DOI metadata and the abstract | Every author's consent (Article 28(1) of Japan's Act on the Protection of Personal Information) | Not required: public information | The submission issue |
| Reading a public ORCID record by the ORCID iD given in the form | ORCID | The ORCID iD, which is public | Every author's consent (Article 28(1) of Japan's Act on the Protection of Personal Information) | Not required: public information | The issue |
| An email to the operator | iTunes K.K., entrusted with the mailbox | What the email contains | Entrustment (Article 27(5)(i) of Japan's Act on the Protection of Personal Information) | Not required: Article 29(1) of Japan's Act on the Protection of Personal Information excepts it | None needed |
| A first publication by Sophaxis of personal data that was not public before | Many unspecified people, through GitHub | What is published | The person's consent | Required | A row under "Records" below |

## Recipients

| Recipient | Name | Address | Representative | Country | Page | Record |
| --- | --- | --- | --- | --- | --- | --- |
| GitHub | GitHub, Inc. | 88 Colin P. Kelly Jr. St. San Francisco, CA 94107 | Not given on the page fetched | United States | github-privacy | Kept for listings, as above |
| Vercel | Vercel Inc. | 440 N Barranca Avenue #4133 Covina, CA 91723 | Not given on the page fetched | United States | vercel-privacy | Kept for listings, as above |
| ORCID | ORCID Inc. | 10411 Motor City Drive, Suite 750, Bethesda MD 20817 | Not given on the page fetched | United States | orcid-privacy | Not required: public information |
| Internet Archive | Not fetched | Not fetched: its terms and contact pages answered only "Javascript is required for this site." | Not fetched | United States | ia-terms | Not required: public information |
| Anthropic | Anthropic PBC | 548 Market St, PMB 90375, San Francisco, CA 94104 | Not given on the page fetched | United States | anthropic-privacy | Not required: public information |
| OpenAI | Not fetched | Not fetched: its privacy policy answered 403 | Not fetched | United States | openai-privacy | Not required: public information |
| xAI | SpaceX Super Intelligence LLC | Not given on the page fetched: its privacy policy gives a web form for requests in the United States, not an address | Not given on the page fetched | United States | xai-privacy | Not required: public information |
| Apple (the mailbox) | iTunes K.K. | Roppongi Hills, 6-10-1 Roppongi, Minato-ku, Tokyo 106-6140 | Not given on the page fetched | Japan | icloud-terms | Not required: entrustment |
| Apple (may handle the mailbox for iTunes K.K.) | Apple Inc. | One Apple Park Way, Cupertino, California | Not given on the page fetched | United States | apple-affiliated | Not required: Sophaxis provides nothing to it; iTunes K.K. has it handle the mail |
| OpenAlex | Not fetched | Not fetched: no page of it was fetched | Not fetched | United States | none | Not required: it is asked about a work by its DOI only, never about a person |

## Services that give Sophaxis personal data

Sophaxis reads authors' names from these services when it checks a submission. What it reads is public, and it reads it as anyone can, so the Commission's guidelines quoted above put it outside Article 30 of Japan's Act on the Protection of Personal Information. They are named here all the same.

| Service | Name | Address | Representative | Country | Page | Record |
| --- | --- | --- | --- | --- | --- | --- |
| DataCite | DataCite – International Data Citation Initiative e.V. | Welfengarten 1 B, 30167 Hannover | Matthew Buys, Executive Director | Germany | datacite-imprint | Not required: public information |
| Crossref | Crossref | Not given on the page fetched: its privacy page says only that Crossref is registered in the United States | Not given on the page fetched | United States | crossref-privacy | Not required: public information |
| Japan Link Center | Japan Link Center (JaLC) | Not given on the page fetched: JaLC is run jointly by JST, NIMS, NII and NDL | Not given on the page fetched | Japan | jalc-about | Not required: public information |
| ORCID | ORCID Inc. | 10411 Motor City Drive, Suite 750, Bethesda MD 20817 | Not given on the page fetched | United States | orcid-privacy | Not required: public information |

## Records

A row is added here for each provision that needs a record: the day, the person (by an identifier that is public already, an ORCID iD or a GitHub username), the items of the personal data, where the consent is, and the recipient.

| Day | Person | Items | Consent | Recipient |
| --- | --- | --- | --- | --- |

No such provision has been made so far.

## How a new record is added

When Sophaxis first publishes personal data that was not public before, the pull request that publishes it also adds a row under "Records", in the same change.
When Sophaxis begins to give personal data to a service that is not listed under "Recipients", a row is added, with the name and the address taken from the service's own page; the page is added to `tools/sources.js` and fetched before the row is written.
`verification/check.js` fails when a service that the Privacy Policy names under "Services outside Japan" has no row, when a name or an address in a row is not on the page it names, and when a row under "Records" leaves an item empty.

## How long records are kept

The rows of this file, the record files and their history, and the issues are kept without a time limit, which is longer than the three years that Article 21 of the APPI Enforcement Rules asks.
A row under "Records" is not removed within three years of its day, even when the record it concerns is removed under the Takedown Policy, because the law asks that it be kept; it holds only the day, an identifier that was public already, the items, the consent and the recipient.

## What this file does not settle

The APPI Enforcement Rules ask for a corporation's representative. No representative is given on the pages fetched, except DataCite's; the only provisions that need a record are those to many unspecified people, for which the Rules ask only that fact.
The addresses of the Internet Archive, OpenAI, xAI, Crossref and the Japan Link Center could not be taken from their own pages. Each of these receives or gives only public information, so no record that the law asks is missing an address. They are not written from memory.
