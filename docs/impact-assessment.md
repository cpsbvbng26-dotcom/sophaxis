# Assessment of the risks to people's data

Last updated: 2026-11-11.

This is the operator's own assessment of the risks that the processing in the [record of processing](records-of-processing.md) poses to the people whose data it is. It follows the shape of a data protection impact assessment, but no supervisory authority has reviewed it, and it is not legal advice. The [Privacy Policy](https://sophaxis.vercel.app/policies/privacy.html) is the public statement and governs.

## Method

Each risk is a harm to a person, not to Sophaxis. Its likelihood and its severity are each scored from 1 (low) to 3 (high), and the risk is their product. The table is sorted by the product, highest first. A measure is listed only if it is in place now and stated in the policies or the code.

## Risks

| No. | Risk to a person | Likelihood | Severity | Product | Measures in place |
| --- | --- | --- | --- | --- | --- |
| 1 | A removal request written in a public issue makes the sensitive matter it is about more visible | 2 | 2 | 4 | The removal form says to send such a request by email instead; when an issue reports exposure of personal data, the record page is taken offline at once; the operator can empty and delete the issue |
| 2 | Copies in the Internet Archive outlive the removal of a record | 2 | 2 | 4 | Saving needs a separate consent from every author, which may be left empty; on removal, `robots.txt` asks the Internet Archive not to collect again, and the operator asks it to exclude the earlier copies |
| 3 | A submitter's GitHub username, ORCID iD and name are linked in public | 3 | 1 | 3 | The form says the issue is public before anything is written; only the name, the websites and the works are read from the ORCID record |
| 4 | A submitted work exposes personal data of a third party | 1 | 3 | 3 | The submitter confirms there is none; moderation declines such a work; the automatic step of the Takedown Policy takes the page offline when exposure is reported |
| 5 | The repository or the records are altered through the operator's account | 1 | 3 | 3 | The operator's GitHub account, the only one that can change the repository, uses two-factor authentication; the automatic steps hold only the token of each run, with the least permissions they need |
| 6 | The public parts of a submission reach the providers of language models | 3 | 1 | 3 | Only what is already public is given, by hand, to help the review; each author consents in the form; no model decides |
| 7 | Readers' IP addresses are kept in the logs of the host | 3 | 1 | 3 | The site sets no cookies and runs no analytics; Vercel's analytics are not turned on |
| 8 | Data from an ORCID record other than the name, the websites and the works is copied into an issue | 1 | 2 | 2 | The automatic check reads only those three, and its comment shows nothing else |
| 9 | A message sent by email stays in the operator's mailbox longer than needed | 1 | 2 | 2 | Messages are kept only as long as needed to answer and to show the answer |

## Review

The table is read again at the yearly audit, and whenever a new kind of processing begins. A new kind of processing is added to the record of processing and to this table before it begins.
