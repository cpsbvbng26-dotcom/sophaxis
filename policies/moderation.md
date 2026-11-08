# Moderation Policy

Last updated: 2026-11-08.

Japanese: [モデレーションの規程（日本語訳）](./moderation.ja.html). It is a translation; where the two differ, the English text applies.

## Moderation is not peer review

Acceptance is moderation, not peer review.
Moderation decides whether a submission may be listed.
It does not judge whether the work is correct, original or important.

## What moderation checks

- The automatic check has verified the submitter and the licence.
- The work is in scope.
- The DOI resolves to the work described, and the submitter is one of its authors.
- The work carries one of the accepted licences: CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.
- The work has a title, an abstract and references, in the ordinary form of a scholarly paper.
- The submission includes a statement on the use of language models and other generative models.
- The submitter has confirmed that every author agrees and that the version may be shared.
- From 2026-11-21, every other author of a work with more than one author has confirmed their own agreement, as the [Submission Policy](./submission.html) sets out.
- The work is not spam, not abusive and does not expose personal data of third parties.
- The work shows no affiliation or address of an author in a place where Sophaxis is not offered, as the [Submission Policy](./submission.html) lists them. If it does, the moderator asks the submitter where that author lives and whether they have stayed there since the submission, and declines the submission unless the author lives elsewhere and has not stayed there.
- The PDF carries no notice of rights that contradicts the licence in the DOI metadata, such as a publisher's "all rights reserved". If it does, the submission is declined.

## What moderation does not check

It does not check proofs, arguments or data.
It does not run plagiarism checks.
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

A moderator who declines a submission names one or more of these reasons, with a short explanation:

- Out of scope: the work belongs mainly to a field outside philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
- Not in the form of a scholarly paper: it lacks a title, an abstract or references.
- Licence: the DOI metadata does not carry an accepted licence.
- Authorship: the submitter could not be confirmed as an author, or not every author agrees.
- Disclosure: the statement on generative models is missing or does not say how they were used.
- Rights or personal data: the work contains material that the authors may not share, or personal data of third parties, or the PDF carries a notice of rights that contradicts its licence.
- Where the authors live or stay: an author lives in a place where Sophaxis is not offered, or stayed in one between the submission and the listing.
- Spam or abuse.

The submitter can answer in the issue.
The operator then looks at the submission once more, and that decision is final.
The submitter can also go to a court, or to an out-of-court dispute settlement body certified under Article 21 of the Digital Services Act.

## Moderators

The operator is at present the only moderator.
Other moderators may be invited.
A researcher in these fields who would like to moderate can write to the operator; the operator decides whom to invite.
Each is named, with an ORCID iD, on the [Operator and contact](../contact.html) page before taking any decision, and moderates under this policy without pay.

## Conflicts of interest

Submissions by the operator are moderated under the same rules and are marked on their record pages.
The automatic check applies to them without exception.
While the operator is the only moderator, the operator also decides on their own submissions; the mark on the record page says so.
Once there is another moderator, no moderator decides on their own submission or on one by a close collaborator.

## After listing

Corrections are added to the record as dated notes.
Anyone can report an error in a record through the link on its page, which opens a public correction issue.
They do not replace the work.
A record can receive a notice when a problem comes to light, such as undisclosed use of generative models.

Each week, an automatic check confirms that every listed DOI still resolves and still carries the licence in the record.
A problem is reported in a public issue, and the operator looks into it.
