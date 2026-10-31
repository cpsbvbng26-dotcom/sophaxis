# From submission to listing

Last updated: 2026-10-31.

This page follows one submission from start to finish.
The rules themselves are in the [Submission Policy](./policies/submission.html) and the [Moderation Policy](./policies/moderation.html); where this page differs, they apply.

## Before you start

You need four things.

1. A preprint deposited in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square, with a DOI.
2. CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 on the deposit, so that it appears in the DOI metadata.
3. An [ORCID](https://orcid.org) iD. Registration is free.
4. A [GitHub](https://github.com) account. Registration is free.

Every author of the work must agree to the listing.
If you used language models or other generative models, note which tools you used and what for.

## Step 1. Link your ORCID record to GitHub

In your ORCID record, add `https://github.com/<your username>` under "Websites & social links", and make it public.
This is how Sophaxis confirms that the person who opens the submission is an author of the work.
Nothing else in your ORCID record is read, and your email address is never read.

## Step 2. Open a submission issue

Open the [submission form](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new?template=submission.yml) while signed in to GitHub.
Give the DOI, your ORCID iD, the category and the statement on generative models, and tick the confirmations.
The title, the authors, the abstract and the licence are taken from the DOI metadata; you do not type them.

The issue is public.
Your GitHub username and everything you write in it can be read by anyone.

## Step 3. The automatic check answers

Usually within a few minutes, a comment titled "Automatic checks" appears in the issue.
It shows each check as pass or fail: the repository, the licence, the DOI metadata, the link from your ORCID record and your authorship.
The issue receives the label `verified` or `unverified`.

If a check fails, the comment says why.
Fix the cause, for example the link in your ORCID record, then edit the issue; the check runs again.

If the repository does not let Sophaxis fetch the PDF (OSF Preprints, Preprints.org, SSRN), the comment asks you to attach the deposited PDF to the issue.
This is optional, and the file must be at most 20 MB.

A pass is not acceptance.

## Step 4. A moderator reads the submission

A moderator reads the verified submission against the [Moderation Policy](./policies/moderation.html):
the scope, the form of a scholarly paper, the statement on generative models, and the absence of spam, abuse and personal data of third parties.
Moderation is not peer review. It does not check proofs, arguments or data.

The operator aims to respond within 14 days.
The decision is written in the issue.

## Step 5. The decision

If the submission is accepted, its record page is published with a Sophaxis id, such as 2026.0001, and the issue is closed.
Where the repository allows, an unmodified copy of the PDF is added afterwards.

If it is declined, the moderator gives a short reason in the issue.
You can answer there.
The operator then looks at the submission once more, and that decision is final.

## After listing

- A new version: deposit it in the repository, then open a submission issue that gives the existing Sophaxis id.
- An error in the record: use "Report an error in this record" on its page.
- Withdrawal: any one author can withdraw the work under the [Withdrawal Policy](./policies/withdrawal.html).

Short answers to other questions are in the [FAQ](./faq.html).
