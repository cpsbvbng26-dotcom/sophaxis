# Legal review

Last updated: 2026-11-08.

This file records how the policies of Sophaxis were checked against the law, and the risks that remain.
It sets out the operator's understanding; it is neither legal advice nor a guarantee, and it has not been reviewed by a lawyer.
The policies themselves are the [Terms of Use](../policies/terms.md) and the pages they name.

## Method

The policies were checked in six ways.

1. **Elements as logic.** An offence or a duty arises only when all of its elements are present. Writing a law as A₁ ∧ A₂ ∧ … ∧ Aₙ, or as several such conjunctions joined by ∨, one sentence that denies a single element of every conjunction makes the whole false. Where a law sets duties instead, each duty needs a sentence that meets it. `verification/legal-matrix.json` lists, for each law below, which element is denied, or which duty is met, by which sentence, and `verification/check.js` confirms that every such sentence is in the policies word for word.
2. **Coverage.** Every pair of actor (the operator, a submitting author, a co-author, a reader, a harvester or search engine, a third party) and act (receiving a submission, publishing a record, keeping a PDF copy, offering records for reuse, keeping data and logs, removing or withdrawing, reaching abroad) is listed in `verification/legal-matrix.json`. Every one of the 42 pairs is either covered by a law below or cannot occur, with the reason.
3. **Consistency.** Every policy was compared with the others, with its Japanese translation, and with the code that carries it out. What was found is listed under Consistency below.
4. **Fault tree.** The ways the facts relied on could fail were listed, and their likelihood and severity were each estimated from 1 to 3. The product ranks them. The numbers are the operator's estimates and serve only to rank.
5. **Breaking on purpose.** Each fixed sentence and each number was altered in turn, and the check was seen to fail.
6. **Clause by clause.** The articles of the GDPR, the Digital Services Act and Japan's Act on the Protection of Personal Information, its Order and its Rules that the policies rely on were read paragraph by paragraph and item by item, and each duty they place on Sophaxis was written down. `verification/duties.json` gives, for each, the sentence that meets it word for word, what is still missing, or why it does not apply, and `verification/check.js` confirms it. There are 151 duties: 122 met, 28 that do not apply, and 1 open.

## Laws

### Copyright (Copyright Act of Japan, Articles 21 and 23)

Keeping a PDF copy and showing an abstract are reproduction and public transmission. Both are licensed: only works under an accepted licence are listed, and those licences allow both.

### Moral rights (Copyright Act of Japan, Articles 19 and 20)

The PDF copy is the deposited file, byte for byte, and every record names the authors as they gave them.

### The conditions of the accepted licences (CC BY 4.0, CC BY-SA 4.0, CC0 1.0)

Credit is given, the licence is named and linked, no terms or technical measures are added, and no endorsement is implied.

### Personal information (Act on the Protection of Personal Information, Articles 17, 18, 26, 27, 28 and 32)

The Act is applied as if the operator were a business operator under it. The purposes are listed, consent to provision abroad is given in the form, the address is given on request, and only the name, websites and works of an ORCID record are read. Disclosure, correction, stopping use and stopping provision to third parties can be asked, through an agent too, and a reportable leak is reported within the times the Rules set.

### Sending users' information outside (Telecommunications Business Act, Article 27-12)

The pages contain no code or tag that sends information about a reader to anyone else, so the rule on sending users' information outside has nothing to apply to.

### Data protection in the European Union and the United Kingdom (GDPR and UK GDPR, Articles 3(2), 27, 30 and 49)

From 2026-11-22 Sophaxis does not list work by an author who lives in the European Union, the European Economic Area or the United Kingdom, and does not direct itself there, so the operator considers that Article 3(2) does not reach it. The decision not to appoint a representative is stated with its reason and its review, and so is the breach if that view is wrong. The transfer to the Internet Archive rests on explicit consent in a box of its own, which may be left empty and can be withdrawn without review. The right to object has a section of its own and is stated in every form, a request is answered within one month, and a record of processing is kept.

### Reputation and privacy (Penal Code, Articles 230 and 231; Civil Code, Article 709)

The operator writes nothing about a person beyond the record. Material in a listed work is the authors' responsibility, and exposure of personal data is taken offline at once.

### Liability of providers and disclosure of senders (Japan's Act on providers of specified telecommunications services)

Notices are received and acted on, and a sender is disclosed only as the law requires, after they are asked for their opinion.

### The Digital Services Act of the European Union

The operator considers that Sophaxis has no substantial connection to the Union, and follows the Act all the same. There is a point of contact, every notice is acknowledged, every decision gives its grounds, the law relied on and whether an automatic step acted, courts and certified bodies are named, a decision can be challenged free of charge with no automatic step deciding the challenge, and suspicions of serious crime are reported.

### Consumer contracts (Consumer Contract Act, Articles 8, 8-3 and 10)

The operator is liable, as Japanese law provides, for intent and negligence, and the Act is applied as if the operator were a business operator under it.

### Standard terms and their change (Civil Code, Articles 548-2 to 548-4)

Authors agree in the form to the version of the day, and a change that narrows a right or adds a duty is announced before it takes effect.

### Trade and advertising (Act on Specified Commercial Transactions; Act against Unjustifiable Premiums and Misleading Representations)

Nothing is sold and no fee is charged, now or after any change.

### Names and marks (Trademark Act; Unfair Competition Prevention Act)

The names of other services are used only to identify them, and no affiliation is claimed.

### Minors (Civil Code, Article 5)

No one under 13 may submit, and a person under 18 submits only with the consent of a parent or guardian.

### The terms of the services used (GitHub, Vercel, ORCID)

The site is served only within free services, which keeps it within Vercel's non-commercial Hobby plan, and only the public ORCID record is read.

## Consistency

The comparison found the items below. Each was fixed in the same change as this file.

1. The hold on a removal request takes the whole record page offline, as the code does, but the form, the notices the code sends, the Privacy Policy and the record of processing said only the abstract and the PDF copy. All now say the record page.
2. The Withdrawal Policy said that removal is only for legal reasons and leaves the PDF copy; removal is also at an author's request, and takes the PDF copy too.
3. The Japanese Privacy Policy said its content was the same as the English, but it lacked the search script, the share links and Vercel's analytics, while only it said that earlier versions stay in the repository history and the Internet Archive. Both now say all of it, and the Japanese says that the English governs.
4. Co-authors confirm their agreement to the listing but never agree to the Terms in a form. The Terms now say that such a co-author is bound only as far as the law makes them so.
5. The Terms took continued use as acceptance of a change, the kind of clause that Article 10 of the Consumer Contract Act names. Changes now follow Article 548-4 of the Civil Code, silence or continued use is not agreement, and a change never takes effect before the day it is published.
6. For people in the European Union and the United Kingdom, the Privacy Policy now says that the consent behind the transfer to the Internet Archive can be withdrawn, that data can be received in a machine-readable form, and why the exception in Article 27(2)(a) is considered to apply.
7. The information given before consent to provision abroad now says more about the United States and about what the Internet Archive receives.
8. The Privacy Policy now says that the operator confirms who is asking before answering a request about personal data, as the code's notices already said.
9. Text written in the forms before 2026-11-21 had no stated permission to be shown; the Licence Policy now gives it.
10. OpenAlex is asked about DOIs, and is now among the services outside Japan; the statement on the User-Agent now names the one step that runs deposit-check, which names itself.
11. The Takedown Policy now says that the authors are not told of a request about the requester's own personal data, as the code already did.
12. The Submission Policy now says that a person under 13 cannot submit from 2026-11-21, as the Terms and the form do.
13. Reading Article 49(1)(a) of the GDPR in EUR-Lex showed that explicit consent to a transfer without safeguards must come after the person is told its possible risks. The Privacy Policy now states those risks for the Internet Archive.
14. Article 17(4) of the APPI Enforcement Rules asks that, where the measures a recipient abroad takes cannot be given, the person be told so and why. The Privacy Policy now says so for the Internet Archive.
15. The Privacy Policy said that the exception in Article 27(2)(a) of the GDPR applies because the processing is occasional. Publishing records, offering them for harvest and the weekly checks are regular, so it does not. The claim, added in #138, is withdrawn from the Privacy Policy, its Japanese translation and the record of processing.
16. One box bundled the listing with the saves to the Internet Archive, which are not needed to list a work, so that consent might not be freely given (GDPR Article 7(4)). The Internet Archive now has a box of its own, which may be left empty; a record without it is not saved and `robots.txt` asks the Internet Archive not to collect it.
17. Withdrawing consent was handled as a request for removal, which can end "not upheld" (Article 7(3)). Withdrawing consent to the Internet Archive is now a kind of request of its own and stops the saves without review.
18. The right to object was a clause inside a sentence about complaints (Article 21(4)), and an objection was weighed under the Takedown Policy, with the burden on the person (Article 21(1)). It now has a section of its own, is stated in every form and in the note to co-authors, and the operator must show compelling grounds in writing.
19. The Privacy Policy gave an aim of 7 days but no limit (Article 12(3)); it now gives one month, the extension, the reasons when nothing is done, and the authorities and courts (Article 12(4)). It also names restriction (Article 18), the purposes, stopping provision to third parties and the record of provision (APPI Articles 32, 33 and 35), agents (Article 37), how a copy is given, what leak is reported and when (Rules, Articles 7 and 8), the retention of the issues and the logs, the purposes of the logs and of correspondence, and the basis for GitHub, Vercel and ORCID under the Data Privacy Framework.
20. The removal form, the withdrawal form, the published-version form and the correction form did not point to the Privacy Policy (GDPR Article 13; APPI Article 21(2)); each now does, and so does the contact page.
21. The Takedown Policy said the acknowledgement was automatic, but only a removal issue is acknowledged so (DSA Article 16(4)); a notice by email is now acknowledged by the operator. A notice by email now states good faith (Article 16(2)(d)), the reasons in the removal form are required (Article 16(2)(a)), and Article 18 on suspicions of serious crime is met.
22. The decision notes named neither courts nor certified bodies, nor the law relied on, nor whether an automatic step acted (DSA Articles 16(5), 16(6) and 17(3)); they now do, and a request not upheld is answered before the material goes back (GDPR Article 18(3)).
23. The Takedown Policy stated no position on Article 13 of the Digital Services Act beyond the decision; it now says that Sophaxis would not meet it if the view on the Union were wrong.
24. Four of the duties left open in #140 are met. The basis for email reaching Apple is stated: Japan's adequacy decision, and Apple's Standard Contractual Clauses (GDPR Article 13(1)(f)). Apple and Vercel are treated as entrusted with handling, as the Personal Information Protection Commission's Q&A 7-53 reads the Act, and supervised under Article 25: a weekly step watches the date of their privacy statements. A removal decided on an email request cannot be run without its grounds, which reach the authors in their submission issue before it is emptied (DSA Article 17(4)). How the number of recipients in the Union would be given is stated (DSA Article 24(3)).
25. "What runs by itself" still said that every page was saved to the Internet Archive and that `robots.txt` excluded only removed records; it now says that only records whose authors consented are saved, and that the others are excluded too.
26. The operator confirmed on 2026-11-08 that their GitHub account uses two-factor authentication. The Privacy Policy, in both languages, now says so. The Vercel and Apple accounts were not confirmed and are not claimed.
27. The Takedown Policy promised to ask GitHub to remove a removed record from the repository history, without saying what GitHub does. GitHub's guide on removing sensitive data and its Private Information Removal Policy, read in their sources on 2026-11-08, say that the owner rewrites the history first and that GitHub Support helps only with sensitive data whose risk cannot be removed otherwise. The policy now says so, and that the earlier versions stay where GitHub does not help. The Internet Archive's help page, read the same day, asks for exclusion requests at info@archive.org and promises no outcome; the follow-up issue of each removal carries such a request.

## Risks that remain

| No. | How it could fail | Likelihood | Severity | Product | Response |
| --- | --- | --- | --- | --- | --- |
| 1 | A version is listed that a publisher's exclusive licence does not let the authors share | 2 | 2 | 4 | The submitter confirms the right to share; the record is removed under the Takedown Policy |
| 2 | A commitment in the policies is removed or weakened by an edit | 2 | 2 | 4 | `verification/check.js` fails, and `verification/commitments.txt` keeps every commitment word for word |
| 3 | A listed work exposes personal data or harms a person's reputation | 1 | 3 | 3 | The record page goes offline at once on a report of exposed personal data |
| 4 | A co-author did not agree to the listing | 1 | 2 | 2 | From 2026-11-21 every co-author confirms their own agreement; until then a record is removed if an author shows they did not agree |
| 5 | Someone passes the identity check for a work that is not theirs | 1 | 2 | 2 | The record is removed under the Takedown Policy |
| 6 | A person under 18 submits without the consent of a parent or guardian | 1 | 2 | 2 | The listing is removed where the law gives that right |
| 7 | A person or an authority in the European Union or the United Kingdom asks for a representative under the GDPR or the Digital Services Act | 1 | 2 | 2 | The decision is reviewed, as the Privacy Policy sets out |
| 8 | An author who lives in the European Union, the European Economic Area or the United Kingdom is listed despite the box | 1 | 2 | 2 | The record is removed under the Takedown Policy, and the decision on a representative is reviewed |
| 9 | A repository changes the licence or the metadata after listing | 1 | 1 | 1 | The weekly check of DOIs and licences reports it |
| 10 | A service used changes its terms and can no longer be used | 1 | 1 | 1 | The repository keeps every record public, and the work can move elsewhere under its licences |

## Duties still open

The duty below, found clause by clause, is met only in part. The rest needs a fact that only the operator can confirm, and it is not filled by a guess.

- APPI 第32条第1項第四号・施行令第10条第一号: Two-factor authentication on the operator's GitHub account, the only one that can change the repository, is confirmed and stated. Whether the operator's Vercel and Apple accounts use it was not confirmed, so the measures for them, and for the devices that read the email, are not stated.

## Limits

Showing that a risk is zero is not possible by logic or by arithmetic. What this review shows is that no law above was left out, that every sentence relied on is in the policies, and that removing one makes the check fail.
The laws of other countries were not checked one by one, beyond those named above. The articles of the GDPR and the Digital Services Act that the policies cite were read on 2026-11-08 in EUR-Lex, and those of the UK GDPR at legislation.gov.uk; the Japanese articles are watched each week. Of the terms relied on, DataCite's CC0 waiver for its metadata, ORCID's terms for its public APIs, Vercel's limit of the Hobby plan to non-commercial use, and the clauses of the three accepted licences were read at their sources on the same day. Apple's and Vercel's privacy statements, Schedule 2 of Vercel's Data Processing Addendum and the Personal Information Protection Commission's Q&A 7-53 and 7-54 were read at their sources on the same day. Crossref's statement on the reuse of its metadata was not found at its documented address, and the Internet Archive's terms need a script to show, so neither was read.
Registered trademarks were not searched.
