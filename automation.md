# What runs by itself

Last updated: 2026-11-14.

Japanese: [自動で動く手順（日本語訳）](./automation.ja.md). It is a translation; where the two differ, the English text applies.

Sophaxis runs a number of steps by itself, as GitHub Actions in its public repository and as deployments on Vercel.
This page lists every one of them: when it runs, what it reads, what it writes, and what it leaves to the operator.
The code of each step is public, and each section links to it.

- No automatic step accepts a submission or a correction, and none decides on a withdrawal or a removal request. The operator decides every one; from 2026-12-01, the checked intake only turns away a submission or a report of an error whose claim fails its check, as the [Submission Policy](./policies/submission.md#the-checked-intake) sets out.
- Every step on this page that runs as GitHub Actions depends on GitHub. GitHub's terms let it restrict the use of GitHub Actions, and Actions can stop. While they do not run, no such step runs by itself: the operator takes the steps by hand, as soon as the operator can, and none of them happens at once.
- One step acts before the operator decides: when a removal issue reports exposure of personal data, the record page (its title, authors, abstract and PDF copy) is taken offline at once, while GitHub Actions runs. This protects the person concerned, is not a decision on the request, and is undone if the request is not upheld.
- No step uses a language model. The steps are ordinary code.
- No step signs in to any account. The only key is the token that GitHub gives each run, with the least permissions the step needs; the IndexNow key is public by design.
- A step that changes the records builds the site and runs every check first, and changes nothing if a check fails.
- The [Privacy Policy](./policies/privacy.md) says what personal data these steps handle.

## When a submission issue is opened or edited, or an author confirms in a comment

- Reads: the DOI metadata from DataCite, Crossref or JaLC; the day each DOI that the metadata names as an earlier version of the work was registered; the notices that Crossref records against the DOI; the PDF of the latest version, where the repository lets a script fetch it, only to read its shape and the advice for the moderator, deleted after the reading; the day the issue was opened; the name, the websites and the works of the public ORCID record given in the form; advice on the metadata from deposit-check.
- Writes: a comment with the result of each check and a draft record, and the label `verified` or `unverified`.
- It checks that every required box of the form is ticked, reading the boxes from the two submission forms in the repository: the confirmations always, the consent and agreement from 2026-11-21, and where the authors live from 2026-11-22. The [Submission Policy](./policies/submission.md#what-the-submitter-confirms) lists the same boxes.
- From 2026-11-21, it also counts each other author's confirmation, as the [Submission Policy](./policies/submission.md) sets out.
- From 2026-11-23, it also checks that six months have passed since the first DOI of the work was registered, counted to the day the issue was opened, as the Submission Policy sets out.
- From 2026-11-23, it also checks that Crossref records no retraction, withdrawal or removal for the DOI, and sends an expression of concern to the operator.
- From 2026-11-24, it also checks that the statements on funding, on competing interests, and on human participants and research ethics are given. It does not judge what they say.
- From 2026-11-23, for a submitter who is not yet an author of a listed work, it also counts a researcher who vouches for the work: it reads the name, the websites and the works of that researcher's public ORCID record, and runs again when such a comment is written, edited or deleted.
- Since 2026-11-14, it also gives the moderator advice that decides nothing ([tools/pdf_advice.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/pdf_advice.js)): whether the licence printed on the first pages of the PDF agrees with the DOI metadata; how many strings shaped like an email address, a telephone number or a postal code appear after the first page, outside the authors' own; how many images the PDF embeds; whether the file matches the repository's checksum; and how many affiliations in the DOI metadata, or lines of the first page, name a place where Sophaxis is not offered. The comment and the log show counts and fixed words only, never what was found.
- From 2026-12-01, for an issue opened on or after that day, the checked intake: only the DOI metadata connects the ORCID iD to an author; every other author must have an ORCID iD in the DOI metadata, and a confirmation by email no longer counts; for every author whose identity it verifies, and for a researcher who vouches, it reads the address, employments and educations sections of the ORCID record and the location of the GitHub profile, under the place rule of the Submission Policy, and writes only how many people passed; it compares the current organisations of a researcher who vouches with the submitter's; and it reads the new words of vouching. It keeps and writes no country or organisation.
- Leaves to the operator: accepting or declining the submission.
- Code: [tools/intake.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/intake.js), run by [intake.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/intake.yml).

## When a report of an error in a record is opened or edited (from 2026-12-01)

- Reads: the Sophaxis id and the words quoted in the form, and the record page in the repository (`site/abs/<id>.html`).
- Writes: a fixed comment, in English and Japanese, and the label `quote verified`; or, when the words are not on the record page, the label `not verified`, and closes the issue as not planned. It never repeats what the report says.
- Never closes an issue that reads as a request about removal, rights, personal data, a name or the withdrawal of a consent: such an issue gets the label `needs a person` and stays open. Never acts on a submission, removal, withdrawal or published-version issue.
- Leaves to the operator: whether the record is wrong, and the correction.
- Code: [.github/checked-intake/verify.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/checked-intake/verify.js), run by [checked-intake.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/checked-intake.yml).

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
- When the issue reports exposure of personal data, it also takes the record page (its title, authors, abstract and PDF copy) offline at once while GitHub Actions runs, as the [Takedown Policy](./policies/takedown.md) says; when Actions does not run, the operator does it by hand, not at once.
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
- From 2026-12-01, closes each open submission that is not verified 30 days after its issue was opened, with a fixed comment, as the [Submission Policy](./policies/submission.md#the-checked-intake) sets out. It never closes a removal, withdrawal, published-version or correction issue. Code: [tools/intake.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/intake.js) with `--deadline`, run by [intake.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/intake.yml).
- Follow-ups of removals: ticks the deleted issues once GitHub answers that they are gone, and the request to the Internet Archive once the Wayback Machine lists no capture of the record page or its PDF copies. Closes the follow-up when everything is ticked, and reminds once a week of what is not.

## Once a month, on the 1st at 09:17 Japan time

- Measures whether Sophaxis still fits its free services: the deployments on the busiest day of the last 30 days against the 100 a day of Vercel's free plan, the PDF copies against the limits in `site.json`, and the repository against the 1 GB that GitHub recommends. It writes the table to the run's summary, and opens an issue only when a measure reaches 80 percent. Vercel's bandwidth and function use are not measured; only the operator's Vercel account shows them.
- Until 2026-11-13, this run also wrote an issue with posts for the official account on X. It no longer does: GitHub's terms allow GitHub Actions on GitHub's runners only for the production, testing, deployment or publication of the software project, and the posts serve none of them. Nothing is posted to X automatically.
- Code: [tools/limits.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/limits.js), run by [monthly.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/monthly.yml).

## Once a year, on 2 January at 12:23 Japan time

- Reads: the public issues labelled submission, withdrawal or removal, the comments of the repository owner on declined submissions, and the records.
- Writes: an issue with the counts of the year before: submissions opened, accepted, declined and not decided yet, the reasons named for declining, the days from submission to a decision, the requests, and the records withdrawn and removed.
- Leaves to the operator: recording the counts in `data/reports/`, from which the [Decisions by year](https://sophaxis.vercel.app/decisions.html) page is built.
- Code: [tools/report.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/report.js) and [tools/report_issue.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/report_issue.js), run by [report.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/report.yml).

## Once a year, on 30 October at 09:17 Japan time

- Reads: the section "Yearly audit" of [docs/operations.md](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/operations.md), the operator's routine.
- Writes: an issue on the day Sophaxis began, with that list to tick, unless an issue of the same title exists.
- Leaves to the operator: the audit itself.
- Code: [tools/audit.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/audit.js), run by [audit.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/audit.yml).

## On every push and every pull request, and once a week

- Runs every check of [verification/check.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/verification/check.js) against the records, the policies and the built site.
- Among them, a scan of every file in the repository for keys, tokens and email addresses other than the few the checks allow.
- The same checks also run on main once a week, on Monday at 14:07 Japan time, so that a check that depends on the date, and the scan, run even when nothing is pushed. A failure is shown in the repository's Actions, and the operator is told by GitHub.
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

- Reads: the DOI metadata of every listed version, the notices that Crossref records against each of them, the metadata of published versions, how OpenAlex holds each work, and each PDF copy in the repository, against its recorded SHA-256 and for the same advice as at submission. In a workflow of its own at the same time, the articles of Japanese law and the GitHub terms that the [legal review](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/docs/legal-review.md) relies on, from the e-Gov law API and GitHub, and the privacy statements of Vercel and Apple, from their sites.
- Writes: an issue when a DOI stops resolving, a licence changes, a PDF copy differs from its recorded SHA-256 or prints a licence other than its record's, Crossref records a notice that the record does not hold, a new version appears or a published version may exist; a pull request when an article of law, a GitHub term, or the date of the last update of Vercel's or Apple's privacy statement differs from the value recorded in `verification/statutes.json`, with the new values and texts and, for an article, the difference of its sentences (where the repository does not let workflows open pull requests, an issue with a link that opens it); an issue when one of them cannot be read; a summary of the run; a save to the Internet Archive of every page and PDF copy whose authors consented to it.
- Leaves to the operator: acting on what the issue reports, and reading the difference before recording it.
- Code: [tools/watch.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/watch.js), run by [watch.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/watch.yml), and [tools/statutes.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/statutes.js), run by [statutes.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/statutes.yml), which on a pull request only prints.

## When the operator labels the watch's pull request `record`

- Acts only on the label of the repository owner, and only on the branch `statutes/record`, which may change only `verification/statutes.json`, `verification/statutes-texts.json` and the changelog.
- Merges it into main, fills in the changelog's pull request number, runs every check and the watch itself on the merged result, and pushes only if all pass. The merge names the workflow as co-author.
- Leaves to the operator: reading the difference, and changing the policies first if the change requires it.
- Code: [tools/record.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/record.js), run by [record.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/record.yml).

## Only when the operator runs it

- Copies the PDF of a listed record from its repository onto a branch of its own, for a pull request that the operator reviews.
- Code: [tools/fetch_pdf.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/fetch_pdf.js).
- Fetches the texts of law, licences and terms that the legal pages cite, from their official sources, and writes the cited articles to `verification/sources-raw.json` on a new branch `sources/<date>`, never on main. The operator reads them before any quotation in `verification/sources.json` is taken from them.
- Keeps laws whole. Of every other text, such as the terms of a service, a licence or a guidance page, it commits only the address, the day, the SHA-256 of the text as fetched and the parts that the repository quotes or relies on. The whole texts of the run are kept as an artifact of the run for 90 days, not in the repository. It fetches nothing directly from a site whose terms forbid automated requests or collection, such as SSRN, edX or DataCite's website; it reads the pages of such sites from the Internet Archive's copies.
- Code: [tools/sources.js](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/tools/sources.js), run by [sources.yml](https://github.com/cpsbvbng26-dotcom/sophaxis/blob/main/.github/workflows/sources.yml).

## What stays by hand

- Every decision, and its grounds.
- Deleting emptied issues, which the follow-up issue lists.
- Asking GitHub to remove material from the repository history, and the Internet Archive to exclude earlier copies, with the drafts in the follow-up issue.
- Recording a changed text of law or terms, by the label `record`.
- Registering Sophaxis with indexes and registries.
- Answering email.
