# Construction of the logo

Last updated: 2026-11-14.

Japanese: [ロゴの作図（日本語訳）](./construction.ja.md). It is a translation; where the two differ, the English text applies.

This page shows how the logo of Sophaxis is built, and the shapes drawn from it. Every drawing here, the logo, the field glyphs, the band over each page and the shelf, is drawn by the code of the site (`design.js`) from one set of numbers, and the check of the site draws them again and compares them with what the site serves.

## The logo

The logo is a square of 48 units with rounded corners. A frame sits 7 units inside it, and inside the frame an S is made of five bars, each 4 units thick, on a grid of 4.
It uses rectangles only: no typeface, no image and no shape taken from anyone else.
The logo file, [favicon.svg](https://sophaxis.vercel.app/favicon.svg), was drawn by hand on 2026-10-30; the drawing below is made again from the numbers, and the check fails if the two differ.

<!-- construction -->

## Field glyphs

Each field has a glyph of its own, drawn on a box of 12 units with a line 1.5 units wide, beside its code. The glyphs are plain shapes; they take the colour of the text beside them.

<!-- glyphs -->

## The band

The band over each page is the five bars of the S stood on end, side by side, like five spines on a shelf, at half their length in the logo, each in the colour of one field. It is decoration, and screen readers skip it.

## Fonts

The site loads no font. Titles and the text use the reader's serif font, the navigation and labels the reader's sans-serif font, and ids and shelf marks the reader's monospaced font.
