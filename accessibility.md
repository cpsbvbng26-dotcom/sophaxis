# Accessibility

Last updated: 2026-11-11.

Japanese: [アクセシビリティ（日本語訳）](./accessibility.ja.md). It is a translation; where the two differ, the English text applies.

## The aim

Sophaxis aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.
This is the operator's own assessment, made with the checks below; no one else has audited the site.

## What is checked on every change

Before any change is published, two sets of checks run on every page of the site.

- In the text of each page: the contrast of every text colour in the light and dark schemes, a link to skip to the content, the language of the page, one main heading, and headers for every table.
- In a browser, at widths from 1440 down to 360 pixels, among them 640, which is a window 1280 pixels wide zoomed to 200 percent: the page can be used with the keyboard alone, the focus moves on in reading order and never gets stuck, every focused element shows a focus ring, every image has an alt text and every field a label, and the page does not scroll sideways.

## Contrast and reading

- When the system asks for more contrast, the site uses a darker grey and a stronger accent in the light scheme, and lighter ones in the dark scheme. Every text colour then has a contrast of at least 7:1, and a check confirms it on every change.
- In forced colours, as in the high contrast modes of Windows, the focus ring takes the colour the system gives.
- In the Japanese pages, the [glossary](./glossary.ja.md) gives the reading of hard words in kana, in parentheses. The pages do not use ruby, which screen readers do not all read the same way.
- [In plain words](./easy.md) tells how to submit in short sentences, in English and in plain Japanese.

## What is not checked, and what is known

- The PDF copies are the authors' files, kept unmodified; Sophaxis cannot add structure to them, and some may not work with a screen reader.
- Titles and abstracts come from the DOI metadata as plain text, so mathematical notation may read poorly.
- The search page needs JavaScript, the only script on the site; without it, the lists by field and by month, and the feeds, give the same records.
- The records, the lists and the statistics are in English; the policies and the prose pages are also in Japanese.

## Reporting a barrier

A barrier can be reported in [an issue](https://github.com/cpsbvbng26-dotcom/sophaxis/issues/new) with the label `accessibility`, or by email to the address on the operator's [ORCID record](https://orcid.org/0009-0000-1406-0547).
If a page cannot be used, the operator provides the same information in another form on request, such as plain text by email.

## Help to check

No one else has audited the site, so Sophaxis asks for help.
Anyone who uses a screen reader, a magnifier, voice control, a switch or the keyboard alone can try the site and report what works and what does not, in an issue with the label `accessibility`.
Nothing is paid and nothing is asked beyond the report itself.
What is found is fixed where it can be, and recorded under "What is not checked, and what is known" above, with the date and without the reporter's name unless they ask for it.
