# Legal review

Last updated: 2026-11-08.

This file records how the policies of Sophaxis were checked against the law, and the risks that remain.
It sets out the operator's understanding; it is neither legal advice nor a guarantee, and it has not been reviewed by a lawyer.
The policies themselves are the [Terms of Use](../policies/terms.md) and the pages they name.

## Method

The policies were checked in five ways.

1. **Elements as logic.** An offence or a duty arises only when all of its elements are present. Writing a law as A₁ ∧ A₂ ∧ … ∧ Aₙ, or as several such conjunctions joined by ∨, one sentence that denies a single element of every conjunction makes the whole false. Where a law sets duties instead, each duty needs a sentence that meets it. `verification/legal-matrix.json` lists, for each law below, which element is denied, or which duty is met, by which sentence, and `verification/check.js` confirms that every such sentence is in the policies word for word.
2. **Coverage.** Every pair of actor (the operator, a submitting author, a co-author, a reader, a harvester or search engine, a third party) and act (receiving a submission, publishing a record, keeping a PDF copy, offering records for reuse, keeping data and logs, removing or withdrawing, reaching abroad) is listed in `verification/legal-matrix.json`. Every one of the 42 pairs is either covered by a law below or cannot occur, with the reason.
3. **Consistency.** Every policy was compared with the others, with its Japanese translation, and with the code that carries it out. What was found is listed under Consistency below.
4. **Fault tree.** The ways the facts relied on could fail were listed, and their likelihood and severity were each estimated from 1 to 3. The product ranks them. The numbers are the operator's estimates and serve only to rank.
5. **Breaking on purpose.** Each fixed sentence and each number was altered in turn, and the check was seen to fail.

## Laws

### Copyright (Copyright Act of Japan, Articles 21 and 23)

Keeping a PDF copy and showing an abstract are reproduction and public transmission. Both are licensed: only works under an accepted licence are listed, and those licences allow both.

### Moral rights (Copyright Act of Japan, Articles 19 and 20)

The PDF copy is the deposited file, byte for byte, and every record names the authors as they gave them.

### The conditions of the accepted licences (CC BY 4.0, CC BY-SA 4.0, CC0 1.0)

Credit is given, the licence is named and linked, no terms or technical measures are added, and no endorsement is implied.

### Personal information (Act on the Protection of Personal Information, Articles 17, 18, 26, 27, 28 and 32)

The Act is applied as if the operator were a business operator under it. The purposes are listed, consent to provision abroad is given in the form, the address is given on request, and only the name, websites and works of an ORCID record are read.

### Sending users' information outside (Telecommunications Business Act, Article 27-12)

The pages contain no code or tag that sends information about a reader to anyone else, so the rule on sending users' information outside has nothing to apply to.

### Data protection in the European Union and the United Kingdom (GDPR and UK GDPR, Articles 3(2), 27, 30 and 49)

The decision not to appoint a representative is stated with its reason and its review, transfers without safeguards rest on explicit consent, and a record of processing is kept.

### Reputation and privacy (Penal Code, Articles 230 and 231; Civil Code, Article 709)

The operator writes nothing about a person beyond the record. Material in a listed work is the authors' responsibility, and exposure of personal data is taken offline at once.

### Liability of providers and disclosure of senders (Japan's Act on providers of specified telecommunications services)

Notices are received and acted on, and a sender is disclosed only as the law requires, after they are asked for their opinion.

### The Digital Services Act of the European Union

There is a point of contact, every decision gives its grounds, and a decision can be challenged free of charge, with no automatic step deciding the challenge.

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
| 8 | A repository changes the licence or the metadata after listing | 1 | 1 | 1 | The weekly check of DOIs and licences reports it |
| 9 | A service used changes its terms and can no longer be used | 1 | 1 | 1 | The repository keeps every record public, and the work can move elsewhere under its licences |

## Limits

Showing that a risk is zero is not possible by logic or by arithmetic. What this review shows is that no law above was left out, that every sentence relied on is in the policies, and that removing one makes the check fail.
The laws of other countries were not checked one by one, beyond those named above. The articles of the GDPR and the Digital Services Act that the policies cite were read on 2026-11-08 in EUR-Lex, and those of the UK GDPR at legislation.gov.uk; the Japanese articles are watched each week. Of the terms relied on, DataCite's CC0 waiver for its metadata, ORCID's terms for its public APIs, Vercel's limit of the Hobby plan to non-commercial use, and the clauses of the three accepted licences were read at their sources on the same day. Crossref's statement on the reuse of its metadata was not found at its documented address, and the Internet Archive's terms need a script to show, so neither was read.
Registered trademarks were not searched.
