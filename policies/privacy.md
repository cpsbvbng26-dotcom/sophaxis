# Privacy Policy

Last updated: 2026-11-07.

Japanese: [個人情報の取り扱いについて](./privacy.ja.html), which follows the headings of Japan's Act on the Protection of Personal Information.

## Who handles personal data

The operator of Sophaxis, Takuya Nemoto, handles it.
The operator's address is not published; it is given on request, without delay.
Sophaxis applies Japan's Act on the Protection of Personal Information in full, as if its operator were a business operator under that Act.

## Purposes

Personal data is used only for these purposes:

- to confirm that a person who submits, withdraws or reports a published version is an author of the work;
- to publish record pages, author pages, the lists and the search;
- to offer the records for reuse in `feed.xml`, `papers.json` and the OAI-PMH interface at `/oai`;
- to check the listed DOIs and licences each week, and to save the pages and the PDF copies to the Internet Archive;
- to tell search engines which addresses are new or changed;
- to answer requests to withdraw, correct or remove a record, and requests about personal data.

## The site

The Sophaxis site sets no cookies, runs no analytics and loads nothing from other servers.
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
The check asks ORCID for the person section and the works section of the record.
ORCID returns everything that is public there, which can include public email addresses and the country.
The check uses only the name, the websites and the works, and keeps or writes nothing else from the ORCID record.
The automatic comment in a submission issue repeats the draft record, which is public already.

## Records

A record holds the title, the names and ORCID iDs of the authors, the abstract, the licence, the DOIs and dates of the versions, and the statement on generative models.
Most of a record comes from the metadata of the deposit.
The statement on generative models, an abstract given in the form, a reason for withdrawal and notes on corrections come from the issues, where they are public already.
A record also gives the number of its submission issue, which shows the submitter's GitHub username.
Sophaxis keeps records without a time limit, so that citations do not break.
A removed record keeps only its Sophaxis id and the day of removal, as the [Takedown Policy](./takedown.html) sets out.

## Reuse and copies elsewhere

The records are offered for reuse in `feed.xml`, `papers.json` and the OAI-PMH interface at `/oai`.
Harvesters, such as OpenAIRE, copy the title, the authors, the abstract and the licence from there.
The OAI-PMH interface gives an email address made for harvesters, because the protocol requires one.
Requests about personal data go to the address on the operator's ORCID record, as below.
The pages and the PDF copies are saved to the Internet Archive.
When a record changes, its address is sent to search engines through IndexNow; only the address is sent.
Copies that others have already taken are outside Sophaxis's control.

## Services outside Japan

Sophaxis uses these services outside Japan: GitHub (United States) to receive submissions and keep the records, Vercel (United States) to serve the site, DataCite (Germany) and Crossref (United States) for DOI metadata, ORCID (United States) for public ORCID records, and the Internet Archive (United States) to save the pages and the PDF copies.
Sophaxis treats the personal data in records that reaches GitHub, Vercel, ORCID and the Internet Archive as provided to a third party in a foreign country, under Article 28 of Japan's Act on the Protection of Personal Information.
It asks for each author's consent to this, after giving the information below.

The countries:

- The United States has no general federal law on personal data; some states have their own laws.
- Germany is in the European Union, where the General Data Protection Regulation applies.
- Japan's Personal Information Protection Commission publishes information on the systems of other countries.

What each service does to protect personal data is set out in its own statement:

- GitHub: [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). GitHub says it complies with the EU-U.S. Data Privacy Framework.
- Vercel: [Vercel Privacy Notice](https://vercel.com/legal/privacy-notice). Vercel says it complies with the EU-U.S. Data Privacy Framework.
- ORCID: [ORCID Privacy Policy](https://info.orcid.org/privacy-policy/). ORCID says its practices are assessed each year against the EU-U.S. Data Privacy Framework.
- Crossref: [Crossref privacy](https://www.crossref.org/operations-and-sustainability/privacy/).
- The Internet Archive: [Terms of Use](https://archive.org/about/terms).

Requests sent by email reach the operator's mailbox at Apple (iCloud Mail, United States), and are kept there only as long as needed to answer them and to show the answer.
What Apple says about its own measures is in the [Apple Privacy Policy](https://www.apple.com/legal/privacy/).

Vercel keeps request logs for Sophaxis, including the IP address.
The operator can see them, and uses them only to find and fix faults.

## Security

Records are built only from information that is public already.
The automatic checks keep nothing from an ORCID record except the name, the websites and the works.
The automatic checks run with the least permissions they need.
Only the operator can change the records, except that the automatic step of the [Takedown Policy](./takedown.html) takes an abstract and a PDF copy offline when a removal issue reports exposure of personal data.
If personal data leaks in a way that the law requires to be reported, the operator reports it to Japan's Personal Information Protection Commission and tells the people concerned.

The measures, under the headings that Japan's Personal Information Protection Commission uses:

- Organisation: one person, the operator, handles personal data and answers for it. Every change to the records is a public commit or pull request.
- People: no one else handles personal data for Sophaxis.
- Physical: Sophaxis has no servers or papers of its own. The records live in the GitHub repository and the site on Vercel.
- Technical: the automatic steps hold no key but the token GitHub gives each run, with the least permissions they need. Earlier versions of the site on Vercel are not open to the public.
- The countries where data is kept: as set out under "Services outside Japan" above.

## Automated processing

The automatic checks compare public records and post the result in the issue. They make no decision about a person.
No decision with legal or similarly significant effects on a person is made solely by automated means.
One step acts before the operator decides: when a removal issue reports exposure of personal data, it takes the abstract and the PDF copy offline. It protects the person concerned, and is undone if the request is not upheld.
Every automatic step is listed on the page [What runs by itself](../automation.html).

## Your choices

An author can withdraw a work, have its record removed so that only the Sophaxis id stays, or ask for the PDF copy to be removed.
A person whose personal data appears in a record can ask for its removal under the [Takedown Policy](./takedown.html).
A person can ask for access to, correction of, suspension of the use of, or deletion of their personal data held by Sophaxis, through a removal issue that names only the Sophaxis id and the kind of request, or by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
The operator aims to answer within 7 days.
Requests cost nothing.
A complaint about how personal data is handled goes to the same email address.

These rights are open to everyone, wherever they live.
Where a person's own law gives them more rights over their personal data, such as the General Data Protection Regulation in the European Union, the operator honours those rights as far as they apply to Sophaxis.
Personal data that GitHub or Vercel hold about their own users, such as GitHub accounts, is theirs to handle under their own privacy statements; a request about it goes to them.

## People in the European Union and the United Kingdom

For people in the European Union and the United Kingdom, the basis for this use is a legitimate interest: checking who the authors are, and keeping a public scholarly record.
Records are kept to preserve the scholarly record, as the General Data Protection Regulation allows for archiving, research and freedom of expression (Article 17(3)).
A person can object to the use of their personal data, and can complain to the data protection authority of their country.
An objection is handled through the [Takedown Policy](./takedown.html).
Sophaxis has not appointed a representative in the European Union or the United Kingdom (Article 27).
The operator has decided not to appoint one.
A representative would be a paid service, or a person in the European Union or the United Kingdom who takes on liability for Sophaxis, and Sophaxis is run unpaid within free services.
People there write to the operator directly, in English or Japanese, at the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
The operator answers them, and the data protection authorities, directly, in place of a representative.
A record of the processing is kept in the public repository, in `docs/records-of-processing.md`.

## Changes to this policy

When this policy changes, the date at the top changes.
Earlier versions stay in the public repository.
