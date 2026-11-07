---
title: "Promises a one-person preprint server can keep: the design and first records of Sophaxis"
author:
  - name: Takuya Nemoto
    orcid: 0009-0000-1406-0547
    note: "Undergraduate student, Japan. No institutional affiliation for this work."
date: "Draft of 2026-11-07"
lang: en
bibliography: references.bib
---

<!-- Draft for MetaArXiv. Not submitted.
     verification/check.js holds the numbers below to the records, and holds every DOI in the references
     to the list of DOIs that were read at Crossref or DataCite on 2026-11-07. Add a reference only after reading it at its source. -->

# Abstract

Some preprint servers are run by one person, without fees and without an institution behind them.
Such a server asks authors and readers to trust promises that nobody checks: that listing is not peer review, that nothing is charged, that records are not deleted, that a removal leaves no trace beyond what is said.
This paper describes Sophaxis, an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science, run by one unpaid operator on a code host and a static host that it does not pay for.
Its design rests on one idea: a promise of the server should be text that a public check can hold in place.
Each commitment of its policies is a line in a file, and the check fails if a commitment disappears without a named replacement.
Every automatic step is listed, and no automatic step decides on a submission, a withdrawal or a removal.
A removed record leaves only its identifier, and the check verifies each part of that promise against the generated site.
The paper reports the record of the first days as it is.
As of 2026-11-07 the server had listed eight records, all of them the operator's own preprints; five are listed, and three were removed at their author's request.
No other author has used the server yet.
The design shows that the promises of a one-person server can be made checkable.
It does not show that they are kept in practice, which only use by others can show.

# 1. Introduction

Preprint servers differ in how they moderate and in what they promise [@chtena2024moderation; @kirkham2020platforms].
Many are run by organisations with staff, governance and funding.
Some are run by one person, as a service to a field.
For the second kind, the usual guarantees of an institution are missing.
There is no board to appeal to, no budget that pays for continuity, and often no written account of how decisions are made.
The Principles for Open Scholarly Infrastructures name governance, sustainability and insurance as the grounds on which a community can trust an infrastructure [@bilder2015posi].
A one-person service is weak on all three.

This paper asks what such a service can still promise, and how a reader can check that the promises stand.
It answers with the design of Sophaxis, an overlay server that went public on 2026-10-30.
The contribution is a design, not a measurement.
The paper describes the design in enough detail to be reused or criticised, reports the server's records as they are, and states what the design cannot show.

# 2. Setting and constraints

Sophaxis lists preprints in five fields: philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
It is an overlay: it holds no manuscripts of its own [@rousi2022overlay].
An author deposits a preprint in an open repository and submits it by its DOI.
Sophaxis accepts deposits in any of fifteen repositories, among them Zenodo, Figshare, OSF Preprints, arXiv and SSRN.
The DOI stays with the repository, and it is the reference to cite.

Four constraints shape the design.

1. One operator. The operator is at present the only moderator, and is not paid.
2. No fees, to authors or to readers. The site is served as static files by Vercel; the code, the records, the submissions and the automatic steps live in a public GitHub repository and run as GitHub Actions. Sophaxis pays for neither.
3. No database and no accounts of its own. A submission is a GitHub issue, and identity is checked through the author's public ORCID record.
4. No requests from the reader's browser to other servers. Every page sets a Content-Security-Policy with `default-src 'none'`.

# 3. Design

## 3.1 Who may submit

A submission is accepted only from an author of the work.
The author adds the address of their GitHub account to the public part of their ORCID record and opens a submission issue with the DOI and the ORCID iD.
An automatic step reads the DOI metadata from DataCite, Crossref or JaLC and reads the public ORCID record.
It checks that the ORCID record links to the GitHub account that opened the issue, and that the ORCID iD belongs to an author of the work.
It posts the result and a draft record in the issue.
Only verified submissions can be listed.
The same check applies to a withdrawal, to a reported published version and to a request for removal by an author.

## 3.2 Moderation, by a person

Acceptance is moderation, not peer review.
Moderation checks scope, form, licence, authorship, the disclosure of generative models and the absence of spam or exposed personal data.
It does not check proofs, arguments or data, and it does not compare a work with the literature.
Every decision is taken by the operator in the public issue and stays there.

The automatic steps are listed on a page of their own, with what each reads, what it writes and what it leaves to the operator.
No automatic step decides on a submission, a withdrawal, a correction or a removal.
One step acts before the decision: when a removal request reports exposure of personal data, the abstract and the PDF copy are taken offline at once, and they are put back if the request is not upheld.
No step uses a language model.

## 3.3 Commitments as checked text

The policies of Sophaxis make promises: that acceptance is moderation and not peer review, that nothing is charged, that records are not deleted, that a language model cannot be listed as an author, and others.
Each promise is a line in a public file, `verification/commitments.txt`.
The check that runs on every change fails if a line of that file is not found word for word in the policies.
It also fails if a line that the file ever held is gone, unless the text that replaces it is named in a second file, `verification/superseded.txt`.
The check reads the git history of the file to find lines that were ever there.

The effect is a ratchet.
A commitment can be reworded or replaced, but not dropped in silence: the replacement is named, and both files are public.
The check holds the text, not the practice.
It shows that a promise is still made, not that it is kept.

## 3.4 Withdrawal and removal

A listed work can be withdrawn by any one of its authors.
A withdrawn record keeps its page, its title, its authors and its versions, with a notice of the date and the reason, so that citations do not break.

Removal is different.
It applies when the law requires it, when an author shows that they never agreed to the listing, or when an author asks for it.
A removed record leaves only its Sophaxis id, the word "removed" and the day of removal.
The page at the old address says only that the record was removed.
The title, the authors, the abstract and the PDF copy leave the site, every list, the search, the feed and the records offered for reuse.
The OAI-PMH interface marks the record as deleted, with no metadata.
`robots.txt` asks the Internet Archive's crawlers not to collect the page again, and the operator asks the Archive to exclude earlier copies.
The identifier is never given to another work.

The design treats an identifier as permanent and its content as removable.
A citation to a removed record still leads somewhere, and the place it leads to says no more than that the record existed.
The check builds the site from test records that include a removed one, and verifies these effects on the generated files.

## 3.5 Preservation and discovery

Once a week, an automatic step confirms that every listed DOI still resolves and still carries the licence in the record, looks for new versions and for published versions, and asks the Internet Archive to save every page and PDF copy.
When the site changes, the search engines that take IndexNow are told which pages are new, changed or gone.
Record pages carry the metadata that scholarly search engines read, and the records can be harvested with OAI-PMH.

## 3.6 The operator's own work

The operator may submit their own work.
Such a submission goes through the same automatic check and is marked on its record page as the operator's own.
While the operator is the only moderator, the operator also decides on their own submissions, and the mark says so.
The policy commits that, once there is another moderator, no moderator decides on their own submission.

# 4. The record so far

The figures below are as of 2026-11-07.

Sophaxis has listed eight records, from 2026.0001 to 2026.0008, all of them preprints by the operator.
Five are listed.
Three, 2026.0006 to 2026.0008, were withdrawn and then removed at their author's request on 2026-11-07, under the procedure of section 3.4.
They were the first use of that procedure.
Each now leaves only its identifier, the word "removed" and the day.

No other author has submitted a work.
Sophaxis has been listed in ROAR, the Registry of Open Access Repositories, since 2026-11-06.
It has applied to the Directory of Open Access Preprint Repositories of COAR, to the Open Access Gateway of PhilPapers and to the Open Access Directory; none of them had listed it on 2026-11-06.
The code and the records are archived at Zenodo with each release [@nemoto2026sophaxis].

# 5. Discussion

## 5.1 What the design shows

A one-person server cannot offer the governance of an institution.
It can offer a record that anyone can read: every decision in a public issue, every automatic step listed with its code, every promise held in place by a check, and every earlier version of the policies in the public history.
This does not replace trust in the operator.
It narrows what has to be taken on trust to one question: whether the operator does what the public record says.

The ratchet answers a specific failure.
Small services often change their terms without notice, and a reader cannot tell what was promised before.
Here, a promise that disappears breaks the check, and a promise that changes leaves its replacement named.

The removal design answers a tension between permanence and the duty to remove.
A preprint server that promises never to delete cannot comply with a removal that the law requires, and one that deletes freely cannot be cited.
Keeping the identifier and removing everything else is one way to hold both.

## 5.2 What it does not show

All eight records so far are the operator's own.
The design has not met an author who is a stranger, a contested decision or a request made in bad faith.
The checks verify text and generated files.
They do not verify that the operator answers within the stated times, decides fairly, or keeps running the service.

The service depends on two companies, GitHub and Vercel, and on their terms for services that cost it nothing.
If either changes its terms, the service has to move.
The records, the code and the site are in the public repository and in the Zenodo archive, so a move is possible, but it has not been tested.

There is one operator.
If the operator stops, the service stops.
The policies commit that records are not deleted and that the Internet Archive is asked each week to save every page.
Those copies would outlive the service, but no one else would take decisions.

The policies are not legal advice, and they have not been reviewed by a lawyer.

## 5.3 Reuse

The software has no dependencies beyond Node.js and is released under the MIT licence.
A field that lacks a preprint server could run one under the same design with a code host and a static host.
The parts most likely to transfer are the ratchet of commitments, the list of automatic steps and the procedure for removal.

# 6. Conclusion

A preprint server run by one person can make its promises checkable, even if it cannot make them institutional.
Sophaxis does so by holding each commitment as text under a public check, by keeping every decision with a person and in public, and by defining exactly what a removed record leaves.
Whether the promises are kept is a question for its use by others, which has not yet begun.

# Statements

Competing interests.
The author is the operator of Sophaxis, the subject of this paper, and the author of every record it has listed.

Funding.
None.
Sophaxis receives no funding and charges no fees.
The author pays personally for a Claude Code subscription, which was used to write the code and this paper.

Use of generative models.
The code, the policies and this paper were drafted with Claude Code (Anthropic), a language model, at the author's request.
The author decided the design, reviewed the output and is responsible for it.
Claude is not an author.
The repository history records the use in each commit.

Data and code availability.
The code, the records, the policies and the checks are public at <https://github.com/cpsbvbng26-dotcom/sophaxis> and archived at Zenodo [@nemoto2026sophaxis].
The site is <https://sophaxis.vercel.app/>.

Licence.
This paper is under CC BY 4.0.

# References

::: {#refs}
:::
