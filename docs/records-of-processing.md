# Record of processing

Last updated: 2026-11-11.

This record follows Article 30 of the General Data Protection Regulation and the items that Japan's Act on the Protection of Personal Information asks to be made known. The [Privacy Policy](https://sophaxis.vercel.app/policies/privacy.html) is the public statement; this file lists the same processing in one place.

## Controller

Takuya Nemoto, operator of Sophaxis, Japan. Contact: the email address on the operator's ORCID record, https://orcid.org/0009-0000-1406-0547. No representative in the European Union or the United Kingdom has been appointed. The operator has decided not to appoint one, because a representative would be a paid service or a person who takes on liability for Sophaxis, which is run unpaid within free services; the operator answers people and authorities there directly. From 2026-11-22, Sophaxis does not list work by an author who lives in the European Union, the European Economic Area or the United Kingdom, and the operator considers that Article 3(2) of the GDPR and of the UK GDPR does not reach it; should that view be wrong, Sophaxis does not meet Article 27, because the processing is regular and not occasional. The decision is reviewed as the Privacy Policy sets out.

## Processing

| Purpose | People | Personal data | Source | Recipients | Retention |
| --- | --- | --- | --- | --- | --- |
| Confirm that a submitter, a co-author who confirms their agreement, a person who withdraws, or a person who reports a published version is an author | Submitters and co-authors | GitHub username; ORCID iD; name, websites and works from the public ORCID record | The issue; ORCID | GitHub (issue comments) | As long as the issue exists |
| From 2026-11-23, confirm that a researcher who vouches for a first submission is not an author of the work and has a journal article, a book chapter or a book | Researchers who vouch | GitHub username; ORCID iD; the comment; name, websites and works from the public ORCID record | The issue; ORCID | GitHub (issue comments) | As long as the issue exists |
| Help the moderator review a submission | Submitters and authors | The public parts of the submission: the issue, the DOI metadata and the abstract | The issue; DOI metadata | Anthropic, OpenAI and xAI (United States), given by hand to their language models Claude, ChatGPT and Grok | Given only while the submission is reviewed, never after a work is listed; what each provider keeps follows its own terms |
| Publish record pages, author pages, lists and search | Authors | Names, ORCID iDs, abstracts, statements on generative models, notes | DOI metadata (DataCite, Crossref, JaLC); the issues | Vercel (serving); the public | Without a time limit, so that citations do not break |
| Offer records for reuse | Authors | As above | The records | Readers of `feed.xml` and `papers.json`; OAI-PMH harvesters | As above; copies taken by others are outside Sophaxis's control |
| Preserve the pages and the PDF copies, for works whose authors consent to it in a separate box | Authors | As above | The site | The Internet Archive (United States) | As the Internet Archive keeps them; saves stop when any author withdraws the consent |
| Tell search engines what changed | None (addresses only) | None | The sitemap | IndexNow | Not kept |
| Check the listed DOIs and licences each week | Authors | DOIs and the metadata read with them | DataCite, Crossref, JaLC | GitHub (the run's log and summary) | As GitHub keeps the logs |
| Answer requests about records and personal data | Requesters | What the request contains | The issue or the email | Apple (iCloud Mail, United States), for email | As long as needed to answer and to show the answer |
| Act on removal requests by automatic steps: acknowledge, tell the authors, take exposed personal data offline at once, carry out the operator's decision | Requesters; authors | The Sophaxis id, the kind of request, GitHub usernames | The issues; the records | GitHub (issue comments, commits) | As long as the issues and the git history exist |
| Serve the site and find faults | Readers | IP address and request details | The request | Vercel (United States) | As Vercel keeps its logs |
| Answer questions, complaints, disputes and security reports | Those who write | What the message contains | The email or the issue | Apple (iCloud Mail, United States), for email | As long as needed to answer and to show the answer |
| Gather the Zenodo records of listed works in the Zenodo community https://zenodo.org/communities/sophaxis | Authors | Nothing is copied; as curator, the operator can view and edit the metadata and files of each record submitted to the community, including names and ORCID iDs | Zenodo (an author's submission to the community) | Zenodo (CERN, Switzerland) | As long as the record stays in the community |

## Lawful basis

Legitimate interest in checking authorship, in keeping a public scholarly record, in serving the site safely and in answering the people who write (GDPR Article 6(1)(f)). Records are kept for freedom of expression and information (Article 17(3)(a)). The transfer to the Internet Archive rests on explicit consent (Article 49(1)(a)), asked in a box of its own that may be left empty. Under Japanese law, each author's consent is asked for the provision to third parties and to third parties in a foreign country (Articles 27 and 28 of Japan's Act on the Protection of Personal Information): in the submission form, required from 2026-11-21, and until then in the submission issue before a work by an author other than the operator is listed.

## Transfers outside Japan and the European Union

GitHub, Vercel, ORCID, Crossref, Anthropic, OpenAI, xAI, Apple (for email) and the Internet Archive are in the United States; DataCite is in Germany. OpenAlex, also in the United States, is asked about a listed work by its DOI only, never about a person. Zenodo is run by CERN, in Switzerland. What each says about its own measures is linked from the Privacy Policy.

## Security

Every automatic step is listed at https://sophaxis.vercel.app/automation.html. No decision with legal or similarly significant effects on a person is made solely by automated means.

Records hold only information that is public already. The automatic checks keep nothing from an ORCID record except the name, the websites and the works, and run with the least permissions they need. Only the operator can change the records, except that the automatic step of the Takedown Policy takes the record page (its title, authors, abstract and PDF copy) offline when a removal issue reports exposure of personal data.

The operator does not use the curator's access in the Zenodo community to change the metadata or the files of any record; changes stay with the record's authors.
