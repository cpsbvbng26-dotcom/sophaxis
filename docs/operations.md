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
- The operator creates the GitHub Release and the Zenodo version by hand. Record the DOI that Zenodo gives, and no other.

## Registries

- The application to OpenDOAR is drafted in [opendoar.md](./opendoar.md), for the day it takes new submissions again. Read its first section before sending it.

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
3. Make the last release: add the entries to `CHANGELOG.md`, change the version and the date in `CITATION.cff`, and let the operator create the GitHub Release and the Zenodo version by hand. The archive at Zenodo, under the DOI of every version in `site.json`, then holds `data/papers/` (the records), `data/pdf/` (the PDF copies, each under the licence of its work) and `site/` (every record page, as built).
4. Keep the site served from `site/` for as long as Vercel's free service allows. If it cannot be served there, follow "If Vercel cannot serve the site" above, or leave the repository as the place to read the records.
5. Keep the repository public, with every record. Do not archive it on GitHub: an archived repository takes no issues, and removal requests come in issues. Turn off every scheduled workflow except `removal.yml`.
6. Removal requests and requests about personal data are still answered after the closure, in issues or by email, as the Takedown Policy says. A record removed after the last release is also asked to be removed from that Zenodo version, whose files the operator cannot change.
7. Tell the registries that list Sophaxis (`listedIn` in `site.json`) and those it applied to, and close the Zenodo community to new requests.
8. The DOIs stay with the repositories that issued them. Where every author consented, the Internet Archive keeps its saved copies of the record pages and the PDF copies.

## If the operator cannot work

- Follow "Continuity" in the Terms of Use: after 30 days, the top page says that new submissions are paused, and the listed records stay online.

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
