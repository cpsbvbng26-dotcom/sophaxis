# Moderation Policy

Last updated: 2026-11-11.

Japanese: [モデレーションの規程（日本語訳）](./moderation.ja.html). It is a translation; where the two differ, the English text applies.

The laws, licences and terms that this page cites are quoted at the end of each section that cites them.
Japanese statutes are quoted in full, as the e-Gov law API gives them. The other texts are quoted word for word from their official sources, as fetched on 2026-11-11, and are not translated.
A citation whose source could not be fetched is named there as not quoted, with the reason.

## Moderation is not peer review

Acceptance is moderation, not peer review.
Moderation decides whether a submission may be listed.
It does not judge whether the work is correct, original or important.

## What moderation checks

- The automatic check has verified the submitter and the licence.
- The work is in scope.
- The DOI resolves to the work described, and the submitter is one of its authors.
- The work carries one of the accepted licences: CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.
- The work has a title, an abstract and references, in the ordinary form of a scholarly paper. Where the repository lets Sophaxis fetch the PDF, the automatic check reads its shape (the number of pages, whether its text can be read, and whether the title, an abstract and references can be found) and shows it in the issue. The shape decides nothing; the moderator reads the PDF.
- The submission includes a statement on the use of language models and other generative models.
- From 2026-11-24, the submission states the funding, the competing interests, and whether the work involves human participants, with the ethics approval and the consent where it does, as the [Submission Policy](./submission.html) sets out.
- The submitter has confirmed that every author agrees and that the version may be shared.
- From 2026-11-21, every other author of a work with more than one author has confirmed their own agreement, as the [Submission Policy](./submission.html) sets out.
- From 2026-11-23, a researcher has vouched for a first submission, as the Submission Policy sets out.
- The work is not spam, not abusive and does not expose personal data of third parties.
- The work shows no affiliation or address of an author in a place where Sophaxis is not offered, as the [Submission Policy](./submission.html) lists them. If it does, the moderator asks the submitter where that author lives and whether they have stayed there since the submission, and declines the submission unless the author lives elsewhere and has not stayed there.
- The PDF carries no notice of rights that contradicts the licence in the DOI metadata, such as a publisher's "all rights reserved". If it does, the submission is declined.

## What moderation does not check

It does not check proofs, arguments or data.
It does not run plagiarism checks.
A moderator who finds plagiarism declines the submission, as set out under "Research integrity" below.
It does not check the statements on funding, competing interests, research ethics, or data and code, beyond reading them.
It does not compare the work with the literature.

## Provisional registration

A submission that passes the automatic check is provisionally registered: its issue is labelled `verified`, and it waits for a moderator.
A provisionally registered work is not on the site. It has no record page, is not offered through OAI-PMH, and is not sent to the Internet Archive or to any other service that keeps records.
Provisional registration is not acceptance. It ends when a moderator accepts or declines the submission.

## Decisions

A moderator accepts or declines a submission in its issue, and labels the issue `accepted` or `declined`.
Every decision stays public in its issue.
To help the review, the operator gives the public parts of a submission (the issue, the DOI metadata and the abstract) to three language models, Claude (Anthropic), ChatGPT (OpenAI) and Grok (xAI), and compares what they point out.
The operator does this by hand, in the chat of each service; no submission is sent to them automatically, and they are given nothing that is not already public.
The models only assist. No model accepts or declines a submission; every decision is taken by the operator, or by a moderator, who reads the submission.
What a model points out is given as a reason for a decision only after the operator has checked it.
As a guide, a decision can come on the day of submission, but it can also take several weeks or a few months.
Each January, the decisions of the year before are counted from the public issues and the records, with the reasons named for declining and the days to a decision, and the operator records them on the [Decisions by year](../decisions.html) page.
The counts of the current year can be recorded before it ends, marked with the day they were counted.

A moderator who declines a submission names one or more of these reasons, with a short explanation:

- Out of scope: the work belongs mainly to a field outside philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
- Not in the form of a scholarly paper: it lacks a title, an abstract or references.
- Licence: the DOI metadata does not carry an accepted licence.
- Authorship: the submitter could not be confirmed as an author, or not every author agrees.
- Disclosure: the statement on generative models is missing or does not say how they were used, or, from 2026-11-24, a statement on funding, competing interests, or human participants and research ethics is missing or incomplete.
- Rights or personal data: the work contains material that the authors may not share, or personal data of third parties, or the PDF carries a notice of rights that contradicts its licence.
- Plagiarism: the work presents the words, ideas, proofs or results of others as the authors' own, or presents the authors' own earlier work as new, without saying where they come from.
- Where the authors live or stay: an author lives in a place where Sophaxis is not offered, or stayed in one between the submission and the listing.
- Spam or abuse.

The submitter can answer in the issue.
The operator then looks at the submission once more, and that decision is final.
The submitter can also go to a court, or to an out-of-court dispute settlement body certified under Article 21 of the Digital Services Act.

<!-- text: DSA 21 -->

## Moderators

The operator is at present the only moderator.
Other moderators may be invited.
A researcher in these fields who would like to moderate can write to the operator; the operator decides whom to invite.
Each is named, with an ORCID iD, on the [Operator and contact](../contact.html) page before taking any decision, and moderates under this policy without pay.
A second moderator is invited only when all of these hold:

- They have an ORCID iD and a published or listed work in one of the fields of Sophaxis.
- They agree, in a public issue, to moderate under this policy without pay.
- They declare their interests as an adviser does, and the contact page shows the declaration.
- No work of theirs has been declined or removed under "Research integrity" below.

A moderator does not decide on their own work, or on the work of a close collaborator; another moderator, or the operator, decides it.
When two moderators disagree, the operator decides, and says so in the issue.
A moderator may stop at any time, and the operator may end a moderator's role; either is recorded on the contact page with the date.
Since 2026-11-10 the operator has also invited researchers to form an advisory board, which advises on the policies and decides no submission; the call is on [Advisory board: a call](../advisory.html).

## Conflicts of interest

Submissions by the operator are moderated under the same rules and are marked on their record pages.
The automatic check applies to them without exception.
While the operator is the only moderator, the operator also decides on their own submissions; the mark on the record page says so.
Once there is another moderator, no moderator decides on their own submission or on one by a close collaborator.
The operator's own submissions get no priority: they are moderated in the order they come, and their records have no other place on the site than any other record.
From 2026-11-09, a submission by the operator is listed no sooner than seven days after its submission issue is opened, so that anyone can object in the issue first.
The record keeps the day the issue was opened, and the build of the site refuses a record listed sooner.
The [Statistics](../stats.html) page and `llms.txt` say how many of the records shown are the operator's own.

## Research integrity

Plagiarism is presenting the words, ideas, proofs or results of others as one's own, without saying where they come from.
Presenting the authors' own earlier work as new, without citing it, is treated the same way, and so is submitting one work to Sophaxis twice under different DOIs.
Quoting, paraphrasing or building on the work of others with a clear citation is not plagiarism.
Sophaxis runs no software to detect plagiarism.
A moderator who finds it in a submission declines the submission, naming "Plagiarism".

Research misconduct includes plagiarism, fabrication (making up data, results or sources), falsification (changing them so that the work misrepresents them), and an untrue statement in the form.
Anyone can raise a concern about a listed record, in public through the correction issue linked on its page.
A concern that should not be public, or that names a person, goes by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
The operator handles a concern by the steps that COPE, the Committee on Publication Ethics, recommends for journals, as far as one person can; Sophaxis is not a member of COPE.

- The operator reads the concern and, if it concerns a listed record and is not plainly without ground, gives the authors 14 days to answer it.
- Sophaxis does not investigate misconduct. It has no power to examine data, records or witnesses. Where the research was done at an institution, or a journal has published the work, the operator tells the person who raised the concern that the institution or the journal is the body that investigates, and may inform it.
- A note is added to the record only for what is established: what the authors confirm, what an institution or a journal finds, or what a notice that Crossref records says. The note says what was found and by whom, and the day; it does not repeat an allegation.
- Where plagiarism or another problem is established, the authors are asked to correct the work in its repository or to withdraw it under the [Withdrawal Policy](./withdrawal.html). Copying that infringes copyright is removed under the [Takedown Policy](./takedown.html).
- The person who raised a concern by email is not named to the authors or to anyone else without their consent, unless the law requires it.
- A concern about a work by the operator follows the same steps, and the operator's answer is posted in the record's correction issue.

The operator closes without action a concern that is plainly made to harass, and says so to the person who raised it.

## After listing

The moderator may put a listed record in one or more [collections](../collections.html) by topic, beside its fields.
A collection says nothing of the quality of a work, and an author can ask, in the record's correction issue, for a record to be put in a collection or taken out of one.

Corrections are added to the record as dated notes.
Anyone can report an error in a record through the link on its page, which opens a public correction issue.
The notes do not replace the work.
A record can receive a notice when a problem comes to light, such as undisclosed use of generative models.

Each week, an automatic check confirms that every listed DOI still resolves and still carries the licence in the record.
The same check reads the notices that Crossref records against each DOI of a record shown: retractions, withdrawals, removals, expressions of concern and corrections, including those from Retraction Watch.
The operator adds a new notice to the record, where its page shows it with a link, and reviews the listing.
A problem is reported in a public issue, and the operator looks into it.
