# Construction of the logo

Last updated: 2026-11-23.

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

## Depth

The pages are drawn in layers, lit from one side, the upper left, so every shadow falls to the lower right.
There are four heights: the ground, a surface, a raised surface and the front. Below the ground there is one depth.
The ground is the page itself. A notice, a chip of a field, a spine and an abstract are surfaces. The header and a catalogue card are raised. What the pointer or the focus is on comes to the front.
A field to type in, the chip of the field shown, a withdrawn spine and the hole of a card are sunk.
Each scheme has one colour for its shadows. A shadow shows little in the dark scheme, so a surface there takes its height from a line of light along its upper edge and from the card colour, which is lighter than the ground.
A spine is lit along its left edge and shaded along its right, within 4px of the edges, where no letter stands.
Nothing moves. What the pointer or the focus is on rises by its shadow alone, and the style has no transform, no animation and no transition.
The gradients run only between the background colour and the card colour, and the check measures the contrast of every text colour on both.
Running text keeps a line of at most 36em, which is 36 characters of Japanese.
On paper the shadows and the gradients are dropped.
The numbers are in `design.js`, and the check of the site reads them from there.
