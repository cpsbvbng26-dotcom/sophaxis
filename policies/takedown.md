# Takedown Policy

Last updated: 2026-11-12.

Japanese: [削除の規程（日本語訳）](./takedown.ja.md). It is a translation; where the two differ, the English text applies.

The Takedown Policy says how to ask for a record to be removed, and what happens then.

The laws, licences and terms that this page cites are quoted at the end of each section that cites them.
Japanese statutes are quoted in full, as the e-Gov law API gives them. The other texts are quoted word for word from their official sources, as fetched on 2026-11-11, and are not translated.
A citation whose source could not be fetched is named there as not quoted, with the reason.

## When a record is removed

Records are not deleted.
Every Sophaxis id stays, even when its record is removed.
A record is removed in three cases.
The first is removal required by law, such as copyright infringement or exposure of personal data.
The second is when an author shows that they did not agree to the listing and the work cannot be withdrawn under the [Withdrawal Policy](./withdrawal.md).
The third is when an author of the work asks for it in a withdrawal issue, as the [Withdrawal Policy](./withdrawal.md) sets out.
A removed record leaves only what the section "What a removed record leaves" below lists.

## How to ask

To request removal for legal reasons, open a removal issue.
Do not include personal data in the issue.
Describe where the problem is, without repeating the material itself.
Say how you are concerned: as an author, as the rights holder, as the person whose data appears, or on their behalf.

Requests are welcome from any country, in English or Japanese.
A request may rest on the law of the requester's country, such as a copyright notice under the law of the United States or a request under the data protection law of the European Union.
The operator considers it under this policy and under Japanese law, and takes the material offline when either requires it.

The site is served by Vercel, and the repository and its issues are kept on GitHub, both in the United States.
A request can also go to GitHub, for example as a copyright notice under its own process, or to Vercel.
They decide under their own terms; the operator decides on Sophaxis under this policy, whatever they decide.
Where the operator removes material, it also asks GitHub to remove it from the repository history, as set out below.

A request that cannot be made in public goes by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
That is the address for requests; the address in the OAI-PMH interface is for harvesters.
For personal data and other serious harm, the operator then takes the record page (its title, authors, abstract and PDF copy) offline while the request is reviewed; authors agree to this in the [Terms of Use](./terms.md).

## What happens

The operator aims to answer each request within 7 days.
For personal data and other serious harm, the record page (its title, authors, abstract and PDF copy) is taken offline at once, before the decision, and OAI-PMH reports the record as deleted until it is put back.
A removal issue is acknowledged automatically, with the day by which the operator aims to answer.
When a removal issue reports exposure of personal data, the record page (its title, authors, abstract and PDF copy) is taken offline automatically, before the operator reads it.
The automatic steps decide nothing; the operator decides every request.
The authors are told in their submission issue and can respond.
A request about the requester's own personal data concerns that person, not the work, so the authors are not told of it.
Except where serious harm requires it at once, the operator removes material on a request only after asking the authors whether they agree; if they do not object within 7 days, the operator may remove it.
This notice-and-response procedure follows the approach of Japanese law on the liability of providers of online services: the person whose material is concerned hears of the request and can answer before a decision, except where serious harm requires the material to be taken offline at once.

If the request is upheld, the record is removed, as the next section sets out.
If the request is not upheld, the operator says why in the issue.
Material that was taken offline while the request was reviewed is put back.
The decision is posted in the issue, or sent by email to a person who asked by email, before the material goes back.
An author can answer a request at any time; if the answer shows that the request has no ground, the material is put back.

## What a removed record leaves

This section applies to every removed record, whatever the reason.
The removal is carried out by `tools/removal.js` in the public repository, after the operator's decision, and every step below is checked automatically before it is published.

On the site:

- When a record is removed, its page is replaced by a notice that says only that the record with that Sophaxis id was removed.
- The notice gives no reason and no other detail.
- The address keeps working, so that citations lead to the notice instead of to nothing.
- The title, the authors, the abstract and the PDF copy are removed from the site.
- The page asks search engines not to index it, and the record leaves every list, the search, the feed, `papers.json` and the sitemap. The statistics count it only among removed records.
- Earlier versions of the site that Vercel keeps are not open to the public.
- `robots.txt` asks the Internet Archive's crawlers not to collect the page or its PDF copies again.

In the records and the OAI-PMH interface:

- The record keeps only its Sophaxis id, the word "removed" and the day of removal. The day is kept because the OAI-PMH interface needs it.
- The OAI-PMH interface marks the record as deleted, with that day and no metadata, so that harvesters can remove it when they next visit.

In the issues:

- Every automatic comment about the record is deleted, and the issues that name it are emptied, closed and locked; the operator then deletes them.
- Deleting an issue also deletes its edit history.
- A removal request itself stays, with the decision on it. A withdrawal issue that asked for removal is emptied like the others.

Outside the site:

- The operator also asks GitHub to remove the material from the repository history.
- Until GitHub does so, earlier versions of the record stay in the history of the public repository.
- GitHub's own procedure is to rewrite the history first and then ask GitHub Support, which helps only with sensitive data whose risk cannot be removed otherwise; where it does not help, the earlier versions stay in the history.
- The operator also asks the Internet Archive to exclude its earlier copies of the record.
- Copies that others have already taken are outside Sophaxis's control; the operator tells the ones it knows of.
- A follow-up issue lists these steps, with the request to the Internet Archive. Each day an automatic step checks whether the emptied issues are deleted and whether the Wayback Machine still lists a copy, ticks what is done, and reminds the operator once a week of the rest.

The Sophaxis id of a removed record is never given to another work.

## For the European Union: the Digital Services Act

From 2026-11-22, Sophaxis does not list work by an author who lives in the European Union, or who stays there between the submission and the listing, and does not direct itself to people there, so the operator considers that it has no substantial connection to the Union and does not offer services there in the sense of the Act.
Sophaxis takes the worst case here too, and follows the Digital Services Act of the European Union as far as it can apply to a service of its size.

- Point of contact, for authorities, the European Commission and people who use Sophaxis (Articles 11 and 12): the email address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547), in English or Japanese. Sophaxis has no legal representative in the European Union (Article 13), and the operator has decided not to appoint one, for the reason the [Privacy Policy](./privacy.md) gives. Authorities write to the operator directly at that address. Should the view above be wrong, Sophaxis does not meet Article 13, because it has no legal representative in the European Union.
- Notices of illegal content (Article 16): a removal issue, or an email. A notice by email names who sends it and gives an email address. A removal issue does not, because it is public; the GitHub account that opens it stands in their place. A notice by email also says that the sender believes in good faith that what it says is accurate and complete. A removal issue is acknowledged automatically; a notice by email is acknowledged by the operator by email, without undue delay. The decision is told in the issue or by email.
- Reasons for a decision (Article 17): the operator gives the grounds of every decision in the removal issue, or by email. The authors were pointed to that issue when the request arrived. The grounds say whether an automatic step acted: only the step that takes exposed personal data offline at once ever does, and it acts on the kind of problem that the request names. Where material is held to be illegal, the grounds name the law relied on and say why the material breaks it. They also say how far the measure reaches and for how long: a removal applies wherever the site is read, and it is permanent. When a request came by email and is upheld, the grounds, without personal data, are posted in the authors' submission issue before it is emptied, so that GitHub sends them to the authors who follow it; the removal cannot be run without them. An author can also ask the operator for them by email.
- Challenging a decision (Article 20): the person who sent the notice and the authors can challenge a decision within six months, by answering in the removal issue or by email. It costs nothing. The operator reviews it and answers, and the review is never left to an automatic step.
- A person can also go to a court, or to an out-of-court dispute settlement body certified under Article 21.
- Suspicions of serious crime (Article 18): if the operator learns of information that gives rise to a suspicion of a criminal offence that threatens a person's life or safety, the operator promptly tells the law enforcement or judicial authorities of the Member State concerned, with all relevant information it has. Where that Member State cannot be identified with reasonable certainty, the operator tells Europol.
- The rules that limit what may be listed are in the [Terms of Use](./terms.md) and these policies, in plain English (Article 14).
- Average monthly active recipients (Article 24(3)): Sophaxis keeps no analytics and no identifiers of readers, and will not start keeping them to produce this figure. On request of a Digital Services Coordinator or the Commission, the operator gives, for each of the last six months, the number of people in the Union who submitted, reported or wrote to Sophaxis, counted from the issues and the email, and says that readers are not counted.
- The [statistics](https://sophaxis.vercel.app/stats.html) count the removed records and link to every public removal request.

<!-- text: DSA 11; DSA 12; DSA 13; DSA 16; DSA 17; DSA 20; DSA 21; DSA 18; DSA 14; DSA 24 -->

## Copyright notices under United States law

Sophaxis has not designated an agent with the United States Copyright Office, which charges a fee, so it does not rely on the limitation of liability in 17 U.S.C. 512.
A notice of claimed infringement under that law is handled under this policy, like any other request.

<!-- text: 17 U.S.C. 512 -->

## Requests to disclose who sent material

A request to disclose who submitted material is handled as Japanese law provides.
The operator first asks the person concerned for their opinion.
The operator discloses nothing that the law does not require.

## The work in its repository

Sophaxis cannot remove a work from Zenodo, Figshare or any other repository.
A request about the deposit itself goes to that repository.
