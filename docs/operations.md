# Running Sophaxis alone

Sophaxis is run by one person. This page is the operator's routine, written down so that someone else could take it over, as the Terms of Use allow under "Continuity". It adds no rule; the [policies](../policy.md) and [What runs by itself](../automation.md) govern.

## Every day

- Read the new issues: submissions, withdrawals, published versions, corrections and removal requests. The automatic check has commented on each and decides nothing.
- Decide each submission under the Moderation Policy, and give the reasons in the issue.
- On acceptance, take the draft record from the comment of the automatic check, make it `data/papers/<id>.json` in a pull request, draw the share card with `node tools/cards.js`, add the DOI of each of its versions to `related_identifiers` in `.zenodo.json` with the relation `isDerivedFrom`, then run `node build.js` and `node verification/check.js`. Merge only when every check passes.
- Answer a removal request by the day that its acknowledgement names.

## Every week

- On Monday, the watch reads every listed DOI and opens an issue when a DOI stops resolving, a licence changes, a notice appears or a new version appears. The pages and the PDF copies are also saved to the Internet Archive each week, where every author consented.
- The watch on the laws opens a pull request when a text it follows has changed. Read the difference, check the legal review, and add the label `record` only then.

## Every month

- On the 1st, an issue gives the posts for the official account on X. Post them by hand; nothing is posted automatically.
- The same run measures the free limits, and opens an issue only at 80 percent of one. Read Vercel's bandwidth and function use in the Vercel account, which the run cannot see.

## Every year

- On 2 January, an issue gives the counts of the year before. Record them in `data/reports/`.
- On 30 October, the day Sophaxis began, an issue opens with the yearly audit below.

## On a change to a policy

- Add an entry to `data/policy-changes.json`, newest first, on the day the change is published or announced: the day, the policies it touches, a title, a text, and `from`, the day it takes effect, when that is later. The build makes `policies/changes.xml` from it, and the check fails if a policy's date has no entry.
- A change that narrows a right or adds a duty also needs `termsNotice` in `site.json`, as the README says.

## On a release

- Add the entries to `CHANGELOG.md` and change the version and the date in `CITATION.cff`.
- In `.zenodo.json`, take out the `isDerivedFrom` DOIs of works removed since the last release. A removal does not change the file, so that nothing delays it.
- The GitHub Release and the Zenodo version are made from the operator's accounts. A session that writes this repository cannot make them: a pushed tag is refused with 403. Only the DOI that Zenodo gives is recorded, and no other.

## Registries

- The application to OpenDOAR is drafted in [opendoar.md](./opendoar.md), for the day it takes new submissions again. Its first section says what holds before it is sent. It has not been sent.
- PhilPapers answers automated requests with 403, so the state of the request to its Open Access Gateway, asked on 2026-11-03, cannot be read from here. Its reply came by email, and the README records it beside the registry table. The reply named the operator's own works as the reason. No new request has been made, and none is made before a work by another researcher is listed.
- Points raised by outside assessments, and what was done about each, are in [outside-assessments.md](./outside-assessments.md).

## If Vercel cannot serve the site

The site is plain files, and every link inside it is relative, except on the page shown when an address is not found; a check holds this. It can therefore be served from GitHub Pages, at an address under the repository, with these losses:

- The short addresses `/abs/<id>` and `/pdf/<id>`, and the copies of a PDF beside its record page, which `site/vercel.json` provides.
- The OAI-PMH interface at `/oai`, which runs as a function on Vercel.
- The security headers of `site/vercel.json`. The Content-Security-Policy in each page stays.
- The address itself: `baseUrl` in `site.json` changes, and every canonical link with it.

Announce the move in the news and in the README, and tell the registries that hold the old address.

## Closing Sophaxis

Follow "Continuity" in the Terms of Use. These are the steps, and where each part of the records ends up.

1. Announce the closure on the top page, in the news and in the README at least 30 days ahead, unless the operator cannot act. Set `"submissionsPaused": true` in `site.json` the same day, so that new submissions stop first.
2. Decide every open submission, withdrawal and published-version issue, or close it with the reason. Nothing is listed after the closure is announced.
3. Make the last release: add the entries to `CHANGELOG.md` and change the version and the date in `CITATION.cff`. The GitHub Release and the Zenodo version are made from the operator's accounts. The archive at Zenodo, under the DOI of every version in `site.json`, then holds `data/papers/` (the records), `data/pdf/` (the PDF copies, each under the licence of its work) and `site/` (every record page, as built).
4. Keep the site served from `site/` for as long as Vercel's free service allows. If it cannot be served there, follow "If Vercel cannot serve the site" above, or leave the repository as the place to read the records.
5. Keep the repository public, with every record. Do not archive it on GitHub: an archived repository takes no issues, and removal requests come in issues. Turn off every scheduled workflow except `removal.yml`.
6. Removal requests and requests about personal data are still answered after the closure, in issues or by email, as the Takedown Policy says. A record removed after the last release is also asked to be removed from that Zenodo version, whose files the operator cannot change.
7. Tell the registries that list Sophaxis (`listedIn` in `site.json`) and those it applied to, and close the Zenodo community to new requests.
8. The DOIs stay with the repositories that issued them. Where every author consented, the Internet Archive keeps its saved copies of the record pages and the PDF copies.

## If the operator cannot work

Follow "Continuity" in the Terms of Use, under "If the operator cannot work". These are the steps behind it. A slow decision is not a pause; a pause is for when the operator cannot work on Sophaxis at all.

### Before it happens

- An account successor is named in the operator's GitHub settings (Account, Successor settings). Those settings cannot be reached from here, and no successor is recorded here as named. Without one, nobody else can manage the repository if the operator can never act again.
- This page is public with the repository, so anyone who takes over can read the steps.
- The Zenodo archive holds the records as they stood at the last release, 1.0.0 of 2026-11-07. A release cannot be made from here, and the operator stopped the release of 1.1.0 on 2026-11-12.

### When a pause begins

1. Set `"submissionsPaused": true` in `site.json`, run `node build.js` and `node verification/check.js`, and merge. The top page and the submit page then say that new submissions are paused.
2. Add a news item to `data/news.json` that says the same, in the same pull request.
3. Comment in each open submission, withdrawal and published-version issue that its decision waits until the pause ends.
4. Where the pause can be foreseen, do these steps before it begins. Otherwise do them as soon as the operator can act, and at the latest when the pause has lasted 30 days.

### What runs during a pause, and what waits

- Runs by itself: the automatic check of a new submission issue, the weekly watch of the DOIs, the weekly saves to the Internet Archive where every author consented, the daily comparison of the live site with `main`, and the removal workflow.
- A removal request that reports exposure of personal data still takes the record's title, authors, abstract and PDF copy offline at once (`tools/removal.js`). The daily reminder keeps reminding; the decision waits.
- Waits for the operator: every decision on a submission, a withdrawal, a published version or a removal; the pull requests that the weekly watch opens; the monthly posts; the yearly counts and the yearly audit.
- Stays online: the site on Vercel, as long as Vercel serves it. If it stops, the records stay readable in the repository and in the Zenodo archive.

### How a successor or a custodian takes over

- Keeping the records readable needs nothing that only the operator holds: the repository is public, and every release is archived at Zenodo. A custodian can serve a copy of `site/` elsewhere, as "If Vercel cannot serve the site" says, and keep the records unchanged.
- Taking over Sophaxis itself needs the repository and the Vercel project to be transferred to the new operator. The operator, or the account successor named on GitHub, makes the transfer; nobody else can. The hand-over is announced on the site first, as the Terms of Use say, and the new operator is named on the contact page.
- The new operator then reviews the open issues in the order they came, and changes the policies only in the ordinary way.

### When the pause ends

1. Set `"submissionsPaused": false`, rebuild, and add a news item that submissions are open again.
2. Decide the waiting issues in the order they came. Answer removal requests first.

## Yearly audit

- [ ] Every line of `verification/commitments.txt` still holds in practice, not only in the text.
- [ ] The list of places where Sophaxis is not offered still matches the laws, as the legal review records them.
- [ ] The weekly watch has no open issue, and every record's DOI still resolves.
- [ ] The Privacy Policy still describes every piece of personal data that the code reads or writes.
- [ ] The assessment of the risks to people's data (`docs/impact-assessment.md`) still scores each risk as it stands, and lists every kind of processing.
- [ ] Every Japanese page still says what its English page says.
- [ ] The free services of GitHub and Vercel still cover the site.
- [ ] What the accessibility statement says is known is still accurate.
- [ ] The transparency self-assessment is still accurate.
- [ ] The criteria for listing still serve their purpose. A change follows "Changes to the criteria" in the Moderation Policy.
- [ ] Every change to a policy since the last audit is in `data/policy-changes.json`, and the FAQ adds only questions that were asked.
- [ ] This page still describes what the operator does.
