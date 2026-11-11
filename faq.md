# Frequently asked questions

Last updated: 2026-11-11.

Japanese: [よくある質問（日本語訳）](./faq.ja.md). It is a translation; where the two differ, the English text applies.

Each answer is a short form of a policy. Where they differ, the policy applies.

A question is added here only when someone has actually asked it, in an issue or by email.
Its answer then begins with a line that says when and where it was asked, such as "Asked on 2026-12-01, in issue #300." or "Asked on 2026-12-01, by email.", without the name of the person who asked.
The questions without such a line were already here on 2026-11-11, when this rule began; they were written from the policies.

## What is Sophaxis?

An overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
The work itself is published by its repository; Sophaxis keeps an unmodified PDF copy only where the licence allows.
It lists preprints that authors have already deposited in an open repository, and gives each one a stable record page.

## Is it peer review?

No. Acceptance is moderation, not peer review.
Moderation checks the submitter, the licence, the scope, the form of the paper and the statement on generative models.
It does not check proofs, arguments or data, and Sophaxis does not guarantee the quality of any listed work.
See the [Moderation Policy](./policies/moderation.md).

## Does it cost anything?

No. Sophaxis charges nothing, to authors or to readers, and will not start charging.

## Does Sophaxis give my work a DOI?

No. The DOI comes from the repository where you deposited the work, and it is the reference to cite.
Sophaxis gives each record an id, such as 2026.0001, which never changes and is never reused.

## Which repositories are accepted?

Zenodo, Figshare, OSF Preprints, SocArXiv, MetaArXiv, arXiv, Preprints.org, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works and Jxiv.
The work must have a DOI from one of them.

## Which licences are accepted?

CC BY 4.0, CC BY-SA 4.0 and CC0 1.0, as given in the DOI metadata.
Licences with NonCommercial or NoDerivatives terms are not accepted, and neither is the arXiv non-exclusive licence.
See the [Licence Policy](./policies/licences.md).

## Who can submit?

Only an author of the work, with an ORCID iD.
Your ORCID record must link to your GitHub account, and an automatic check confirms that your ORCID iD belongs to an author of the work.
Every author must agree to the listing.
See the [Submission Policy](./policies/submission.md).

## Why GitHub?

Submissions are GitHub issues.
This keeps every step public and lets the automatic check confirm that the account opening the issue belongs to an author.
Sophaxis has no accounts of its own and no passwords.

## Is Sophaxis connected to GitHub and ORCID?

Yes, in public only.
The code, the records and the submissions are on GitHub, and the automatic checks run as GitHub Actions in the public repository.
ORCID is read through its public API.
Sophaxis does not use GitHub or ORCID sign-in, asks no one for access to their accounts, and is not affiliated with either; see the [Disclaimer](./disclaimer.md).

## Was Sophaxis made with a language model?

Yes. The site, its code and its policies were written with Claude Code (Anthropic) at the operator's request.
The operator is responsible for them, and Claude is not an author.
No language model decides on a submission.
See the [Disclaimer](./disclaimer.md).

## Can I use language models?

Yes, if you disclose how.
Name the tools and say what they were used for; this covers every generative model, including those that make images or code.
A generative model cannot be an author.
The statement is shown on the record page.

## How long does moderation take?

As a guide, a decision can come on the day of submission, but it can also take several weeks or a few months.
A slow decision does not mean that submissions are paused; when they are, the top page says so.
[From submission to listing](./process.md) follows a submission step by step.

## Who is responsible for a listed work?

The authors bear full responsibility for the work and its listing: its content, the rights to share it, material from others, personal data in it and the statement on generative models.
See the [Terms of Use](./policies/terms.md).

## How do I add a new version?

Deposit it in the repository, then submit it as an update and give the existing Sophaxis id.
Earlier versions stay listed.

## My work has been published in a journal. Can I submit it?

Only a version that you may share under an accepted licence.
Give the DOI of the published version in the form, and the record shows it.

## My listed preprint has been published. What do I do?

Report it with the [published-version form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=published.yml), as one of its authors.
The preprint stays listed, and its record page shows the published version at the top and asks readers to cite it.
Sophaxis does not judge peer review: the record repeats what you state about it.
The details are in the [Submission Policy](./policies/submission.md), under "When the work is published".

## Does Sophaxis keep a copy of the PDF?

Where the repository allows a script to fetch it, Sophaxis keeps an unmodified copy, so that search engines can index the full text.
For any other repository, you can attach the deposited PDF to your submission issue.
A copy is kept only if the file is at most 20 MB.
See the [Copyright Policy](./policies/copyright.md).

## Will my work appear in Google Scholar?

Each record page carries the tags that Google Scholar reads, and the sitemap lists every page.
Scholar takes a PDF only from the directory of its record page, so each PDF copy is also served there.
When a record page or a PDF copy is new, changed or removed, the search engines that take IndexNow, such as Bing, are told as soon as it is live. A new or changed page is also saved to the Internet Archive, where every author of the work consents to it. Google reads the sitemap instead.
Sophaxis cannot promise that a search engine will index a page.

## What should I check before submitting?

The [checklist](./checklist.md) gathers what the policies ask, with examples of a statement on generative models.
It also offers two paper templates, in Markdown and in LaTeX, under CC0 1.0. Using them is not required.

## Does Sophaxis track readers?

No. The site sets no cookies, runs no analytics and loads nothing from other servers, as the [Privacy Policy](./policies/privacy.md) says.
It shows no counts of views or downloads.

## Is there a mailing list?

No. Sophaxis sends no newsletter and collects no email addresses for one.
New records and news can be followed through the Atom feeds: [new preprints](https://sophaxis.vercel.app/feed.xml), [news](https://sophaxis.vercel.app/news.xml), and one feed for each field.

## How do I cite a work listed here?

Cite the DOI of the version you read.
Each record page gives the citation in APA, Chicago and BibTeX, and as BibTeX, RIS and CSL-JSON files.

## How do I report an error in a record?

Use the link "Report an error in this record" on its page.
Corrections are added to the record as dated notes.

## Can I withdraw my work?

Yes. Any one author can withdraw a listed work.
The record page stays with a withdrawal notice, so that citations do not break, and the PDF copies are taken off the site.
See the [Withdrawal Policy](./policies/withdrawal.md).

## How do I ask for material to be removed?

For copyright infringement, exposure of personal data or another legal reason, follow the [Takedown Policy](./policies/takedown.md).

## What happens to the records if Sophaxis closes?

The repository with every record stays public, so that the records stay readable.
Each week, Sophaxis also asks the Internet Archive to save its pages and the PDF copies, where every author of the work consents to it.

## Who runs Sophaxis, and how do I reach the operator?

See the [Operator and contact](./contact.md) page.
