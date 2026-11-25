# Readiness for the Journal of Open Source Software (JOSS)

Not submitted. This is the checklist for a submission of the Sophaxis code to JOSS, kept beside the draft paper in [paper/paper.md](../paper/paper.md).
It adds no rule. The submission itself, and every answer to JOSS, are made from the operator's account, which cannot be reached from here.

The criteria are quoted from JOSS's documentation as read on 2026-11-25 from its source on GitHub, `openjournals/joss` at commit `50d7440b4016aea5bfaa014c8e4d9b342a8dc62e`: `docs/submitting.md`, `docs/review_criteria.md`, `docs/review_checklist.md`, `docs/paper.md`, `docs/policies.md` and `docs/example_paper.md`.
The first read, on 2026-11-11, was of `docs/submitting.md` alone, at commit `675126ebed33f1b00a385f0241b0818f4b0599e6`.
Between the two reads JOSS changed only the sentence of it on the archive made after a review, and nothing of the paper guide.
The paper guide had replaced "250-1000 words" with "750-1750 words" on 2026-01-15, before the first read, but this page and Check 41 kept the old range until 2026-11-25; the draft also lacked the date that the guide asks for, and Check 41 held neither the order of the sections nor Acknowledgements.
Quotations drop JOSS's links and emphasis, and nothing else; an omission is marked with an ellipsis.
JOSS may change its documentation again. Before a submission, it is read again and this page is changed where it differs.

## When

The first commit here is from 2026-10-30, so the earliest possible submission is 2027-05-01.
That day is a condition, not a date that the calendar alone reaches: JOSS asks for "more than six months prior to submission, with active development spanning that period", and runs "automated checks on commit distribution".
The work has to go on, in public, through each month until the submission.
The code of [errata-check](https://github.com/cpsbvbng26-dotcom/errata-check), the operator's checker of errata against frozen publications, is to be submitted to JOSS together with it, in May 2027 or later. Each is a submission of its own, and JOSS decides on each.
JOSS charges no fees for submitting or publishing ("No submission fees" in the guide).

## The gates before review

JOSS: "Before entering review, all submissions are evaluated against the following gates. A submission that fails any one of these will receive a desk rejection, but can be resubmitted once the gaps are addressed."

The state is one of: met, partly met, not yet, at submission (to be done on the day), or for JOSS (a question only JOSS can answer).

| Criterion | State | Where it is shown, or what is missing |
| --- | --- | --- |
| Gate 1. "The repository must have been public for more than six months prior to submission, with active development spanning that period." | not yet | 2027-05-01 at the earliest, from the first commit; Check 38 holds the date against git. The day the repository was made public is not recorded here; if it was later than the first commit, the date moves with it. The history so far is a few weeks long and comes in bursts, and it meets the gate only if the work goes on across the months between. |
| Gate 2. "There must be evidence that the software is being used for research — at minimum by the developers themselves, and ideally by others." | partly met | The operator's own preprints are listed and moderated under the same rules as any other; Check 41 fails if the paper says so while a record of anyone else is shown. No use by another researcher is recorded. JOSS: "Aspirational statements about future use are not sufficient". |
| Gate 3. "For single-author projects, this bar can be met more broadly — but multiple indicators must be present at submission time: a meaningful public commit history over time, tagged releases or a changelog, tests and CI, clear documentation, a CONTRIBUTING file, and stated support or governance expectations." | met | The tag `v1.0.0` and its Zenodo DOI, `CHANGELOG.md` (Check 40), `verification/check.js` run by `.github/workflows/check.yml`, the README, `CONTRIBUTING.md` with its Support section (Check 40). The commit history over time is gate 1. |
| Gate 4. "The development history must show ongoing iteration, not a single burst of commits." | not yet | The history is short and dense. JOSS looks for "evidence that the software has been refined through use and feedback over time"; only time and use can show that. |
| Strong positive signal, not a gate: "non-author issues, pull requests, or discussions" | not yet | The history holds no commit by anyone but the operator, Claude and GitHub's bot (Check 150). |

## Scope

| Criterion | State | Where it is shown, or what is missing |
| --- | --- | --- |
| Research software: "software that: solves complex modeling problems in a scientific context (...); supports the functioning of research instruments or the execution of research experiments; extracts knowledge from large data sets; offers a mathematical library, or similar" | for JOSS | A preprint server is infrastructure for scholarly communication, which none of the listed kinds names. Whether a preprint server is within the scope of JOSS is for JOSS to decide. |
| Web-based software: "Many web-based research tools are out of scope for JOSS due to a lack of modularity and challenges testing and maintaining the code." They may be in scope if "1) they are built around and expose a 'core library' through a web-based experience" or "2) the web application demonstrates a high-level of rigor with respect to domain modeling and testing" | for JOSS | Sophaxis is not a hosted application with a server to install: it is a static site generator, an intake, a watch and checks, plain modules that `verification/check.js` loads and tests, with fixture records and break tests. Whether that is the rigour JOSS means is for JOSS to decide. |
| "it's essential that any web-based tool can be tested easily by reviewers locally (i.e., on their local machine)" | met | Node.js 22 and git: `node build.js` and `node verification/check.js`, or `npm run build` and `npm test`. The README lists what each check needs (Check 150). |
| "feature-complete (i.e., no half-baked solutions)" and not a "Minor utility" | for JOSS | Submission, moderation, listing, versions, withdrawal, removal, published versions, OAI-PMH, citation files and the weekly watch are in the code and the checks. |
| "packaged appropriately according to common community standards for the programming language being used" | met | `package.json`, with no dependencies, gives the version, the licence, the Node.js version and the scripts `build` and `test` (Check 150). Decided by Claude on 2026-11-25, in place of the decision of 2026-11-12 to add none: a `package.json` is the standard of the language even with no dependency, and it adds none. |

## The review checklist

| Criterion | State | Where it is shown, or what is missing |
| --- | --- | --- |
| "Repository: Is the source code for this software available at the repository url?" | met | <https://github.com/cpsbvbng26-dotcom/sophaxis>, which anyone can clone, and whose issues anyone with a GitHub account can open. |
| "License: Does the repository contain a plain-text LICENSE file with the contents of an OSI approved software license?" | met | MIT, in `LICENSE`. Check 39. |
| "Contribution and authorship: Has the submitting author made major contributions to the software?" | for JOSS | The operator directed the work and made the decisions that the records name as the operator's; Claude made most of the commits (Check 41), and the records name many decisions of design as Claude's. JOSS asks that "human authors ... made the core design decisions"; that is the author's own statement, and this page does not make it. |
| "Development timeline: Does the project show evidence of sustained development over time (preferably months or years) rather than rapid, recent code generation?" | not yet | Gates 1 and 4. |
| "Open development: Was the software developed openly from early stages?" | partly met | Every change after 2026-11-07 is a merged pull request, and the history is public; some changes of the first days were pushed straight to main (Check 150). The day the repository was made public is not recorded here. |
| "Collaborative effort" | not yet | Single author, and no engagement by others yet. JOSS accepts a single author with "other evidence of community engagement"; there is none to show. |
| "Good practices: Does the project follow good open-source practices (license, documentation, tests and/or verification processes, releases, and clear contribution/support pathways)?" | met | Gate 3. |
| "Installation: Does installation proceed as outlined in the documentation?" | met | "How the site is made" in the README: what the build and the checks need, and the commands. Check 150 holds the versions against the workflow. |
| "Functionality: Have the functional claims of the software been confirmed?" | for JOSS | The claims of the paper are the ones that Check 41 and the other checks hold. Confirming them is the reviewers' part. |
| "Performance: If there are any performance claims of the software, have they been confirmed?" | met | The paper makes no claim of performance. |
| "A statement of need" | met | The README's Statement of Purpose, and the paper's Statement of need. |
| "Installation instructions: Is there a clearly-stated list of dependencies?" | met | The README: Node.js 22, git with the whole history, poppler-utils for the checks of PDF copies, and playwright 1.56.1 with Chromium for the keyboard check alone. |
| "Example usage" | met | The README builds the site into another directory, and builds the made-up records that the checks use. |
| "Functionality documentation: Is the core functionality of the software documented to a satisfactory level (e.g., API method documentation)?" | partly met | The README documents the records, `papers.json` field by field (Check 17), OAI-PMH, the citation files, moderation and every automatic step; the functions of `build.js` and `tools/` are documented in their comments, not in a reference of their own. |
| "Automated tests" | met | `verification/check.js` and `verification/check_keyboard.js`, run by `.github/workflows/check.yml` on every push and pull request and once a week. |
| "Community guidelines: Are there clear guidelines for third parties wishing to 1) Contribute to the software 2) Report issues or problems with the software 3) Seek support" | met | `CONTRIBUTING.md`: where each kind goes, how to change and check, and Support. Check 40. |

## The paper

| Criterion | State | Where it is shown, or what is missing |
| --- | --- | --- |
| "The paper should be between 750-1750 words." | met | `paper/paper.md`. Check 41 counts the words. |
| The required sections: "Summary, Statement of need, State of the field, Software design, Research impact statement, AI usage disclosure, Acknowledgements, and References" | met | In that order; Check 41 fails on any other order, a missing section or one of its own. |
| "State of the field": a "build vs. contribute" justification | met | Open Preprint Systems, Janeway, OSF and Episciences, each from its code, its README or a paper with a DOI, and PhilArchive as the site's page of comparison records it; and why Sophaxis did not contribute to them. |
| "Research impact statement": "The evidence should be compelling and specific, not aspirational." | partly met | The paper says what there is: the operator's own preprints, the listings in ROAR and the Open Access Directory, the application to DOAPR under review, and deposit-check run by the intake. It is not compelling yet, and the paper does not say it is. |
| "AI usage disclosure": "The tools/models used (and versions) and where they were used", "The nature and scope of assistance", "Confirmation of review" | partly met | The paper names Claude Code and the models that the `Co-Authored-By` trailers of the commits name, and no finer version, because the history records none (Check 41). The confirmation of review is the author's own statement; the draft says so and does not make it. |
| The date, "using the following format: `%e %B %Y`", and the title as plain text | met | Check 41. |
| "A list of key references, including to other software addressing related needs" | met | `paper/paper.bib`. Every DOI was read at api.crossref.org or api.datacite.org, and `verification/paper-dois.json` keeps what the registry answered; Check 41 fails if an entry differs from it. Entries for services and code are cited by their address. |
| "Acknowledgement of any financial support" | met | The paper says, as the README does, that the operator runs Sophaxis as an unpaid volunteer on free services and pays for Claude Code. |
| The author, the ORCID iD and the affiliation | met | One author, with the ORCID iD. The affiliation line is "ZEN University, Japan", decided by the operator on 2026-11-11; the paper gives no title and no ROR identifier. |
| "The paper may be in a short-lived branch" or on the default branch, with the software | met | The paper is on main, beside the code. |

## On the day, and after the review

Before the submission, this page is read against JOSS's documentation again, and every row above is met or the submission says why it is not.
Sophaxis and errata-check are submitted each through JOSS's own form, from the operator's account.
The README then gives the day of the submission in place of "Nothing has been submitted yet."
JOSS asks for an archive after the review, not at submission: "Upon successful completion of the review, authors will make a tagged release of the software, and deposit a copy of the repository with a data-archiving service such as Zenodo or figshare, get a DOI for the archive of the software associated with that specific tag".
`.zenodo.json` and `CITATION.cff` hold the metadata of that archive (Check 39). The tag and the Zenodo version are made from the operator's accounts, which cannot be reached from here; tags cannot be pushed from here either. Only the DOI that Zenodo gives is recorded.
