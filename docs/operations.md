# Running Sophaxis alone

Sophaxis is run by one person. This page is the operator's routine, written down so that someone else could take it over, as the Terms of Use allow under "Continuity". It adds no rule; the [policies](../policy.md) and [What runs by itself](../automation.md) govern.

## Every day

- Read the new issues: submissions, withdrawals, published versions, corrections and removal requests. The automatic check has commented on each and decides nothing.
- Decide each submission under the Moderation Policy, and give the reasons in the issue.
- On acceptance, take the draft record from the comment of the automatic check, make it `data/papers/<id>.json` in a pull request, draw the share card with `node tools/cards.js`, then run `node build.js` and `node verification/check.js`. Merge only when every check passes.
- Answer a removal request by the day that its acknowledgement names.

## Every week

- On Monday, the watch reads every listed DOI and opens an issue when a DOI stops resolving, a licence changes, a notice appears or a new version appears. The pages and the PDF copies are also saved to the Internet Archive each week, where every author consented.
- The watch on the laws opens a pull request when a text it follows has changed. Read the difference, check the legal review, and add the label `record` only then.

## Every month

- On the 1st, an issue gives the posts for the official account on X. Post them by hand; nothing is posted automatically.

## Every year

- On 2 January, an issue gives the counts of the year before. Record them in `data/reports/`.
- On 30 October, the day Sophaxis began, an issue opens with the yearly audit below.

## On a release

- Add the entries to `CHANGELOG.md` and change the version and the date in `CITATION.cff`.
- The operator creates the GitHub Release and the Zenodo version by hand. Record the DOI that Zenodo gives, and no other.

## If Vercel cannot serve the site

The site is plain files, and every link inside it is relative, except on the page shown when an address is not found; a check holds this. It can therefore be served from GitHub Pages, at an address under the repository, with these losses:

- The short addresses `/abs/<id>` and `/pdf/<id>`, and the copies of a PDF beside its record page, which `site/vercel.json` provides.
- The OAI-PMH interface at `/oai`, which runs as a function on Vercel.
- The security headers of `site/vercel.json`. The Content-Security-Policy in each page stays.
- The address itself: `baseUrl` in `site.json` changes, and every canonical link with it.

Announce the move in the news and in the README, and tell the registries that hold the old address.

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
- [ ] This page still describes what the operator does.
