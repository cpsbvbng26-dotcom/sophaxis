# Readiness for the Journal of Open Source Software (JOSS)

Not submitted. This is the operator's checklist for a submission of the Sophaxis code to JOSS, kept beside the draft paper in [paper/paper.md](../paper/paper.md).
It adds no rule. The submission itself, and every answer to JOSS, are the operator's.

The criteria are those of JOSS's submission guide, read on 2026-11-11 from its source on GitHub: `docs/submitting.md` in `openjournals/joss`, at commit `675126ebed33f1b00a385f0241b0818f4b0599e6`.
JOSS may change them. Read the guide again before submitting, and change this page where it differs.

## When

The first commit here is from 2026-10-30, so the earliest possible submission is 2027-05-01.
The code of [errata-check](https://github.com/cpsbvbng26-dotcom/errata-check), the operator's checker of errata against frozen publications, is to be submitted to JOSS together with it, in May 2027 or later. Each is a submission of its own, and JOSS decides on each.
JOSS charges no fees for submitting or publishing ("No submission fees" in the guide).

## The checklist

The state is one of: met, partly met, not yet, at submission (to be done on the day), or for JOSS (a question only JOSS can answer).

| Criterion | State | Where it is shown, or what is missing |
| --- | --- | --- |
| More than six months of public history | not yet | 2027-05-01 at the earliest. Check 38 holds the date against git. |
| Active development across that period, not in a burst; ongoing iteration | partly met | Commits and merged pull requests since 2026-10-30, in `CHANGELOG.md`. Work has to go on through every month until the submission; JOSS runs automated checks on how the commits are spread. |
| Evidence of use for research, at least by the developer and ideally by others | partly met | The operator's own preprints are listed; the top page gives their share. No use by another researcher is recorded yet, and statements about future use do not count. |
| Engagement beyond the author (a strong signal, not a gate) | not yet | No issue or pull request by anyone else yet. |
| An OSI-approved licence | met | MIT, in `LICENSE`. Check 39. |
| Tests and continuous integration | met | `verification/check.js` and `verification/check_keyboard.js`, run by `.github/workflows/check.yml` on every push and once a week. |
| Documentation of how to build, run and check it | met | "How the site is made" in the README. |
| A CONTRIBUTING file, and stated support | met | `CONTRIBUTING.md`. Check 40. |
| Tagged releases or a changelog | met | `CHANGELOG.md`, and the versions archived at Zenodo under the DOIs in `CITATION.cff`. |
| Testable by a reviewer on a local machine | met | Node.js alone: `node build.js` and `node verification/check.js` need no package. The browser check needs playwright and Chromium, as the README says. |
| Packaged according to the standards of the language | not yet | There is no `package.json`. One without dependencies would keep the rule of no dependencies; the operator decides. |
| Web-based software: a core library exposed through the site, or rigorous domain modelling and testing | for JOSS | The build, the intake and the checks are plain modules that `verification/check.js` loads and tests. Whether that is enough is for JOSS to decide. |
| A paper of 250 to 1000 words with the sections JOSS asks for | met | `paper/paper.md`. Check 41 counts the words and the sections. |
| References with DOIs | at submission | `paper/paper.bib` holds no DOI until one is checked at its source. Check 41. |
| A disclosure of generative models, in the section JOSS names `AI usage disclosure`: the tools and their versions, where they were used, and that the author reviewed every output and made the core design decisions | at submission | The section is in the paper, and Claude is not an author. The versions are added on the day. |
| The author, the ORCID iD and the affiliation | at submission | One author, with the ORCID iD. The affiliation line is "ZEN University, Japan", decided by the operator on 2026-11-11; the paper gives no title. |
| A release and an archive DOI of the reviewed version | at submission | After the review, the operator makes the release and the Zenodo version by hand, and records the DOI that Zenodo gives. |

## What the operator does on the day

1. Read the guide again, and update this page.
2. Confirm every row above is met, or say in the submission why it is not.
3. Submit Sophaxis and errata-check, each through JOSS's own form, as the operator.
4. Record in the README that the submission was made, with the day, and replace "Nothing has been submitted yet."
