# Submission Policy

Last updated: 2026-10-31.

## Who can submit

Only an author of a work can submit it.
Sophaxis confirms this through ORCID, before a moderator reads the work.

- The ORCID record given in the form links to the GitHub account that opened the issue.
- The ORCID iD belongs to an author of the work: either the DOI metadata lists it for an author, or the ORCID record lists the DOI among its works and its name matches an author.

A submission that does not pass both is not listed.
Authors without an ORCID iD cannot submit.

This confirms that the person who controls the ORCID record opened the issue. It is not an official identity check.

## What can be submitted

Sophaxis accepts work in philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
Work that belongs mainly to another field is out of scope, even if it uses mathematics.

The work must already be deposited in Zenodo, Figshare, OSF Preprints, SocArXiv, MetaArXiv, arXiv, Preprints.org, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works or Jxiv, with a DOI.
It must carry CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 in its DOI metadata, as set out in the [Licence Policy](./licences.html).
It must have a title, an abstract and references, in the ordinary form of a scholarly paper.

Work that a journal has already published may be submitted only in a version that the authors may share under such a licence.
Publishers set different terms for this.
The submitter gives the DOI of the published version in the form, and the record links to it.

## What the submitter confirms

- The submitter is an author of the work.
- Every author of the work agrees to its listing on Sophaxis.
- The authors have the right to share this version under its licence; if a journal has published the work, the publisher allows it.
- The work contains no material, such as figures or long quotations, that the authors may not share, and no personal data of third parties.
- The statement on generative models is complete and true.
- The authors bear full responsibility for the work and its listing, as the [Terms of Use](./terms.html) set out.

## How to submit

1. Deposit the preprint in Zenodo, Figshare, OSF Preprints, SocArXiv, MetaArXiv, arXiv, Preprints.org, SSRN, Research Square, SciELO Preprints, Qeios, ScienceOpen Preprints, Advance, KC Works or Jxiv, under an accepted licence, and obtain its DOI.
2. Link your ORCID record to your GitHub account: add `https://github.com/<your username>` under "Websites & social links".
3. Open a submission issue in the Sophaxis repository and give the DOI, your ORCID iD, the category and the statement on generative models.
4. An automatic check reads the DOI metadata and your ORCID record, and posts the result in the issue.
5. A moderator checks the submission under the [Moderation Policy](./moderation.html). If it passes, a record page is published.

The title, the authors, the abstract, the licence and the versions are taken from the DOI metadata, not typed in by hand.

The submission issue is public.
Your GitHub username and everything you write in the form will be visible to anyone.

## Language models and other generative models

Work written or developed with language models is accepted, on one condition: the use is disclosed.
The same condition applies to every other generative model, including models that produce images, figures, audio or code.

The disclosure must name the tools used and say what they were used for,
for example drafting, translation, proofs, code, literature search, editing, figures or images.
If no generative model was used, the statement says so.

A language model cannot be listed as an author.
No other generative model can be listed as an author either.
The authors bear full responsibility for the work, as the [Terms of Use](./terms.html) set out.

If substantial undisclosed use comes to light after listing,
the record receives a notice, and the authors are asked to add a disclosure.

## Versions and updates

A work is listed once, under one Sophaxis id.
That id is never given to another work, even after a record is withdrawn or removed.

A new version is a new version in the repository.
Most repositories give each version its own DOI.
arXiv keeps one DOI for all versions, and that DOI leads to the latest one; the record then lists the same DOI with the date of each version.
Submit it as an update to the existing record; earlier versions stay listed.

## Examples of what is not accepted

These examples show how the rules above apply. They are not a complete list; the rules decide.
Each group matches a reason that a moderator names when declining, under the [Moderation Policy](./moderation.html).

Authorship: the submitter must be an author, and every author must agree.

- Submitting a colleague's paper for them, even with their permission. Only an author can submit.
- Submitting a paper by a teacher, a supervisor or a famous author because it deserves to be read.
- Opening the issue from a GitHub account that the ORCID record does not link to, such as a lab account or a second personal account.
- Giving the ORCID iD of a co-author, or of anyone other than the person who opens the issue.
- Giving an ORCID iD that neither the DOI metadata nor the ORCID record connects to the work.
- Submitting a work when a co-author has not agreed, or has said no.
- Opening a new GitHub account to submit a declined work again under another name.

Repository and DOI: the work must have its own DOI from an accepted repository.

- A PDF on a personal website, a university page, Google Drive, Dropbox, Academia.edu or ResearchGate.
- A work on PhilArchive, PhilSci-Archive or HAL alone, which give no DOI of their own. Deposit it also in an accepted repository.
- The DOI of the version a journal published, given as the DOI of the deposit.
- The DOI of an article in a SciELO journal, rather than in SciELO Preprints.
- The DOI of a peer review report, as Qeios and ScienceOpen also register.
- A DOI that does not resolve, or that leads to a different work.

Licence: the DOI metadata must carry CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.

- CC BY-NC 4.0, CC BY-ND 4.0, CC BY-NC-SA 4.0 or CC BY-NC-ND 4.0.
- CC BY 3.0, CC BY 2.0 or any other earlier version of a Creative Commons licence.
- The arXiv non-exclusive licence (arXiv.org perpetual, non-exclusive license).
- "All rights reserved", or no licence in the DOI metadata at all.
- A licence written only in the PDF or on the repository page, but not in the DOI metadata.
- A licence changed after listing to one that is not accepted. The weekly check reports it, and the operator looks into it.

Scope: the work must belong mainly to philosophy, mathematics, logic, the philosophy of mathematics or the philosophy of science.

- A paper in physics, economics, computer science, engineering, biology or psychology that uses mathematics as a tool.
- A machine-learning benchmark, a software description or a data set.
- Literary criticism, history or political commentary that does not argue a philosophical or mathematical question.
- Self-help, spiritual guidance, a manifesto or campaigning.

Form: the work must have a title, an abstract and references, in the ordinary form of a scholarly paper.

- Slides, a poster, lecture notes or a recorded talk.
- A blog post or an essay without references.
- An abstract alone, or a title page without the full text.
- Several unrelated papers in one deposit.
- Fiction, poetry or a diary.

Disclosure: the statement on generative models must name the tools and say what they were used for.

- "None" when a language model drafted, translated or edited any part of the text.
- A statement that says only that a language model was used, without naming the tool or saying what it did.
- Figures or images made with a generative model that the statement leaves out.
- A language model or another generative model listed as an author in the DOI metadata or in the paper.

Rights or personal data: the authors must be free to share everything in the work, and it must not expose others.

- A figure, a table or a photograph copied from a book, a paper or a website without permission, beyond what quotation allows. Citing the source does not replace permission.
- The publisher's typeset version of a journal article, when the publisher allows only the authors' manuscript to be shared.
- Names, email addresses, postal addresses or photographs of private persons who have not agreed.
- Survey or interview answers from which a participant can be identified.
- Screenshots of private messages, emails or chats.
- Unpublished material of another researcher, shared without their consent.

Spam or abuse.

- The same work submitted again and again, or under several titles.
- Many submissions opened at once to flood the issues.
- Advertising, links to paid services, or text written to sell something.
- Text that harasses, threatens or defames a named person.
- Attempts to break the form, the automatic check or the site, for example by placing code or markup in the fields.
- Pretending to be another person, an institution or a journal.

Versions.

- A new version submitted as a new work, instead of as an update to the existing Sophaxis id.
- A new version of a withdrawn record. A withdrawn record takes no new versions.

## Withdrawal

Any one author can withdraw a listed work under the [Withdrawal Policy](./withdrawal.html).
Records are not deleted: a withdrawn work keeps its record page with a withdrawal notice, so that citations to it do not break.
Removal for legal reasons follows the [Takedown Policy](./takedown.html).
