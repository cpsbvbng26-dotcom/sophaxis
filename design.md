# Legal handling of the design

Last updated: 2026-11-23.

Japanese: [デザインに関する法的な扱い（日本語訳）](./design.ja.md). It is a translation; where the two differ, the English text applies.

This page sets out the parts of the look of Sophaxis: its logo and icons, the badge, the share cards, the drawings in the pages, the colours, the fonts and the layout. For each part it says who made it, where it comes from, under what licence it is offered, and which articles of Japanese law it touches.
It describes Sophaxis's own understanding. It is not legal advice, and no lawyer has reviewed it.
The owner asked for it on 2026-11-22, and Claude wrote it.
The articles of Japanese law that it cites are quoted in full, as the e-Gov law API gives them, at the end of each part that cites them. The English sentences about an article are a summary, not a translation; the Japanese text is the law.

## The parts

The site serves **6** image files of its own design, and **4** share cards, one for each record shown.
Each was made for Sophaxis with Claude Code, at the operator's request. Every commit that added or changed one of these files, or `design.js` and `tools/cards.js`, which draw them, was made by Claude Code.
The site serves nothing else of its look as a file: no font, no stylesheet and no picture from anywhere else.

| Part | File | How it is made | Licence | How it is checked |
| --- | --- | --- | --- | --- |
| The logo | `favicon.svg` | Drawn by hand from rectangles; `design.js` holds its numbers | None named | The check draws it again from `design.js` and compares the two |
| The logo as a square picture | `og.png` | The logo, 600 by 600 pixels | None named | The check reads its size |
| The logo as icons | `favicon.ico`, `favicon-192.png`, `apple-touch-icon.png` | The logo drawn in a browser at 960 pixels, then halved step by step | None named | The check reads their sizes |
| The badge for a listed work | `badge.svg` | Written by `build.js` | None named | The check builds it again |
| The share cards | `card/<id>.png` | Drawn in a browser by `tools/cards.js`, with the logo, the title, the authors and the fields of the record | None named | The check compares each card with its record |
| The drawings in the pages | none | The field glyphs, the band, the shelf and the construction drawing, written into the pages by `build.js` from the numbers in `design.js` | None named for the look; its code is MIT | The check draws them again and compares them |
| The colours | none | The colours of `brand.md` and of the fields in `site.json` | None named for the look; its code is MIT | The check measures their contrast |
| The fonts | none | None served. The style names the reader's own fonts | Not applicable | The check finds no font file and no `@font-face` |
| The layout | none | The style written in `build.js` and `design.js` | None named for the look; its code is MIT | The check finds no style from elsewhere |

The [Licence Policy](./policies/licences.md) names two licences of this site: CC BY 4.0 for its text and MIT for its code.
It names no licence for the logo, the icons, the badge or the share cards, and this page adds none.
How the logo may be used is on the page [Name, logo and badge](./brand.md).

## Fonts

No font file is served, and no style uses `@font-face`.
The style names fonts in three lists, `--serif`, `--sans` and `--mono` in `design.js`. Each list ends with a generic family, so that the reader's device chooses a font it has.
A font named in a list is not sent to the reader.
The badge names fonts in the same way.

The share cards are pictures, so their letters are drawn when a card is made.
`tools/cards.js` names DejaVu Serif and DejaVu Sans first.
On 2026-11-22, Claude drew the **5** cards again with `tools/cards.js` in its own environment, and each came out byte for byte the same as the card served.
On 2026-11-23 the card of 2026.0001 was taken off with its record.
There the browser drew the letters with DejaVu Serif, its bold, and DejaVu Sans, from the package fonts-dejavu-core 2.37-8.
The copyright file of that package names the licence of the fonts bitstream-vera, and says: "DejaVu changes are in public domain."
Its condition is: "The above copyright and trademark notices and this permission notice shall be included in all copies of one or more of the Font Software typefaces."
A card holds pictures of letters, not a copy of a font file. The site serves no font file.

## Copyright

Article 2(1)(i) of the Copyright Act defines a work as a creative expression of thoughts or sentiments that falls within the literary, scientific, artistic or musical domain.
Article 10(1)(iv) of the Copyright Act names paintings, engravings, sculptures and other artistic works among the examples of works.
This page draws no conclusion on whether the logo, the icons, the badge, the cards, the drawings or the layout is a work.
Articles 19 and 20 of the Copyright Act give the author of a work the right to have the name shown or not shown, and the right to keep the work and its title from changes against the author's will.
Every page names the operator in its footer.
The site uses no picture, drawing or font file made by anyone else.

<!-- text: Copyright Act 2; Copyright Act 10; Copyright Act 19; Copyright Act 20 -->

## Trade marks, designs and unfair competition

The operator has not applied to register the name or the logo as a trade mark. The [Disclaimer](./disclaimer.md#names-and-trademarks), under "Names and trademarks", records this and the searches of the name.
No application to register a design is recorded in the repository.
Article 25 of the Trademark Act gives the owner of a registered trade mark the exclusive right to use it on the goods or services it is registered for.
Article 2(1) of the Design Act defines a design as the shape, pattern or colour of an article, the shape of a building, or an image used to operate a device or shown as the result of its function, that is aesthetically pleasing through the eye.
Article 23 of the Design Act gives the owner of a registered design the exclusive right to work it, and designs similar to it, as a business.
Article 2(1)(i) and 2(1)(ii) of the Unfair Competition Prevention Act name, as unfair competition, using an indication that is the same as or similar to another's well-known indication so as to cause confusion, and using another's famous indication as one's own.
The logo is made from rectangles only, and the field glyphs from rectangles, polygons and circles.
The site serves no logo, mark or picture of anyone else.
No search of registered trade marks, registered designs or the indications of others for the logo, the icons or the drawings is recorded. The Disclaimer says that the logo was not searched.
This page draws no conclusion on whether any of these articles applies to Sophaxis.

<!-- text: Trademark Act 25; Design Act 2; Design Act 23; Unfair Competition Prevention Act 2 -->

## Accessibility

This page calls 障害を理由とする差別の解消の推進に関する法律 the Disability Discrimination Act. The English name is a label of this page, not an official title.
Article 2 of the Disability Discrimination Act defines, in its item 7, a business operator as a person who carries on commerce or other business, apart from the state and public bodies.
Article 8(1) of the Disability Discrimination Act forbids a business operator to infringe the rights of persons with disabilities by unfair discriminatory treatment on the basis of disability. Article 8(2) asks a business operator, when a person with a disability asks for a social barrier to be removed, to make reasonable accommodation, unless the burden is excessive.
Whether the operator of Sophaxis is a business operator under Article 2 of the Disability Discrimination Act is not settled by the text, and this page draws no conclusion on it.

What the checks of the site confirm on every change is set out on the page [Accessibility](./accessibility.md). For the look of the site, they confirm these:

- every text colour has a contrast of at least 4.5:1 in the light and the dark scheme, and at least 7:1 when the system asks for more contrast;
- the field colours have a contrast of at least 4.5:1, and each field has a glyph and a code as well as a colour;
- no page moves: the style has no animation and no transition;
- the depth is drawn with shadows, and with gradients between the background colour and the card colour only, so that every text colour is measured on both ends; what the pointer or the focus is on rises by its shadow and does not move; on paper the shadows and the gradients are dropped;
- every image that carries meaning has an alt text, and every drawing that only decorates is hidden from screen readers and has a title;
- every page can be used with the keyboard alone, shows a focus ring, and does not scroll sideways at widths down to 360 pixels, at a zoom of 200 percent, or with the text alone doubled.

<!-- text: Disability Discrimination Act 2; Disability Discrimination Act 8 -->

## People and organisations

No part of the look shows a portrait or a photograph of a real person.
No part shows the logo, the seal or the mark of a real organisation.
The names of others that the site uses are listed in the [Disclaimer](./disclaimer.md#names-and-trademarks).

## When a part changes

A change to a part of the look changes this page and its check in the same pull request.
The check of this page fails when a served image is added or removed and the table does not follow, when a font file or `@font-face` appears, when a style moves, or when a quoted article is no longer the text the weekly watch confirms.
