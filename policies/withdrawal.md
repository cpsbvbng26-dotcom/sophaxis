# Withdrawal Policy

Last updated: 2026-11-12.

Japanese: [撤回の規程（日本語訳）](./withdrawal.ja.md). It is a translation; where the two differ, the English text applies.

The Withdrawal Policy says how an author withdraws a listed work, and what stays.

## Who can withdraw

Any one author of a listed work can withdraw it.
A work is listed only while every author agrees, so the listing ends when one author withdraws that agreement.

The request comes from the author's own GitHub account, as at submission.
The author's ORCID record must link to that account, and the ORCID iD must belong to an author of the work.
An automatic check confirms both and posts the result in the issue.

## How to ask

Open a withdrawal issue and give the Sophaxis id, your ORCID iD and a short reason.
The reason is shown on the record page, so it must not contain personal data.
The issue is public.

A request that cannot be made in public goes by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
The operator then confirms the author through the ORCID record, as the check does in the issue.

## What happens

The operator aims to act within 7 days of a verified request.
The record page keeps its address, its title, its authors, its abstract and its versions, so that citations do not break.
A notice at the top gives the date of withdrawal and the reason.
The record stays in the lists, the search, the feed and `papers.json`, marked as withdrawn.
The PDF copies are taken off the site, and the record links to the repository only.
A withdrawn record takes no new versions.
Earlier copies stay in the history of the public repository and in the Internet Archive, and harvesters of the OAI-PMH interface keep what they took.

## Removal at an author's request

An author can ask, in the same issue, for the record to be removed instead of withdrawn.
The form asks which of the two the author wants.
The same check confirms that the account asking belongs to an author of the work.
A record that is already withdrawn can still be removed.
The operator removes the record by labelling the verified issue `upheld`, and aims to do so within 7 days.
Only the Sophaxis id then stays, as the section "What a removed record leaves" in the [Takedown Policy](./takedown.md) sets out.
No reason is shown, and the withdrawal issue itself is emptied, closed and locked.

## An author's name

As the Creative Commons licences provide, an author can ask for their name to be taken off a record.
The operator does so as far as is reasonably practicable, and the record stays.

## The work in its repository

Withdrawal on Sophaxis does not touch the deposit.
Sophaxis cannot withdraw or delete a work at Zenodo, Figshare or any other repository; a request about the deposit goes to that repository.
If the repository withdraws or deletes the deposit, the weekly check finds that the DOI no longer resolves, and the operator withdraws the record with a note that says so.

## Withdrawal on publication

Some publishers ask authors to remove a preprint when the work is published.
Any one author can then withdraw the listing as above.
If the published version is recorded, the record page keeps the link to it, so that a reader who follows a citation of the preprint finds the published version.
The authors can report the published version before they ask for withdrawal; a withdrawn record takes no new report.

## Withdrawal and removal

Withdrawal is the authors' decision, and the record stays.
Removal is for legal reasons, such as copyright infringement or exposure of personal data, or at an author's request, and takes the title, the authors, the abstract and the PDF copy off the site.
It follows the [Takedown Policy](./takedown.md).
