# Submission Policy

Last updated: 2026-10-30.

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

The work must already be deposited in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square, with a DOI.
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

## How to submit

1. Deposit the preprint in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square, under an accepted licence, and obtain its DOI.
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
The authors are responsible for every claim, citation and calculation in the work.

If substantial undisclosed use comes to light after listing,
the record receives a notice, and the authors are asked to add a disclosure.

## Versions and updates

A new version is a new version in the repository.
Most repositories give each version its own DOI.
arXiv keeps one DOI for all versions, and that DOI leads to the latest one; the record then lists the same DOI with the date of each version.
Submit it as an update to the existing record; earlier versions stay listed.

## Withdrawal

An author can withdraw a listed work by opening an issue.
Records are not deleted.
A withdrawn work keeps its record page with a withdrawal notice,
so that citations to it do not break.
An author who did not agree to the listing can ask for it to be withdrawn in the same way.
Removal for legal reasons follows the [Takedown Policy](./takedown.html).
