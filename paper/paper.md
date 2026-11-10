---
title: 'Sophaxis: an overlay preprint server for philosophy and mathematics'
tags:
  - preprints
  - overlay journal
  - philosophy
  - mathematics
  - scholarly communication
  - open access
authors:
  - name: Takuya Nemoto
    orcid: 0009-0000-1406-0547
    affiliation: 1
affiliations:
  - name: Independent researcher, Japan
    index: 1
bibliography: paper.bib
---

<!-- Draft. Not submitted. The references carry no DOIs yet: add a DOI only after checking it at its source.
     JOSS's submission guide, read on 2026-11-11 from its source (openjournals/joss, docs/submitting.md), asks for:
     1. More than six months of public history, with active development across that period, not in a burst. Public since 2026-10-30, so 2027-05-01 at the earliest, and only if the work goes on through the months between.
     2. Evidence that the software is used for research, at least by its developers and ideally by others. Aspirational statements do not count. Today every listed work is the operator's own.
     3. Open-source practice: for a single author, several of a public commit history over time, releases or a changelog, tests and CI, documentation, a CONTRIBUTING file and stated support. These are present.
     4. Iterative development over time.
     It also says that many web-based tools are out of scope unless they expose a core library or show rigorous domain modelling and testing, and that a reviewer must be able to test the software locally.
     The AI usage disclosure must name the tools and their versions and where each was used, and affirm that the human author reviewed every output and made the core design decisions. The author adds the versions at submission. -->

# Summary

Sophaxis is an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
It holds no manuscripts of its own.
An author deposits a preprint in an open repository, such as Zenodo, Figshare, OSF Preprints, arXiv or SSRN, and submits it to Sophaxis by its DOI and the author's ORCID iD.
After moderation, the work is listed with a stable record page, a copy of its PDF where the repository allows it, citation files and metadata for scholarly search engines.

The software is a static site generator with no dependencies, written in JavaScript for Node.js.
It also contains the intake that reads a submission from a GitHub issue, a weekly watch of the listed works, and the checks that run on every change.
The site is served as static files and loads nothing from other servers.

# Statement of need

Preprints in philosophy and in mathematics are spread over general repositories that do not sort them by field, and over disciplinary archives that each take one field [@arxiv; @philarchive; @philscience].
A reader who works across philosophy and mathematics has no single place that lists the work of both, with a record that can be cited.
An overlay server answers this without becoming a repository itself, as overlay journals on arXiv have done for peer-reviewed work [@episciences].

Sophaxis targets the gap between depositing a preprint and having it found.
It suits authors who deposit in general repositories and want their work seen next to related work, and readers who look for preprints across these fields.
It does not peer-review, and it says so on every page.

The software is also meant to be reused.
One person can run a moderated, field-specific overlay server with a static host and a code host, with no database and no fee to authors or readers.

# State of the field

Preprint repositories hold the files and register DOIs; Sophaxis relies on them for both.
Overlay journal platforms run peer review on top of open archives [@episciences], and preprint review services attach evaluations to existing preprints [@sciety].
Sophaxis does neither.
It moderates, lists and links.
Disciplinary archives in philosophy accept direct deposits [@philarchive; @philscience], while Sophaxis lists work that is already deposited elsewhere, in any of fifteen repositories.

# Software design

The build reads one JSON record per listed work and writes the whole site: record pages, field lists, author pages keyed by ORCID iD, a search page, an Atom feed, the records as JSON, and BibTeX, RIS and CSL-JSON files.
Record pages carry the `citation_*` tags that Google Scholar reads [@scholar].

Submission runs through a GitHub issue form.
A workflow reads the DOI metadata from DataCite, Crossref or JaLC [@datacite; @crossref; @jalc], and reads the public ORCID record [@orcid].
It checks that the ORCID record links to the GitHub account of the submitter and that the ORCID iD belongs to an author of the work.
A human then moderates the submission, and a merged pull request lists it.

A weekly workflow checks that each DOI still resolves, looks for new versions, and saves the record pages to the Internet Archive [@wayback].
When a listed preprint is later published, an author reports the published version, and the same ORCID check applies.
The record page then leads with the published version and gives peer review only as the authors state it.
The weekly workflow also looks in Crossref and DataCite for a published version that is linked to a listed preprint, and for retraction or correction notices on a recorded one.
Every page sets a Content-Security-Policy with `default-src 'none'`, so the pages make no requests to other servers.
The checks cover the records, the generated site, the policies and the colour contrast of the pages.

# Research impact statement

Sophaxis went public on 2026-10-30.
At the time of writing, every listed record is a submission by the operator, moderated under the same rules as any other.
There is no record yet of use by other authors.
Its policies, the moderation flow and the code are public, so that the design can be examined and reused.

# AI usage disclosure

The code, the policies and this paper were drafted with Claude Code (Anthropic), a language model, at the author's request.
The author decided the design, reviewed the output, and takes responsibility for it.
Claude is not an author.
The repository history records the use in each commit.

# Acknowledgements

Sophaxis depends on the open metadata of DataCite, Crossref, JaLC and ORCID, and on the repositories that hold the works it lists.

# References
