# Policy

Sophaxis is an overlay preprint server for philosophy and mathematics.
It lists preprints that authors have already deposited in an open repository,
and it gives each one a stable record page.

## What Sophaxis is not

Acceptance is moderation, not peer review.
A listing on Sophaxis says that a submission passed the checks below.
It does not say that the work is correct, original or important.
Sophaxis does not guarantee the quality of any listed work.

Sophaxis does not assign DOIs.
The DOI stays with the repository where the author deposited the work, and it is the reference to cite.

## Copies of the PDF and search engines

Sophaxis keeps an unmodified copy of the PDF of each listed version, so that search engines can index the full text.
It copies the file only from a repository that lets a script fetch it: Zenodo, figshare, arXiv and Research Square.
Where the repository publishes a checksum, the copy must match it.
When a deposit holds more than one PDF, Sophaxis does not guess which one is the paper, and makes no copy.
For OSF Preprints, Preprints.org and SSRN, the record links to the repository only.

The copy is the file the authors deposited, shared under the work's own licence, with its authors, its licence and a link to the original.
The accepted licences allow this.
Authors can ask for the copy to be removed; the record then links to the repository only.

Every record page carries the citation tags that Google Scholar reads.
Sophaxis does not control whether or when a search engine indexes a page.

## No fees

Sophaxis charges nothing, to authors or to readers.
There are no submission fees, no listing fees and no paid tiers.
It will not start charging.

## Scope

Sophaxis accepts work in philosophy, mathematics, logic and the philosophy of mathematics.
Work that belongs mainly to another field is out of scope, even if it uses mathematics.

## How to submit

1. Deposit the preprint in Zenodo, figshare, OSF Preprints, arXiv, Preprints.org, SSRN or Research Square, under an accepted licence, and obtain its DOI.
2. Link your ORCID record to your GitHub account: add `https://github.com/<your username>` under "Websites & social links".
3. Open a submission issue in the Sophaxis repository and give the DOI, your ORCID iD, the category and the statement on generative models.
4. An automatic check reads the DOI metadata and your ORCID record, and posts the result in the issue.
5. A moderator checks the submission. If it passes, a record page is published.

The title, the authors, the abstract, the licence and the versions are taken from the DOI metadata, not typed in by hand.

The submission issue is public.
Your GitHub username and everything you write in the form will be visible to anyone.

## Identity of the submitter

Only an author of a work can submit it.
Sophaxis confirms this through ORCID, before a moderator reads the work.

- The ORCID record given in the form links to the GitHub account that opened the issue.
- The ORCID iD belongs to an author of the work: either the DOI metadata lists it for an author, or the ORCID record lists the DOI among its works and its name matches an author.

A submission that does not pass both is not listed.
Authors without an ORCID iD cannot submit.

This confirms that the person who controls the ORCID record opened the issue. It is not an official identity check.

## What moderation checks

- The work is in scope.
- The DOI resolves to the work described, and the submitter is one of its authors.
- The work carries one of the accepted licences: CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.
- The work has a title, an abstract and references, in the ordinary form of a scholarly paper.
- The submission includes a statement on the use of language models and other generative models (see below).
- The work is not spam, not abusive and does not expose personal data of third parties.

A moderator who declines a submission gives a short reason in the issue.

The licence condition applies in every repository.
On arXiv, choose CC BY 4.0, CC BY-SA 4.0 or CC0 1.0 when you submit; the arXiv non-exclusive licence is not accepted.
Work on SSRN is accepted only if it carries one of the accepted licences.

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

## Versions, corrections and withdrawal

A new version is a new version in the repository.
Most repositories give each version its own DOI.
arXiv keeps one DOI for all versions, and that DOI leads to the latest one; the record then lists the same DOI with the date of each version.
Submit it as an update to the existing record; earlier versions stay listed.

Corrections are added to the record as dated notes.
They do not replace the work.

Records are not deleted.
A withdrawn work keeps its record page with a withdrawal notice,
so that citations to it do not break.
The only exception is removal required by law, such as copyright infringement or exposure of personal data.

## Removal requests

To request removal for legal reasons, open a removal issue.
Do not include personal data in the issue.

## Privacy

The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.
The search page runs one script, served by Sophaxis itself.
It reads the list of records from Sophaxis and searches it in your browser, and it sends nothing anywhere.
No other page runs a script.
Submissions are public GitHub issues and are subject to GitHub's terms.

When a submission issue is opened or edited, a GitHub Action reads two kinds of public data.
It reads the metadata of the DOI from DataCite or Crossref.
It reads the name, the websites and the works of the ORCID record given in the form.
It uses them only for the checks, and writes nothing else from the ORCID record anywhere.
Email addresses and other details in an ORCID record are not read.

## Finding work

Each record can be listed in more than one field.
Authors with an ORCID iD have a page that lists their work on Sophaxis.
Authors without one have no such page, because a name alone can belong to several people.
New records are announced in an Atom feed, `feed.xml`.
The public part of every record is available as `papers.json`, for reuse.
Abstracts in both keep the licence of their work.

## Metadata and abstracts

Titles, author names, licences and dates come from the DOI metadata, which DataCite and Crossref make openly available for reuse.
The abstract is part of the work.
It is shown under the work's own licence, with its authors and a link to the work.
This is why Sophaxis lists only work under CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.

## Operator and conflicts of interest

Sophaxis is operated by Takuya Nemoto, an independent researcher.
Submissions by the operator are moderated under the same rules
and are marked on their record pages as the operator's own.

## Licences of this site

The text of this site is licensed under CC BY 4.0.
The code is licensed under MIT.
Each listed work keeps its own licence.

This site and its code were built with Claude Code (Anthropic).
The operator is responsible for them. Claude is not an author.
