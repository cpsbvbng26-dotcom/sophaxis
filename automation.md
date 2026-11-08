# What runs by itself

Last updated: 2026-11-08.

Sophaxis runs a number of steps by itself, as GitHub Actions in its public repository and as deployments on Vercel.
This page lists every one of them: when it runs, what it reads, what it writes, and what it leaves to the operator.
The code of each step is public, and each section links to it.

- No automatic step decides on a submission, a withdrawal, a correction or a removal request. The operator decides every one.
- One step acts before the operator decides: when a removal issue reports exposure of personal data, the record page (its title, authors, abstract and PDF copy) is taken offline at once. This protects the person concerned, is not a decision on the request, and is undone if the request is not upheld.
- No step uses a language model. The steps are ordinary code.
- No step signs in to any account. The only key is the token that GitHub gives each run, with the least permissions the step needs; the IndexNow key is public by design.
- A step that changes the records builds the site and runs every check first, and changes nothing if a check fails.
- The [Privacy Policy](./policies/privacy.html) says what personal data these steps handle.

## When a submission issue is opened or edited, or an author confirms in a comment

- Reads: the DOI metadata from DataCite, Crossref or JaLC; the name, the websites and the works of the public ORCID record given in the form; advice on the metadata from deposit-check.
- Writes: a comment with the result of each check and a draft record, and the label `verified` or `unverified`.
- From 2026-11-21, it also counts each other author's confirmation, as the [Submission Policy](./policies/submission.html) sets out.
- Leaves to the operator: accepting or declining the submission.
- Code: [tools/intake.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/intake.js), run by [intake.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/intake.yml).

## When a withdrawal issue is opened or edited

- Reads: the record, and the public ORCID record given in the form.
- Writes: a comment with the result of each check and, for a withdrawal, the record as it would be after it; the label `verified` or `unverified`.
- Leaves to the operator: withdrawing the record by a pull request, or removing it by labelling the verified issue `upheld`.
- Code: [tools/withdraw.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/withdraw.js).

## When a published version is reported

- Reads: the record, the DOI metadata of the published version, and the public ORCID record given in the form.
- Writes: a comment with the result of each check and the record with its published version.
- Leaves to the operator: recording the published version.
- Code: [tools/published.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/published.js).

## When a removal issue is opened or edited

- Reads: the record and the issues of the repository.
- Writes: an acknowledgement with the day by which the operator aims to answer, and a notice to the authors in their submission issue.
- When the issue reports exposure of personal data, it also takes the record page (its title, authors, abstract and PDF copy) offline at once, as the [Takedown Policy](./policies/takedown.html) says.
- Leaves to the operator: the decision.
- Code: [tools/removal.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/removal.js), run by [removal.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/removal.yml).

## When the operator labels a request `upheld` or `not-upheld`

- Acts only on the label of the repository owner.
- Upheld: removes the record, as "What a removed record leaves" in the Takedown Policy sets out, deletes the automatic comments about it, and empties, closes and locks the issues that name it.
- Not upheld: puts back what was taken offline, from the git history.
- After a removal, opens a follow-up issue that lists what is left by hand: deleting the emptied issues, a request to the Internet Archive with its draft, and GitHub's procedure for the repository history.
- Leaves to the operator: the grounds of the decision, deleting the emptied issues, and sending the requests to GitHub and the Internet Archive.
- A request sent by email is handled the same way: the operator runs the step by hand with the Sophaxis id and, for a decision, the grounds, which are posted in the authors' submission issue before it is emptied.

## Once a day, at 09:17 Japan time

- Reads: the open removal requests and the verified withdrawals.
- Writes: one reminder in each that the operator has not answered, from two days before the 7 days run out.
- Follow-ups of removals: ticks the deleted issues once GitHub answers that they are gone, and the request to the Internet Archive once the Wayback Machine lists no capture of the record page or its PDF copies. Closes the follow-up when everything is ticked, and reminds once a week of what is not.

## On every push and every pull request

- Runs every check of [verification/check.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/verification/check.js) against the records, the policies and the built site.
- The operator merges a change only when the checks pass.

## When the site changes

- Vercel serves the files that the repository holds in `site/`, which `build.js` builds from the records. The OAI-PMH interface is a small function on Vercel that reads the same records.
- Once the new pages are live, the search engines that take IndexNow are told which record pages and PDF copies are new, changed or gone, and the new and changed ones are saved to the Internet Archive, if their authors consented to it. A gone page is never saved.
- Earlier versions of the site that Vercel keeps are not open to the public.
- After every push to main, and once a day at 11:41 Japan time, every file in `site/` is fetched from the live site and compared byte for byte with main. A difference that remains after ten minutes (a deployment that failed, or that the daily limit of the free plan refused) opens an issue, which closes by itself when the site matches.
- Code: [tools/live.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/live.js), run by [live.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/live.yml).
- `robots.txt` is built with the rest of the site, and asks the Internet Archive's crawlers not to collect any removed record, or any record whose authors did not consent to the saves.
- Code: [tools/indexnow.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/indexnow.js), run by [indexnow.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/indexnow.yml) and after each push of the removal step.

## Once a week, on Monday at 13:37 Japan time

- Reads: the DOI metadata of every listed version, the metadata of published versions, and how OpenAlex holds each work. In a workflow of its own at the same time, the articles of Japanese law and the GitHub terms that the [legal review](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/legal-review.md) relies on, from the e-Gov law API and GitHub, and the privacy statements of Vercel and Apple, from their sites.
- Writes: an issue when a DOI stops resolving, a licence changes, a new version appears or a published version may exist; a pull request when an article of law, a GitHub term, or the date of the last update of Vercel's or Apple's privacy statement differs from the value recorded in `verification/statutes.json`, with the new values and texts and, for an article, the difference of its sentences; an issue when one of them cannot be read; a summary of the run; a save to the Internet Archive of every page and PDF copy whose authors consented to it.
- Leaves to the operator: acting on what the issue reports, and reading the difference before recording it.
- Code: [tools/watch.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/watch.js), and [tools/statutes.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/statutes.js), run by [statutes.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/statutes.yml), which on a pull request only prints.

## When the operator labels the watch's pull request `record`

- Acts only on the label of the repository owner, and only on the branch `statutes/record`, which may change only `verification/statutes.json`, `verification/statutes-texts.json` and the changelog.
- Merges it into main, fills in the changelog's pull request number, runs every check and the watch itself on the merged result, and pushes only if all pass. The merge names the workflow as co-author.
- Leaves to the operator: reading the difference, and changing the policies first if the change requires it.
- Code: [tools/record.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/record.js), run by [record.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/record.yml).

## Only when the operator runs it

- Copies the PDF of a listed record from its repository onto a branch of its own, for a pull request that the operator reviews.
- Code: [tools/fetch_pdf.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/fetch_pdf.js).

## What stays by hand

- Every decision, and its grounds.
- Deleting emptied issues, which the follow-up issue lists.
- Asking GitHub to remove material from the repository history, and the Internet Archive to exclude earlier copies, with the drafts in the follow-up issue.
- Recording a changed text of law or terms, by the label `record`.
- Registering Sophaxis with indexes and registries.
- Answering email.
