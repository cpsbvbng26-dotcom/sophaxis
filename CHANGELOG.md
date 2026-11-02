# Changelog

The notable changes to Sophaxis, newest first. Each entry names the pull request that made it.
No version has been tagged yet, so the entries are grouped by the date of the merge.

## 2026-11-02

- Six of the operator's own preprints are listed after moderation, as 2026.0003 to 2026.0008: three papers in philosophy and the three Trinity-Infinity papers in mathematics. Each record notes the author's errata (#78).
- PDF copies can be taken from Zenodo: its file endpoint refused a request that accepted only `application/pdf`. The PDF workflow reads the whole git history, as the checks need.
- The README records that a submission of the code to the Journal of Open Source Software (JOSS) is planned (#62).
- Zenodo and `CITATION.cff` metadata, ready for a release DOI later (#63).
- `CONTRIBUTING.md` and this changelog (#64).
- A draft of the JOSS paper, `paper/paper.md` and `paper/paper.bib` (#65).
- The weekly watch logs why a save to the Internet Archive failed, and looks up the latest copy of each address (#66).
- The published version of a listed preprint: a form for authors to report it, checked through ORCID and the DOI metadata; a notice at the top of the record page, with the peer review the authors state; a flag in the lists and search; a note in the citation files; counts on the statistics page; and a weekly search of Crossref and DataCite for a published version linked to a listed preprint, and for retraction and correction notices (#67).
- The draft JOSS paper describes the published-version mechanism.
- Saves to the Internet Archive are a minute apart, with two longer retries: the sixth save of a run could not connect, and one PDF copy had never been saved.

## 2026-11-01

- Record pages show an Access line (the latest PDF copy, the repository, BibTeX), as arXiv does. Short addresses `/abs/<id>` and `/pdf/<id>` redirect to the record and to its latest PDF (#61).
- The OSF project and its DOI are listed, and the application to DOAPR is recorded (#60).
- The Terms of Use announce changes in advance and gain general clauses: precedence, severability, waiver, minors and notices (#59).

## 2026-10-31

Records

- 2026.0001 is listed: the golden-window conjecture (#15), with its PDF copied from Figshare (#16).
- 2026.0002 is listed: Machine-mediated Rediscovery (#20), with the PDF the author attached to its submission issue (#22).
- The same DOI cannot be listed in two records (#18).
- An id is never used twice, and every record is ready to take a DOI of its own if Sophaxis ever registers DOIs (#52).

Submission and moderation

- When a repository does not let a script fetch the PDF, the copy can come from a PDF the authors attach to their submission issue (#21).
- PDF copies are limited to 20 MB each and 1 GB in total (#33).
- The intake asks for a missing PDF, finds new versions, and gives examples of how to disclose the use of generative models (#34).
- A withdrawal policy, a withdrawal form and a check that the requester is an author (#38).
- Authors bear full responsibility for their works and their listing (#39).
- Requests that should not be public go by email to the address on the operator's ORCID record (#30).
- Eight more repositories are accepted; Jxiv is read from JaLC (#46, #51).
- Philosophy of science is added as a field (#17).
- A guide of how long moderation takes, from the same day to a few months (#49), kept apart from a pause of submissions (#50).

Policies

- The policies are split into seven, with the agreement of co-authors, the right to share and the procedure for removal (#14).
- A privacy policy following Japan's Act on the Protection of Personal Information (#29).
- Concrete examples of what is not accepted, in the submission and copyright policies (#48).
- The groundwork for a one-person operation: reasons for declining, moderators, continuity, dependencies and statistics (#47).
- A disclaimer, a page for repositories and DOI registration agencies, and the link with GitHub (#45).
- The legal grounds of the site, with disclaimers and thanks to repositories and registration agencies (#53).
- Dispute resolution: talks first, then mediation, then court (#55), with provisions for people outside Japan (#56) and for GitHub and Vercel (#57).

Site

- Pages for the operator and contact (#40), an FAQ (#41), and the steps from submission to listing (#42), with the clicks in GitHub, ORCID and issues in order (#43).
- Record pages: citation files, related records, a form to report an error, and links to saved copies (#35).
- Structured data, share links, sitemap dates and a 404 page (#25).
- Accessibility (a link to skip to the content, a visible focus) and `security.txt` (#58).
- Colour contrast checks and a description of the fields of `papers.json` (#36).
- The logo as ICO and PNG for search results (#31), and a Google Search Console verification tag (#23).
- The footer is in English only (#32), says the site is hosted on Vercel (#37), and says it was built with Claude Code (#54).
- Figshare is written with a capital F (#44).
- Fixes from a review of every page (#24).

Operations

- A weekly check of the listed works and saving of the pages to the Internet Archive (#26), with one retry after a 429 or a dropped connection (#27, #28).

## 2026-10-30

The first public version.

- Submission by DOI, with a check by ORCID that the submitter is an author (#7).
- Search, a feed, the records as JSON, author pages, keywords, citation formats and multiple fields (#12).
- PDF copies of listed works and tags for Google Scholar (#10).
- Lists by field (#3).
- OSF Preprints (#4), and arXiv, Preprints.org and SSRN (#6), are accepted as repositories.
- Disclosure applies to all generative models, not only language models (#5).
- Listed work is not guaranteed in quality; Research Square is accepted (#9).
- The name shown in search results is Sophaxis (#2).
- A logo and a share card (#1).
- The claim of "diamond open access" is removed (#11).
- Character ranges in regular expressions are written with `\u` escapes again (#13).
