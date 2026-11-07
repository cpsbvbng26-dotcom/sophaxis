# Record of processing

Last updated: 2026-11-07.

This record follows Article 30 of the General Data Protection Regulation and the items that Japan's Act on the Protection of Personal Information asks to be made known. The [Privacy Policy](https://sophaxis.vercel.app/policies/privacy.html) is the public statement; this file lists the same processing in one place.

## Controller

Takuya Nemoto, operator of Sophaxis, Japan. Contact: the email address on the operator's ORCID record, https://orcid.org/0009-0000-1406-0547. No representative in the European Union or the United Kingdom has been appointed.

## Processing

| Purpose | People | Personal data | Source | Recipients | Retention |
| --- | --- | --- | --- | --- | --- |
| Confirm that a submitter, a co-author who confirms their agreement, a person who withdraws, or a person who reports a published version is an author | Submitters and co-authors | GitHub username; ORCID iD; name, websites and works from the public ORCID record | The issue; ORCID | GitHub (issue comments) | As long as the issue exists |
| Publish record pages, author pages, lists and search | Authors | Names, ORCID iDs, abstracts, statements on generative models, notes | DOI metadata (DataCite, Crossref, JaLC); the issues | Vercel (serving); the public | Without a time limit, so that citations do not break |
| Offer records for reuse | Authors | As above | The records | Readers of `feed.xml` and `papers.json`; OAI-PMH harvesters | As above; copies taken by others are outside Sophaxis's control |
| Preserve the pages and the PDF copies | Authors | As above | The site | The Internet Archive (United States) | As the Internet Archive keeps them |
| Tell search engines what changed | None (addresses only) | None | The sitemap | IndexNow | Not kept |
| Check the listed DOIs and licences each week | Authors | DOIs and the metadata read with them | DataCite, Crossref, JaLC | GitHub (the run's log and summary) | As GitHub keeps the logs |
| Answer requests about records and personal data | Requesters | What the request contains | The issue or the email | Apple (iCloud Mail, United States), for email | As long as needed to answer and to show the answer |
| Act on removal requests by automatic steps: acknowledge, tell the authors, take exposed personal data offline at once, carry out the operator's decision | Requesters; authors | The Sophaxis id, the kind of request, GitHub usernames | The issues; the records | GitHub (issue comments, commits) | As long as the issues and the git history exist |
| Serve the site and find faults | Readers | IP address and request details | The request | Vercel (United States) | As Vercel keeps its logs |

## Lawful basis

Legitimate interest in checking authorship and in keeping a public scholarly record (GDPR Article 6(1)(f)). Records are kept under Article 17(3). Under Japanese law, each author's consent is asked for the provision to third parties and to third parties in a foreign country (Articles 27 and 28 of the Act).

## Transfers outside Japan and the European Union

GitHub, Vercel, ORCID, Crossref and the Internet Archive are in the United States; DataCite is in Germany. What each says about its own measures is linked from the Privacy Policy.

## Security

Every automatic step is listed at https://sophaxis.vercel.app/automation.html. No decision with legal or similarly significant effects on a person is made solely by automated means.

Records hold only information that is public already. The automatic checks keep nothing from an ORCID record except the name, the websites and the works, and run with the least permissions they need. Only the operator can change the records, except that the automatic step of the Takedown Policy takes an abstract and a PDF copy offline when a removal issue reports exposure of personal data.
