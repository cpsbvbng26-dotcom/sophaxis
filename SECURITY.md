# 安全の問題の知らせ方 / Reporting a security issue

## 日本語

このリポジトリにあるのは、Sophaxis のサイトを作るコードと記録、静的な頁、Vercel の上で動く OAI-PMH の小さな関数、それに投稿・撤回・削除の issue を読む GitHub Actions のワークフローです。
サイトは cookie を置かず、アクセス解析も動かしません。スクリプトを動かすのは検索の頁だけです。

安全の問題は、公開の issue ではなく、メールで受けます。知られる前に直せるようにするためです。
宛先は、運営者の [ORCID の記録](https://orcid.org/0009-0000-1406-0547)にあるアドレスです。[運営者と連絡先](https://sophaxis.vercel.app/contact.ja.html)の頁と、[security.txt](https://sophaxis.vercel.app/.well-known/security.txt) が同じ窓口を示しています。
見つけたことと、それを再現する手順があれば、直すのが早くなります。

秘密の鍵や個人の連絡先が載っているのを見つけたときも、同じ窓口で受けます。
個人データが露出しているときは、[削除の規程](policies/takedown.ja.md)のとおり、判断の前に記録の頁をただちに外します。

答えは 7 日以内を目指します。
報奨金はありません。
直したものは、差し支えのない範囲で、[CHANGELOG.md](CHANGELOG.md) に残します。

## English

This repository holds the code and the records that build the Sophaxis site, the static pages, a small OAI-PMH function that runs on Vercel, and the GitHub Actions workflows that read submission, withdrawal and removal issues.
The site sets no cookie and runs no analytics. Only the search page runs a script.

Security issues are received by email, not in a public issue, so that they can be fixed before they are known.
The address is the one on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547). The [Operator and contact](https://sophaxis.vercel.app/contact.html) page and [security.txt](https://sophaxis.vercel.app/.well-known/security.txt) give the same contact.
What was found, and how to reproduce it, makes the fix quicker.

An exposed secret key or personal contact detail is reported the same way.
Exposed personal data is taken offline at once, before anything is decided, as the [Takedown Policy](policies/takedown.md) says.

The aim is to answer within 7 days.
There is no bounty.
A fix is recorded in [CHANGELOG.md](CHANGELOG.md), as far as it is safe to say.
