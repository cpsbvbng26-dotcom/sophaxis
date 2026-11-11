# Draft: the application to OpenDOAR

Draft, not sent. Prepared on 2026-11-11 for the day OpenDOAR takes new submissions again; Jisc said it would give an update in January 2027.

This page adds no rule; the [policies](../policy.md) govern. Whether Sophaxis is listed is OpenDOAR's decision.

## Before sending

- Read the form as it is then. The headings below are those a directory of repositories usually asks for; they were not read from OpenDOAR's form, which is closed. Put each answer under the field that asks for it, and leave out what the form does not ask.
- Check every fact below against the site on the day, and change this page first if one has changed.
- Give the contact address of the operator's ORCID record, not one written here.
- Record the date of the application in the table of registrations in the README, in both languages, and nothing about the outcome until OpenDOAR answers.

## The answers

- Name: Sophaxis
- Address: https://sophaxis.vercel.app/
- OAI-PMH base URL: https://sophaxis.vercel.app/oai
- Metadata formats: `oai_dc` and `oai_openaire`
- Type: a disciplinary repository; an overlay preprint server
- Subjects: Philosophy, Mathematics, Logic, Philosophy of Mathematics, Philosophy of Science
- Content: preprints
- Interface: English, with Japanese translations of the policies and of the main pages
- Country: Japan
- Organisation: none. One person runs it, unpaid: Takuya Nemoto (ORCID 0009-0000-1406-0547).
- Began: 2026-10-30
- Software: its own static site generator in Node.js, with no dependencies; the OAI-PMH interface runs as a function on Vercel. The code is MIT, at https://github.com/cpsbvbng26-dotcom/sophaxis.
- Identifiers of Sophaxis itself: the OSF project, DOI 10.17605/OSF.IO/MQ7ZA; the code and the records at Zenodo, DOI 10.5281/zenodo.24033371 (every version).

## Description

Sophaxis is a free overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science. Authors deposit a preprint with a DOI in an open repository and submit it with their ORCID iD; after moderation, Sophaxis gives it a record page, and keeps an unmodified copy of the PDF on its own server where the repository and the licence allow. Acceptance is moderation, not peer review. It charges nothing, to authors or to readers.

## Policies

- Full texts: an unmodified PDF copy of the deposited version, where the repository allows it; otherwise the record links the repository. Every listed work is under CC BY 4.0, CC BY-SA 4.0 or CC0 1.0, and its copy keeps that licence. [Licence Policy](https://sophaxis.vercel.app/policies/licences.html), [Copyright Policy](https://sophaxis.vercel.app/policies/copyright.html).
- Metadata: the record data in the OAI-PMH interface, `papers.json` and `feed.xml` may be reused freely. The abstracts keep the licence of each work.
- Submission: only an author of a work can submit it, by a public issue; an automatic check confirms the DOI, the licence and the authorship through ORCID, and the operator decides. [Submission Policy](https://sophaxis.vercel.app/policies/submission.html), [Moderation Policy](https://sophaxis.vercel.app/policies/moderation.html).
- Where it is offered: Sophaxis does not list work by an author who lives in, or stays in, a place that the Submission Policy names.
- Preservation: a withdrawn record stays, marked as withdrawn; a removed record keeps its Sophaxis id. The code and the records are archived at Zenodo with each release. [Withdrawal Policy](https://sophaxis.vercel.app/policies/withdrawal.html), [Takedown Policy](https://sophaxis.vercel.app/policies/takedown.html).
- Privacy: [Privacy Policy](https://sophaxis.vercel.app/policies/privacy.html).
- Fees: none.
