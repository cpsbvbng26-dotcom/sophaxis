# Changelog

The notable changes to Sophaxis, newest first. Each entry names the pull request that made it.
No version has been tagged yet, so the entries are grouped by the date of the merge.

## 2026-11-07

- Removal requests are handled at once and decided by the operator. A removal issue is acknowledged automatically with the day the answer is due, and the authors are told. A report of exposed personal data takes the abstract and the PDF copy offline at once. The operator's label `upheld` or `not-upheld` then removes the record, or puts back what was taken offline. A reminder goes to requests near the 7 days. From 2026-11-21 the submission check counts each co-author's own confirmation (#110).
- The three Trinity-Infinity papers (2026.0006, 2026.0007, 2026.0008) are withdrawn by their author under the Withdrawal Policy. The record pages stay with a notice, and the PDF copies are taken off the site (#107).
- The policies are made precise against Japanese, EU and US law, after a review of every policy against the code. The Privacy Policy now says what an ORCID lookup returns, every purpose (OAI-PMH, the Internet Archive, IndexNow, the weekly checks), the address that OAI-PMH gives harvesters, Vercel's request logs, security, the basis and rights for people in the EU and the UK, and that requests cost nothing; the Japanese version matches it. The Takedown Policy covers the automatic comments, harvesters, putting material back, and requests to disclose who sent material. The Withdrawal Policy says what stays in the history and lets an author have their name taken off. The Terms limit the authors' responsibility to what they confirmed, make the operator liable for negligence where the Consumer Contract Act applies, and announce even an urgent change before it takes effect. The removal form takes requests about personal data. Changes that add a duty take effect on 2026-11-21 and are announced on the top page (#108).
- The policies take the worst case on four open legal questions. Sophaxis applies the APPI and the Consumer Contract Act as if its operator were a business operator under them. It treats records that reach GitHub, Vercel, ORCID and the Internet Archive as provided to a third party in a foreign country, gives the information Article 28 asks for, and asks each author's consent. From 2026-11-21 a work with more than one author is listed only after every other author confirms their own agreement. The Privacy Policy states that no EU or UK representative has been appointed, and a record of processing is kept in `docs/records-of-processing.md`. Leaks that the law requires to be reported are reported.

## 2026-11-06

- ROAR, the Registry of Open Access Repositories at the University of Southampton, lists Sophaxis after editorial review: <https://roar.eprints.org/27422/>. The README records the listing in both languages, and the table of registrations under review keeps the other four (#103).
- The contact page, under Sophaxis elsewhere, states that Sophaxis passed the editorial review of ROAR and links its record (#104).
- The top page states the ROAR listing too, with a link to the record. Registries that list Sophaxis itself after their own review are set in `site.json` (`listedIn`), and the build refuses an entry without a name, a description, an https address or a date (#105).
- FAIRsharing is dropped from the README, as not worth keeping. The table of registrations under review keeps DOAPR, PhilPapers and the Open Access Directory (#106).

## 2026-11-03

- Google Scholar takes a PDF named in `citation_pdf_url` only from the directory of the abstract page. Each PDF copy is therefore also served at `/abs/<file>`, and the tag points there. `citation_online_date` is the day the record was listed, as Scholar asks, not the date of the latest version (#99).
- The README records the request to PhilPapers to add Sophaxis to its Open Access Gateway (a request, not an addition) (#99).
- The README records the submission of a record to ROAR (under review, not a listing) (#100).
- The Disclaimer states the operator's own use: a hobby, as an extension of a personal reading shelf, which changes nothing in what is listed. Only authors submit; Sophaxis is not a business, publishes nothing, takes no rights, and shares copies only as each licence allows. The contact page and the README point to it (#101).
- The README opens with the OSF DOI of Sophaxis itself and a table of the registrations under review (DOAPR, FAIRsharing, PhilPapers, ROAR, the Open Access Directory), in both languages (#102).
- The top page shows the day the records last changed and how often they are updated, and an ISSN when one is set in `site.json` (#98).
- The draft record from the intake takes the language (#97) of the work from the DOI metadata, as ISO 639-3.
- The weekly watch reads how OpenAlex holds each work shown (the work, its abstract, its locations, a Sophaxis page among them, its citations), for information (#96).
- OAI-PMH follows the OpenAIRE guidelines (#95) for literature repositories where they apply: an `openaire` set with every record shown, and the language of each work (a new field `language`, ISO 639-3).
- The README records the FAIRsharing record (not yet reviewed) and the OAI-PMH validation (a validation, not a listing) (#93, #94).
- Identify gives an `adminEmail` for harvesters (#91, #92), an address made for this use.
- OAI-PMH 2.0 at `/oai` (#90), so that BASE, CORE, OpenDOAR, OpenAIRE and PhilPapers can harvest the records: Dublin Core, the fields as sets, selection by day, removed records kept as deleted. Each record gains `listed`, the day it was added, and may gain `updated`; the datestamp is the latest of these and the last change.
- A verified submission is given advice on its DOI metadata (#89) by deposit-check, pinned to a commit: a missing abstract, licence or keywords, for example. The advice does not decide the listing.

## 2026-11-02

- Six of the operator's own preprints are listed after moderation, as 2026.0003 to 2026.0008: three papers in philosophy and the three Trinity-Infinity papers in mathematics. Each record notes the author's errata (#78).
- PDF copies can be taken from Zenodo: its file endpoint refused a request that accepted only `application/pdf`. The PDF workflow reads the whole git history, as the checks need (#79).
- New and changed record pages and PDF copies are sent to IndexNow once they are live, for Bing and the other search engines that take it. Google reads the sitemap (#87).
- The weekly watch tries a save to the Internet Archive again on any answer other than success: the archive once answered 404 for a PDF copy that was served. Lookups of a published version are spaced, and one refused by Crossref with 429 is tried again (#88).
- The changelog cites every pull request of the day (#86).
- The PDFs of the six are copied from Zenodo: 2026.0003 (#80), 2026.0004 (#81), 2026.0005 (#82), 2026.0006 (#83), 2026.0007 (#84) and 2026.0008 (#85).
- The README records that a submission of the code to the Journal of Open Source Software (JOSS) is planned (#62).
- Zenodo and `CITATION.cff` metadata, ready for a release DOI later (#63).
- `CONTRIBUTING.md` and this changelog (#64).
- A draft of the JOSS paper, `paper/paper.md` and `paper/paper.bib` (#65).
- The weekly watch logs why a save to the Internet Archive failed, and looks up the latest copy of each address (#66).
- The published version of a listed preprint: a form for authors to report it, checked through ORCID and the DOI metadata; a notice at the top of the record page, with the peer review the authors state; a flag in the lists and search; a note in the citation files; counts on the statistics page; and a weekly search of Crossref and DataCite for a published version linked to a listed preprint, and for retraction and correction notices (#67).
- A record is dated by its last change, a published version included, in the sitemap, the author pages and the feed; the feed links the published version, and the draft JOSS paper describes the mechanism (#68).
- The README tells the moderator how to record a published version (#69).
- Saves to the Internet Archive are a minute apart, with two longer retries: the sixth save of a run could not connect, and one PDF copy had never been saved (#70).
- A record page says where its abstract came from: an abstract the authors gave in the submission issue, because the DOI metadata has none, is marked so (#71).

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
