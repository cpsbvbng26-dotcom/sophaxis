# Changelog

The notable changes to Sophaxis, newest first. Each entry names the pull request that made it.
The entries are grouped by the date of the merge. Version 1.0.0 was released on 2026-11-07 and archived at Zenodo (10.5281/zenodo.24033372; every version: 10.5281/zenodo.24033371).

## 2026-11-08

- The legal review is written down as logic. `docs/legal-review.md` gives the method, the laws, what a consistency review found and the risks ranked; `verification/legal-matrix.json` holds each law as conjunctions joined by OR, and a check confirms that a sentence in the policies denies one element of every conjunction or meets every duty, that all 42 pairs of actor and act are covered, and that the risks multiply and rank correctly. The fixes: the hold on a removal request is told as the whole record page everywhere, as the code does; removal is also at an author's request and takes the PDF copy; the Japanese Privacy Policy matches the English, which governs; changes follow Civil Code Article 548-4, and silence or continued use is no longer taken as agreement; a co-author who never agreed to the Terms is bound only as the law makes them so; people in the EU and the UK can withdraw consent and receive their data in a machine-readable form, and the Policy says why Article 27(2)(a) is considered to apply; the information before consent says more about the United States and the Internet Archive; who asks is confirmed before a request about personal data is answered; form text from before 2026-11-21 has a stated permission; OpenAlex is among the services outside Japan; the authors are not told of a request about one's own data; the Submission Policy names the age of 13. Once a week, the 24 articles of Japanese law and the two GitHub terms that the review relies on are fetched and compared with their recorded values, and a difference opens an issue.

## 2026-11-07

- The workflows use `actions/checkout` and `actions/setup-node` v7, which run on Node.js 24, instead of v4, which GitHub has deprecated with Node.js 20. Dependabot watches their versions monthly, and a check keeps every one at v5 or later (#137).
- OAI-PMH also gives `oai_openaire`, the profile of the OpenAIRE Guidelines for Literature Repositories v4: each record as an open access preprint, its record page as identifier, identical to the DOI of the deposited work, with the PDF copy as its full text and the ORCID iD of each author. Every listed record validates against the guidelines' schema 4.0, and a check pins the mandatory fields. (#136)
- The scope examples name self-help or spiritual guidance that gives advice instead of arguing a philosophical question, and a political manifesto or campaign, instead of any work so titled. Commits made by the workflows no longer name a model as co-author; they carry only the Sophaxis-Action line. (#135)
- A strict legal review. Liability is now that of Japanese law for intent and negligence, with no clause that only the law's limits would save; the operator is not liable for loss caused only by a listed work, GitHub, Vercel or a repository. The identity check no longer asks ORCID for the person section, so public email addresses and the country are never received. The submission form has a "Consent and agreement" part (consent to publication and to the services in the United States, agreement to the policies in their version of the day, and age), checked by the intake from 2026-11-21; until then a work by another author is listed only after that consent is given in the issue. A licence is accepted only when every entry in the metadata is the same accepted licence. The policies say that a removal request under review takes the whole record page offline, as the code does, and that material is removed on a request only after the authors are asked and 7 days pass without objection, except for serious harm. A record put back takes the day as its update, so that harvesters pick it up. The agreement on the court applies only to people who agreed in a form, and is not exclusive. A check fails if a work by another author is listed without a recorded review of the decision on an EU or UK representative. (#134)
- The code is cited by its Zenodo DOIs: version 1.0.0 (10.5281/zenodo.24033372) and every version (10.5281/zenodo.24033371), beside the OSF project DOI, in CITATION.cff, the README and the contact page (#122).
- Removal requests are handled at once and decided by the operator. A removal issue is acknowledged automatically with the day the answer is due, and the authors are told. A report of exposed personal data takes the abstract and the PDF copy offline at once. The operator's label `upheld` or `not-upheld` then removes the record, or puts back what was taken offline. A reminder goes to requests near the 7 days. From 2026-11-21 the submission check counts each co-author's own confirmation (#110).
- A removed record leaves no trace beyond the fact. Its page says only that the record with that id was removed, with no reason and no date, and the record keeps only the id and the day that OAI-PMH needs. Every automatic comment about it is deleted, and the issues that name it are emptied, closed and locked for the owner to delete. Earlier versions of the site on Vercel are no longer open to the public (#111).
- The Disclaimer says who runs Sophaxis and why. The operator, at present also the only moderator, runs it as an unpaid volunteer, only within the free services of GitHub and Vercel, without lessening any duty under the Terms or the Privacy Policy. It began because the operator found no one place that lists open preprints in philosophy and in mathematics side by side; it is kept for the operator's own reading and for others who work on the same questions, and it judges no other archive. The README and the contact page say the same (#112).
- The pages that say who runs Sophaxis now also say that the operator pays personally for Claude Code, with which the site is written; only the serving is within free services. The Japanese README says that there is no fee to submit or to read, instead of no cost (#113).
- Naming Claude Code is a disclosure, not an advertisement. The footer of every page says so, and the Disclaimer adds that the operator is an ordinary paying user, that Sophaxis has no arrangement with Anthropic and receives nothing from it, and that it does not link to Anthropic's products. A check keeps every page free of such links (#114).
- 2026.0006, 2026.0007 and 2026.0008 are removed at their author's request. Each page now says only that the record with that id was removed, the records keep only the id and the day, and their submission issues are emptied, closed and locked (#115).
- An author can have a record removed, not only withdrawn: the withdrawal form asks which, the same check confirms the author, and the operator's label `upheld` on the verified issue removes the record. The Takedown Policy sets out in one section exactly what a removed record leaves, whatever the reason: on the site, in the records and the OAI-PMH interface, in the issues, and outside the site. The Withdrawal, Submission and Privacy Policies (in both languages) say the same (#116).
- Indexing runs by itself on every change. IndexNow is told of the record pages and PDF copies that are new, changed or gone (a removed record, a PDF copy taken off), and the new and changed ones are saved to the Internet Archive at once. The removal workflow does the same after it pushes, since a push made by a workflow starts no other workflow. The IndexNow workflow can also be run by hand against an earlier commit (#117).
- A new page, What runs by itself, lists every automatic step: when it runs, what it reads and writes, and what it leaves to the operator. Every page links it from the footer, the README points to it in both languages, and a check keeps it naming every script a workflow runs and the true times of the schedules. The Privacy Policy, in both languages, adds automated processing (no significant decision is made solely by automated means), the mailbox at Apple where email requests arrive, and the security measures under the headings of Japan's Personal Information Protection Commission. The Takedown Policy follows the EU Digital Services Act: a point of contact, notices, reasons, a free challenge within six months, and the courts. Every decision note gives the grounds and says how to challenge it (#118).
- The Privacy Policy, in both languages, the Takedown Policy and the record of processing state that the operator has decided not to appoint a representative in the EU or the UK, and why: a representative would be a paid service or a person who takes on liability for Sophaxis, which is run unpaid within free services. People and authorities there write to the operator directly, who answers in place of a representative (#119).
- Commitments are never dropped silently. `verification/commitments.txt` lists every commitment word for word; the check fails if one leaves the policies or the list, unless `verification/superseded.txt` names its replacement, and a line the list ever held can leave it no other way. The policy index and CONTRIBUTING.md say so. The Privacy Policy, in both languages, adds what must be given to submit and what happens without it, co-authors who confirm, that the pages send nothing about readers elsewhere (Japan's rules on external transmission), transfers that rest on explicit consent (GDPR Article 49(1)(a)), consulting Japan's Personal Information Protection Commission, and the saves and notices on removal. A check keeps every page from loading or sending anything to another host (#120).
- `robots.txt` asks the Internet Archive's crawlers not to collect any removed record, its page or its PDF copies, and is built from the records. Every other crawler may still read everything, so that search engines see the removal notice (#121).
- Version 1.0.0 is released on GitHub and archived at Zenodo. `CITATION.cff`, the README in both languages and the contact page give its DOI and the DOI of every version.
- Three records (2026.0006, 2026.0007, 2026.0008) are withdrawn by their author under the Withdrawal Policy, and the PDF copies are taken off the site (#107).
- The policies are made precise against Japanese, EU and US law, after a review of every policy against the code. The Privacy Policy now says what an ORCID lookup returns, every purpose (OAI-PMH, the Internet Archive, IndexNow, the weekly checks), the address that OAI-PMH gives harvesters, Vercel's request logs, security, the basis and rights for people in the EU and the UK, and that requests cost nothing; the Japanese version matches it. The Takedown Policy covers the automatic comments, harvesters, putting material back, and requests to disclose who sent material. The Withdrawal Policy says what stays in the history and lets an author have their name taken off. The Terms limit the authors' responsibility to what they confirmed, make the operator liable for negligence where the Consumer Contract Act applies, and announce even an urgent change before it takes effect. The removal form takes requests about personal data. Changes that add a duty take effect on 2026-11-21 and are announced on the top page (#108).
- The policies take the worst case on four open legal questions. Sophaxis applies the APPI and the Consumer Contract Act as if its operator were a business operator under them. It treats records that reach GitHub, Vercel, ORCID and the Internet Archive as provided to a third party in a foreign country, gives the information Article 28 asks for, and asks each author's consent. From 2026-11-21 a work with more than one author is listed only after every other author confirms their own agreement. The Privacy Policy states that no EU or UK representative has been appointed, and a record of processing is kept in `docs/records-of-processing.md`. Leaks that the law requires to be reported are reported (#109).

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

- Six of the operator's own preprints are listed after moderation, as 2026.0003 to 2026.0008: three papers in philosophy and three in mathematics. Each record notes the author's errata (#78).
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
