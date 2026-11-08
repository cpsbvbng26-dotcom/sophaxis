# Privacy Policy

Last updated: 2026-11-08.

Japanese: [個人情報の取り扱いについて](./privacy.ja.html), which follows the headings of Japan's Act on the Protection of Personal Information.

## Who handles personal data

The operator of Sophaxis, Takuya Nemoto, handles it.
The operator's address is not published; it is given on request, without delay.
Sophaxis applies Japan's Act on the Protection of Personal Information in full, as if its operator were a business operator under that Act.

## Purposes

Personal data is used only for these purposes:

- to confirm that a person who submits, withdraws or reports a published version, or a co-author who confirms their agreement, is an author of the work;
- to publish record pages, author pages, the lists and the search;
- to offer the records for reuse in `feed.xml`, `papers.json` and the OAI-PMH interface at `/oai`;
- to check the listed DOIs and licences each week, and, for works whose authors consent to it, to save the pages and the PDF copies to the Internet Archive each week and when they change;
- to tell search engines which addresses are new, changed or removed;
- to answer requests to withdraw, correct or remove a record, and requests about personal data;
- to serve the site, and to find and fix faults from Vercel's request logs;
- to answer questions, complaints, disputes and security reports.

## The site

The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.
Its pages contain no code or tag that sends information about a reader to anyone else, so nothing falls under the rules of Japan's Telecommunications Business Act on sending users' information outside (Article 27-12).
The search page runs one script, served by Sophaxis itself.
It reads the list of records from Sophaxis and searches it in your browser, and it sends nothing anywhere.
No other page runs a script.

Each record page has share links to X, Bluesky, Facebook, LinkedIn and email.
They are plain links to each service's own page.
Nothing is sent anywhere until a reader follows one, and the service then works under its own privacy policy.

The site is hosted on Vercel.
Vercel processes each request, including the IP address, in order to serve the page, under its own privacy policy.
Sophaxis has not turned on Vercel's analytics.

## Submissions

Submissions are public GitHub issues and are subject to GitHub's terms.
Your GitHub username and everything you write in the form become public.

When a submission issue is opened or edited, a GitHub Action reads two kinds of public data.
It reads the metadata of the DOI from DataCite, Crossref or JaLC (Japan Link Center).
It reads the name, the websites and the works of the ORCID record given in the form.
It uses them only for the checks, and writes nothing else from the ORCID record anywhere.
The same check runs when a withdrawal issue or a published-version issue is opened or edited.
The check asks ORCID only for the personal details (the name), the websites and the works sections of the record.
It does not ask for the person section as a whole, so public email addresses and the country are never received.
The check uses only the name, the websites and the works, and keeps or writes nothing else from the ORCID record.
The automatic comment in a submission issue repeats the draft record, which is public already.
From 2026-11-21, a co-author who confirms their agreement in a comment gives their ORCID iD there, and the check reads their public ORCID record in the same way.

Giving an ORCID iD, and opening the issue from a GitHub account that the ORCID record links, are needed to submit, withdraw or report a published version.
Without them the check cannot confirm the author, and the request cannot go ahead by issue; it can still go by email, as each policy says.
Nothing else is asked of anyone.

## Records

A record holds the title, the names and ORCID iDs of the authors, the abstract, the licence, the DOIs and dates of the versions, and the statement on generative models.
Most of a record comes from the metadata of the deposit.
The statement on generative models, an abstract given in the form, a reason for withdrawal and notes on corrections come from the issues, where they are public already.
A record also gives the number of its submission issue, which shows the submitter's GitHub username.
Sophaxis keeps records without a time limit, so that citations do not break.
The issues, with the GitHub usernames in them, stay as long as GitHub keeps them; removing a record empties the issues that name it, and the operator then deletes them.
Vercel keeps its request logs for the period its service sets, and the operator does not copy them.
A removed record keeps only its Sophaxis id and the day of removal, as the [Takedown Policy](./takedown.html) sets out.
Earlier versions stay in the history of the public repository and in the saves of the Internet Archive; the operator asks GitHub and the Internet Archive to remove them.

## Reuse and copies elsewhere

The records are offered for reuse in `feed.xml`, `papers.json` and the OAI-PMH interface at `/oai`.
Harvesters, such as OpenAIRE, copy the title, the authors, the abstract and the licence from there.
The OAI-PMH interface gives an email address made for harvesters, because the protocol requires one.
Requests about personal data go to the address on the operator's ORCID record, as below.
The pages and the PDF copies of a work whose authors consent to it are saved to the Internet Archive.
Works deposited at Zenodo can also be gathered in the Sophaxis community at Zenodo, https://zenodo.org/communities/sophaxis.
An author submits the record there, and Zenodo, run by CERN in Switzerland, holds it.
Sophaxis copies nothing from the community, and the operator does not change the records in it.
A request to add the record of a work by an author who lives in a place where Sophaxis is not offered, as the Submission Policy lists them, or who stayed in one between the submission and the listing, is declined from 2026-11-22, because such a work is not listed on Sophaxis; the request itself stays with Zenodo, under CERN's own terms.
When a record changes, its address is sent to search engines through IndexNow; only the address is sent.
Copies that others have already taken are outside Sophaxis's control.

## Services outside Japan

Sophaxis uses these services outside Japan: GitHub (United States) to receive submissions and keep the records, Vercel (United States) to serve the site, DataCite (Germany) and Crossref (United States) for DOI metadata, ORCID (United States) for public ORCID records, and the Internet Archive (United States) to save the pages and the PDF copies. OpenAlex (United States) is asked how it holds a listed work, by its DOI only, never about a person. Anthropic, OpenAI and xAI (all United States) receive, while a submission is reviewed, its public parts (the issue, the DOI metadata and the abstract), which the operator gives by hand to their language models, Claude, ChatGPT and Grok, to help the review; nothing is given to them after a work is listed.
Sophaxis treats the personal data in records that reaches GitHub, Vercel, ORCID and the Internet Archive as provided to a third party in a foreign country, under Article 28 of Japan's Act on the Protection of Personal Information.
The submission form asks for each author's consent to this, after giving the information below; the confirmation is required from 2026-11-21.
Until then, the operator lists a work by an author other than the operator only after every author has given this consent in the submission issue.
Consent to the Internet Archive is asked in a box of its own, which may be left empty; a record without it is not saved there, and `robots.txt` asks the Internet Archive not to collect it.
Any author can withdraw either consent at any time, by a removal issue or by email, and what was done before the withdrawal stays lawful.
Withdrawing the consent to the Internet Archive stops the saves without review, once the operator confirms that the request comes from an author; the operator then asks the Internet Archive to exclude the earlier copies.
Withdrawing the consent to GitHub, Vercel and ORCID removes the record, because Sophaxis cannot list a work without them.

The countries:

- The United States has no general federal law on personal data; some states have their own laws. There is no single authority for personal data across the country, and the rights a person has over their data depend on the state and the sector.
- Germany is in the European Union, where the General Data Protection Regulation applies.
- Japan's Personal Information Protection Commission publishes information on the systems of other countries.

What each service does to protect personal data is set out in its own statement:

- GitHub: [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). GitHub says it complies with the EU-U.S. Data Privacy Framework.
- Vercel: [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice). Vercel says it complies with the EU-U.S. Data Privacy Framework.
- ORCID: [ORCID Privacy Policy](https://info.orcid.org/privacy-policy/). ORCID says its practices are assessed each year against the EU-U.S. Data Privacy Framework.

For GitHub, Vercel and ORCID, a transfer from the European Union rests on the European Commission's adequacy decision for the EU-U.S. Data Privacy Framework, as far as each is certified under it.

- Crossref: [Crossref privacy](https://www.crossref.org/operations-and-sustainability/privacy/).
- The Internet Archive: [Terms of Use](https://archive.org/about/terms). It receives only the public pages and PDF copies, which hold no personal data beyond what the records already publish. Sophaxis cannot give information on the measures the Internet Archive takes to protect personal data: its terms can be read only with a script running, and no other statement of those measures was found.

Requests sent by email reach the operator's mailbox at Apple (iCloud Mail, United States), and are kept there only as long as needed to answer them and to show the answer.
What Apple says about its own measures is in the [Apple Privacy Policy](https://www.apple.com/legal/privacy/).
A person in the European Union who writes reaches the operator in Japan, for which the European Commission has made an adequacy decision, and the mailbox at Apple in the United States; Apple says that its international transfers of personal data collected in the European Economic Area, the United Kingdom and Switzerland are governed by Standard Contractual Clauses.

Vercel keeps request logs for Sophaxis, including the IP address.
The operator can see them, and uses them only to find and fix faults.

Apple, for the mailbox, and Vercel, for its request logs, handle personal data for Sophaxis, and neither is bound by contract not to handle it.
As the Personal Information Protection Commission's Q&A 7-53 reads Japan's Act, Sophaxis therefore treats both as entrusted with that handling, and supervises them under Article 25 of the Act.
Each publishes the measures it takes: Vercel in Schedule 2 of its [Data Processing Addendum](https://vercel.com/legal/dpa), Apple in its Privacy Policy.
Each week, an automatic step reads the date of the last update of Vercel's and Apple's privacy statements; a new date opens an issue, and the operator reads the statement again and decides whether the service can still be used.

## Security

Records are built only from information that is public already.
The automatic checks keep nothing from an ORCID record except the name, the websites and the works.
The automatic checks run with the least permissions they need.
Only the operator can change the records, except that the automatic step of the [Takedown Policy](./takedown.html) takes the record page (its title, authors, abstract and PDF copy) offline when a removal issue reports exposure of personal data.
If personal data leaks in a way that the law requires to be reported, the operator reports it to Japan's Personal Information Protection Commission and tells the people concerned.
A leak must be reported when it involves sensitive personal information, data whose misuse could cause financial loss, data leaked through an act done for an improper purpose, such as an attack on the operator's accounts, or the data of more than 1,000 people.
The operator reports promptly after learning of it, and gives the full report within 30 days, or within 60 days when the leak may come from an act done for an improper purpose.

The measures, under the headings that Japan's Personal Information Protection Commission uses:

- Organisation: one person, the operator, handles personal data and answers for it. Every change to the records is a public commit or pull request.
- People: no one else handles personal data for Sophaxis. Before a moderator is invited, the operator writes here what personal data a moderator may handle and how the operator supervises it.
- Physical: Sophaxis has no servers or papers of its own. The records live in the GitHub repository and the site on Vercel.
- Technical: the automatic steps hold no key but the token GitHub gives each run, with the least permissions they need. Earlier versions of the site on Vercel are not open to the public. The operator's GitHub account, the only one that can change the repository, uses two-factor authentication. The operator signs in to Vercel, which serves the site, through that GitHub account.
- The countries where data is kept: as set out under "Services outside Japan" above.

## Automated processing

The automatic checks compare public records and post the result in the issue. They make no decision about a person.
No decision with legal or similarly significant effects on a person is made solely by automated means.
The language models that help the review make no decision; every decision on a submission is taken by a person, as the Moderation Policy sets out.
One step acts before the operator decides: when a removal issue reports exposure of personal data, it takes the record page (its title, authors, abstract and PDF copy) offline. It protects the person concerned, and is undone if the request is not upheld.
Every automatic step is listed on the page [What runs by itself](../automation.html).

## Your choices

An author can withdraw a work, have its record removed so that only the Sophaxis id stays, or ask for the PDF copy to be removed.
A person whose personal data appears in a record can ask for its removal under the [Takedown Policy](./takedown.html).
A person can ask for access to, correction of, suspension of the use of, or deletion of their personal data held by Sophaxis, through a removal issue that names only the Sophaxis id and the kind of request, or by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
A person can also ask to be told the purposes for which their data is used, to have its use restricted while its accuracy or an objection is checked, and to have its provision to third parties stopped.
While a restriction lasts, the operator takes the part concerned offline.
The submission issue, with its consent, and the history of the record in the public repository are the record of provision to third parties (Article 29 of Japan's Act on the Protection of Personal Information); a person can ask to see what concerns them.
A person whose data is not in a record, such as a GitHub username in an issue or an IP address in Vercel's logs, writes by email.
Before answering a request about personal data, the operator confirms who is asking, through the ORCID record or by email.
A request can also be made through an agent, such as a parent or guardian or a person the requester appoints; the operator then confirms the agent's authority as well as the person's identity.
A copy of personal data is sent by email, in a commonly used electronic form, or by another method the person asks for, and never in an issue.
The operator aims to answer within 7 days.
A request about personal data is answered within one month at the latest.
If a request needs more time, the operator says so within that month, with the reasons, and answers within three months of the request.
When the operator does not act on a request about personal data, it says why within one month.
It also says that the person can complain to a data protection authority and can go to court.
On request, the operator tells a person which recipients were told of a correction, a removal or a restriction of their data.
Requests cost nothing.
A complaint about how personal data is handled goes to the same email address.
A person can also consult Japan's [Personal Information Protection Commission](https://www.ppc.go.jp/).
A person in Switzerland can also complain to the Federal Data Protection and Information Commissioner.

These rights are open to everyone, wherever they live.
Where a person's own law gives them more rights over their personal data, such as the General Data Protection Regulation in the European Union, the operator honours those rights as far as they apply to Sophaxis.
Personal data that GitHub or Vercel hold about their own users, such as GitHub accounts, is theirs to handle under their own privacy statements; a request about it goes to them.

## The right to object

Anyone can object, at any time, to the use of their personal data on Sophaxis, on grounds of their own situation.
An objection goes by a removal issue or by email.
After an objection, the operator stops the use objected to, unless it shows compelling legitimate grounds that override the person's interests, rights and freedoms, or the data is needed for legal claims.
The operator gives those grounds in writing.

## People in the European Union and the United Kingdom

From 2026-11-22, Sophaxis does not offer its service to people in the European Union, the European Economic Area or the United Kingdom.
It does not list work by an author who lives there, or who stays there between the submission and the listing, even briefly, and the submission form asks the submitter to confirm it.
This depends only on where an author lives or stays, not on nationality, race, ethnic origin or any other personal characteristic.
Anyone can read the site, but Sophaxis does not direct itself to people there.
The operator therefore considers that the General Data Protection Regulation and the UK GDPR do not reach Sophaxis under Article 3(2).
The rights in this section are honoured all the same, as far as they apply.
For people in the European Union and the United Kingdom, the basis for this use is a legitimate interest: checking who the authors are, keeping a public scholarly record, serving the site safely, and answering the people who write.
Records are kept to preserve the scholarly record, for freedom of expression and information (Article 17(3)(a)).
Where a transfer outside the European Union has no adequacy decision or other safeguard, as for the Internet Archive, it rests on the author's explicit consent (Article 49(1)(a)).
The possible risks of that transfer, of which the consent is given knowing: Sophaxis knows of no adequacy decision or other safeguard that covers the Internet Archive, so personal data saved there may be protected less than under the General Data Protection Regulation, and a person may find it harder to enforce their rights there.
That consent is asked in a box of its own and can be withdrawn at any time, by a removal issue or by email; the saves to the Internet Archive then stop without review, and what was done before stays lawful.
A person can also ask to receive the personal data they gave in a structured, commonly used and machine-readable form (Article 20); `papers.json` and the OAI-PMH interface already give every record in that form.
A person can object to the use of their personal data, as set out under "The right to object" above, and can complain to the data protection authority of their country.
Sophaxis has not appointed a representative in the European Union or the United Kingdom (Article 27).
The operator has decided not to appoint one.
A representative would be a paid service, or a person in the European Union or the United Kingdom who takes on liability for Sophaxis, and Sophaxis is run unpaid within free services.
Should the view above on Article 3(2) be wrong, Sophaxis does not meet Article 27, because it has no representative there; the processing is regular, so the exception for occasional processing does not apply.
The operator reviews this decision when Sophaxis first lists a work by an author other than the operator, and whenever a data protection authority or a person in the European Union or the United Kingdom asks for a representative.
Each review and its outcome are recorded in the public repository.
A review weighs two ways forward: appointing a representative, or running Sophaxis through a legal entity.
A legal entity established in Japan would not by itself settle the question of a representative; only an establishment in the European Union or the United Kingdom would, and the General Data Protection Regulation would then apply to that establishment in full.
Whatever form Sophaxis takes, it charges nothing, to authors or to readers.
People there write to the operator directly, in English or Japanese, at the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
The operator answers them, and the data protection authorities, directly, in place of a representative.
A record of the processing is kept in the public repository, in `docs/records-of-processing.md`.

## People in China

From 2026-11-22, Sophaxis does not offer its service to people in China either.
Article 53 of China's Personal Information Protection Law requires a processor abroad that offers products or services to people in China to set up an agency or designate a representative in China, and Sophaxis has none.
This depends only on where a person lives or stays, not on nationality, race, ethnic origin or any other personal characteristic.
The rights in "Your choices" are honoured all the same, as far as they apply.

## People in Thailand

From 2026-11-22, Sophaxis does not offer its service to people in Thailand either.
Section 37(5) of Thailand's Personal Data Protection Act requires a controller abroad that offers goods or services to people in Thailand to designate in writing a representative in Thailand, and Sophaxis has none.
Section 38 exempts a controller that engages in the profession or business of processing personal data without a large amount of it; Sophaxis is not a business, so the exemption is not relied on.
This depends only on where a person lives or stays, not on nationality, race, ethnic origin or any other personal characteristic.
The rights in "Your choices" are honoured all the same, as far as they apply.

## People in the other places

From 2026-11-22, Sophaxis does not offer its service to people in the other places that the [Submission Policy](./submission.html) lists either.
Their laws require, or are reported to require, a representative there, the storage of personal data there, registration there, or conditions before personal data leaves the place, and Sophaxis meets none of these.
A place is listed as soon as such a duty is reported, and taken off only after its law has been read at its source.
Russia's Federal Law No. 152-FZ also reaches the data of Russian citizens who live elsewhere, when they consent to its processing (Article 1(1.1)); Sophaxis decides by where a person lives or stays and does not ask about citizenship, so this reach is not covered, and the operator reviews the decision if a Russian authority raises it.
From 2026-11-22, Sophaxis does not list work by an author under 18 who lives or stays in India.
From 2027-05-13, Rule 10 of India's Digital Personal Data Protection Rules, 2025 lets the data of a person under 18 be processed only with the verifiable consent of a parent, and Sophaxis does not verify that consent.
This depends only on where a person lives or stays, not on nationality, race, ethnic origin or any other personal characteristic.
The rights in "Your choices" are honoured all the same, as far as they apply.

## Changes to this policy

When this policy changes, the date at the top changes.
Earlier versions stay in the public repository.
