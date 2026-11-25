---
title: 'Sophaxis: an overlay preprint server for philosophy and mathematics'
tags:
  - preprint server
  - philosophy
  - mathematics
  - logic
  - open access
  - scholarly communication
  - ORCID
  - DataCite
  - static site
authors:
  - name: Takuya Nemoto
    orcid: 0009-0000-1406-0547
    affiliation: 1
affiliations:
  - name: ZEN University, Japan
    index: 1
date: 25 November 2026
bibliography: paper.bib
---

<!-- Draft. Not submitted. What JOSS asks, and what is met, is in docs/joss.md.
     The sections and their order are those of JOSS's paper guide (openjournals/joss, docs/paper.md, read on 2026-11-25 at commit
     50d7440b4016aea5bfaa014c8e4d9b342a8dc62e): Summary, Statement of need, State of the field, Software design, Research impact
     statement, AI usage disclosure, Acknowledgements, References; "The paper should be between 750-1750 words."
     Check 41 counts the words, holds the sections in that order, matches every citation with paper.bib, and matches every DOI
     in paper.bib with what its registry answered (verification/paper-dois.json).
     JOSS's gates, read the same day (docs/submitting.md): more than six months of public history, so 2027-05-01 at the earliest, and only with
     active development spanning that period; evidence of use for research, at least by the developers and ideally by others.
     Aspirational statements do not count.
     The AI usage disclosure names Claude Code and the models that the Co-Authored-By trailers of the commits name, and no version
     that the history does not record. Check 41 compares the two. -->

# Summary

Sophaxis is an overlay preprint server for philosophy, mathematics, logic, the philosophy of mathematics and the philosophy of science.
It holds no manuscripts of its own.
An author deposits a preprint in SSRN, arXiv or Jxiv, and submits it to Sophaxis by its DOI and the author's ORCID iD.
After moderation, the work is listed with a stable record page, a copy of its PDF where the repository allows it, citation files and metadata for scholarly search engines.
Moderation is not peer review, and every page says so.

This paper describes the software that runs the server [@sophaxis]: a static site generator with no dependencies, written in JavaScript for Node.js, an intake that checks a submission from a GitHub issue form against the registries of DOIs and of ORCID iDs, a weekly watch of the listed works, and a test suite.
All of it runs on a local machine with Node.js alone.
The built site is static, with one serverless function for OAI-PMH, and its pages load nothing from other servers.

# Statement of need

Mathematics has arXiv [@ginsparg2011], and philosophy has archives of its own, such as PhilArchive [@philarchive]; other preprints in both fields sit in general repositories that do not sort them by field.
A reader who works across philosophy and mathematics, for example in logic or in the philosophy of mathematics, has no single place that lists the work of both with a record that can be cited.
Overlay journals answer a similar problem for peer-reviewed work by publishing on top of open repositories, and most of them are in the natural sciences, mathematics and computer science [@rousi2022].

Sophaxis targets the step between depositing a preprint and having it found.
It serves authors who want their work seen next to related work in these fields, and readers who look for preprints across them.
What it gives them is the record: authors checked against ORCID, versions read from the DOI registries, a later publication, retraction or correction, all in formats that citation managers and harvesters read.

Sophaxis is software that a reviewer can test locally, not only a hosted service.
The build, the intake and the watch are modules that the test suite loads directly, and the whole site can be rebuilt from its records, or from fixture records, with every check run on a local machine.

# State of the field

Sophaxis was weighed against contributing to existing software for preprint servers.
Open Preprint Systems (OPS), from the Public Knowledge Project, manages a preprint server; it is written in PHP, shares the PKP library with Open Journal Systems [@willinsky2005], and needs MySQL, MariaDB or PostgreSQL [@ops].
Janeway, from the Open Library of Humanities, publishes journals, preprints, conference proceedings and books; it is written in Python with Django and keeps its data in a relational database [@janeway].
The Open Science Framework is a free, open-source research workflow application from the Center for Open Science [@foster2017]; its development setup, which includes its preprint service, runs PostgreSQL, MongoDB, Elasticsearch, Redis and RabbitMQ among other services [@osf].
Episciences runs overlay peer review on top of existing repositories [@berthaud2014], and PhilArchive keeps the files of the works in philosophy that it holds.

Each of these holds manuscripts or runs peer review, and OPS, Janeway and OSF each need a database server that someone keeps running.
Sophaxis needs neither: the repository holds the file and registers the DOI, and Sophaxis adds a moderated, citable record across fields that none of them sorts together.
A contribution to OPS or Janeway would have meant adding an overlay mode to software built around holding submissions, with a database server still to run.
A community inside one general repository would tie the listing to that repository, while Sophaxis lists works from several: from 2026-12-07, a new work in SSRN, arXiv or Jxiv.
Sophaxis therefore builds only the missing part, and leaves the rest to existing infrastructure: DOIs and their metadata to DataCite, Crossref and JaLC [@brase2009; @hendricks2020; @jalc], identities to ORCID [@haak2012], harvesting to OAI-PMH [@lagoze2001], and preservation to the Internet Archive [@wayback].

# Software design

The first decision is that Sophaxis keeps no manuscript and no state on a server.
The build reads one JSON record per listed work, the policies in Markdown and one settings file, and writes the whole site: record pages, field lists, author pages keyed by ORCID iD, a search page, an Atom feed, the records as JSON, and BibTeX, RIS and CSL-JSON files.
Record pages carry the `citation_*` tags that Google Scholar reads [@scholar].
The OAI-PMH endpoint serves the records as `oai_dc` and `oai_openaire`; it is the only part that runs on the server, as a function that the build generates from the same records.
The cost is a commit and a rebuild for every change, which would be slow for a large service; the gain is that the whole state of the server is in git, where every change can be reviewed and reverted, and that any static host can serve it.

The second decision is to have no dependencies.
The build, the intake and the checks use only Node.js, including a small Markdown renderer, so that nothing is installed from a package registry; only the check of keyboard use and layout needs a browser.
The cost is code that a library would otherwise provide; the gain is a build that does not change when someone else's package does.

The third decision is to use a public code host as the submission system: a submission is a GitHub issue form.
A workflow reads the DOI metadata from DataCite, Crossref or JaLC, and reads the public ORCID record.
It checks that the ORCID record links to the GitHub account of the submitter, and that the ORCID iD belongs to an author of the work, either in the DOI metadata or through the works on the ORCID record.
A human then moderates the submission, and a merged pull request lists it.
This gives a public, dated trail for every decision without accounts to administer.
The price is that a submission is public, so the scripts read the issue from the event file rather than from environment variables, which the logs of a run would keep, and copy nothing of the ORCID record into the records, the logs or the comments.

The fourth decision is to treat the policies as part of the software.
The promises of the policies, such as that acceptance is moderation and not peer review, are kept one per line in a file that the test suite finds word for word in the pages, and no promise can be dropped without naming its replacement.
The test suite builds the site from fixture records and from the real ones, and checks the records, the generated pages, the colour contrast and the rules of the policies; many checks are confirmed by breaking their input on purpose and seeing them fail.
A weekly workflow confirms that each DOI still resolves, looks in Crossref and DataCite for new versions, published versions and notices of retraction or correction, and saves the record pages to the Internet Archive where every author consents.
Every page sets a Content-Security-Policy with `default-src 'none'`, and the only script, on the search page, reads the records of the site itself.

# Research impact statement

Sophaxis went public on 2026-10-30.
At the time of writing, every listed record is a submission by the operator, moderated under the same rules as any other, so the operator's own preprints are its only research use so far.
There is no record yet of use by other authors.
Sophaxis is listed in ROAR, the Registry of Open Access Repositories, and on the page of disciplinary repositories of the Open Access Directory, and its application to the Directory of Open Access Preprint Repositories (DOAPR) is under review.
The intake also runs deposit-check, the operator's checker of DOI metadata, pinned to one commit, to give advice on a submission.
The records are exposed through OAI-PMH, as JSON and as citation files, and the code and the records are archived at Zenodo with each release [@sophaxis], so that the design can be examined, rerun and reused.

# AI usage disclosure

Sophaxis was built with Claude Code, Anthropic's coding tool, at the author's request.
The models were Claude Opus 5 and Claude Opus 5.5, as the `Co-Authored-By` trailers of the commits name them; the history records no other model and no finer version.
Claude Code made most of the commits, writing the code, the tests, the policies, the documentation and this paper from the author's requests.
Its output was checked by the test suite, which runs in continuous integration on every push and pull request, by checks that break their input on purpose and must then fail, and, for this paper, by reading every cited DOI at Crossref or DataCite and comparing the answer with the entry.
The Moderation Policy also lets the operator give the public parts of a submission to Claude, ChatGPT or Grok to point out problems; no automatic step uses a language model, and the operator takes every decision.
Claude is not an author.
This draft was written by Claude Code.
The affirmation that JOSS asks of the authors, that they reviewed, edited and validated all AI-assisted output and made the core design decisions, is the author's own statement, and Claude does not make it on the author's behalf.

# Acknowledgements

Sophaxis depends on the open metadata of DataCite, Crossref, JaLC and ORCID, and on the repositories that hold the works it lists.
The operator runs Sophaxis as an unpaid volunteer, within the free services of GitHub and Vercel, and pays personally for Claude Code.
Sophaxis is not a project of ZEN University, and the university does not endorse it.

# References
