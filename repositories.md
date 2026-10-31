# For repositories and DOI registration agencies

Last updated: 2026-10-31.

This page is addressed to the repositories whose deposits Sophaxis lists, and to the agencies that register their DOIs.
It says what Sophaxis reads from your services, how often, and what it does with it.

## The repositories listed

{{repositories}}

A work is listed only if its authors submit it, and only if its DOI metadata carries CC BY 4.0, CC BY-SA 4.0 or CC0 1.0.
Sophaxis does not harvest or mirror any repository.

## What Sophaxis reads

- The DOI metadata of a submitted work, from the public REST APIs of DataCite and Crossref: once when the work is submitted or its issue is edited, and once a week for each listed DOI, to confirm that it still resolves and keeps its licence.
- The list of versions of a work, from the same metadata.
- The PDF of a version, unmodified, only where the work's licence allows it and the repository offers it to scripts (Zenodo, Figshare, arXiv and Research Square), through their public APIs or download addresses. This happens once per version, when the operator starts it by hand. Where the repository publishes a checksum, the copy must match it.

Every request names Sophaxis and its repository in its User-Agent: `Sophaxis (https://github.com/cpsbvbng26-dotcom/sophaxis)`.
Sophaxis reads no pages meant for people, and does not get around any limit or block.

## What Sophaxis shows

Each record page links to the DOI and names the repository, and asks readers to cite the DOI.
The DOI stays the reference; Sophaxis gives no DOIs of its own.
The abstract and any PDF copy are shown under the work's own licence, with its authors, as the [Copyright Policy](./policies/copyright.html) sets out.

## If something should change

If Sophaxis reads more often than you allow, reads something your terms do not allow, or should stop copying files from your service, tell the operator.
Sophaxis will change or stop it.
A request about a deposit itself stays with the repository; Sophaxis cannot change or remove a deposit.

Reach the operator through an [issue](https://github.com/cpsbvbng26-dotcom/sophaxis/issues) or by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).

Sophaxis is independent, and is not affiliated with any repository or registration agency; see the [Disclaimer](./disclaimer.html).
