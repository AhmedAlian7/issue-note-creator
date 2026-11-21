# Warehouse issue note template

The measurements below come from the Word package in `references/Template.docx`. The 150 DPI export in `tests/fixtures/Template.png` shows the approved empty page. Coordinates in pixels refer to that image, measured from its top left. Word table dimensions are in twips (20 per point). Word specifies minimum row heights, so the exported border positions are also recorded.

## Page and table geometry

The A4 portrait section measures 11906 × 16838 twips. Top, left and right margins are 720 twips each. The bottom margin is 432 twips. Header and footer distances are 288 and 216 twips respectively. The gutter is zero.

| Region | Columns from left to right, twips | Minimum row height, twips | Rules |
| --- | --- | --- | --- |
| Metadata | Date 3780, number 2880, customer 3796 | 557 | Black 0.5 pt top and bottom |
| Items | Remarks 3775, quantity 2880, item 3240, serial 561 | 458 heading, 864 each for ten data rows | Solid 0.25 pt #1A2A3A outer and inner grid |
| Signatures | Driver 3060, storekeeper 4050, approver 3346 | 791 | Black 0.5 pt top and bottom |

In the raster, the metadata rules fall at y=241 and 300. The item grid spans x=75 to 1164, with dividers at 468, 768 and 1106. Its horizontal rules fall at y=361, 409, 500, 590, 681, 771, 862, 953, 1043, 1134, 1224 and 1315. The signature rules fall at y=1431 and 1515. Cells are vertically centered. The Arabic labels read right to left. The stored table columns run left to right. Serial numbers 01 through 10 are literal text. The package contains no numbering part.

## Text

| Region | Face and size | Color and treatment |
| --- | --- | --- |
| Centered title إذن صرف مخزن | Hacen Tunisia 26 pt | Regular, #1A2A3A |
| Metadata | Hacen Tunisia 16 pt | Black bold labels, regular punctuation. The filled Word document uses #FF0000 for the number. |
| Table heading | Hacen Tunisia, inherited 12 pt | Regular white on #475569 |
| Item, quantity and remarks | 16 pt | The filled Word file uses Hacen Tunisia for Arabic items, #1A2A3A for ordinary rows and #EE0000 for its red remark. Individual runs also declare Cambria for Latin text and Times New Roman for complex script. |
| Serial | Hacen Tunisia 10 pt | Regular, #1A2A3A |
| Centered receipt | Hacen Tunisia 11 pt | Italic, #808080 |
| Signatures | Hacen Tunisia 14 pt | Regular black, right aligned in each cell |
| Footer | Aptos 11 pt | Black, opening sentence bold. Website bold, singly underlined, #467886. |

Arabic runs use Word's RTL property and complex-script sizes. The default bidi language is ar-SA, with ar-EG on selected filled runs. The date and English footer read left to right. The receipt reads “أقر باستلام البضائع المذكورة أعلاه بحالة جيدة وبكامل الكمية.” The signature labels from right to left are “يعتمد:”, “أمين المخزن:” and “السائق:”.

## Images and footer

The default header centers an inline logo with extent 1154723 × 438584 EMU (12700 EMU per point). Its ink starts near x=525, y=30 in the reference raster. The watermark measures 364.45 × 137.95 pt and is centered horizontally and vertically within the margins, behind the text. The default header's VML image adjustments are gain 6554f and blacklevel 29491f. The even and first header parts specify gain 19661f and blacklevel 22938f.

The footer anchors the QR image 6075680 EMU from the column origin and −116188 EMU from its anchor paragraph. Its frame is 610235 × 609600 EMU. The source crop removes 13.683% left, 13.678% top, 13.375% right and 13.593% bottom. The QR ink begins near x=1072, y=1629. The footer rule is at y=1612. Text wraps to the left of the QR.

> **Thank you for choosing Italian Home Furniture.** Visit our showroom or scan the QR code for more products.
>
> **italianfurniture-eg.com** | +20 101 347 8443 | Cairo, Egypt

The corrected filled Word file contains note 972 dated 16/11/2026. Its customer name combines Hacen Tunisia for شركة and Times New Roman Bold at 16 pt for MENON. The Word-exported PDF lists the latter face as TimesNewRomanPS-BoldMT. The package embeds Aptos and Hacen Tunisia, while the repository supplies Cambria separately.

The filled comparison fixture is a Microsoft Word PDF export of a temporary copy of the corrected DOCX. Lock the dynamic TIME field in the copy before opening it in Word to preserve its stored date. Rasterize the PDF with Poppler at 150 DPI.

## Rendering and comparison

`renderNotePdf(data)` returns a PDF Buffer. Pass `null` to render the empty stationery. Each page holds ten numbered rows. A continued note repeats the metadata, table headings, signature block and footer, and shows its page number below the signatures.

The renderer uses the supplied Hacen Tunisia, Cambria collection and Times New Roman Bold files. Aptos Regular and Bold were recovered from the template's embedded Open XML font parts by reversing their package obfuscation. The supplied logo and QR files match the package's image1.png and image3.jpeg byte for byte. The logo's transparent padding is accounted for in the header frame. For the QR, Word crops the source and embeds a 133 × 133 pixel print image.

Run `pnpm pdf:sample` to generate `out/sample-972.pdf`. Run `pnpm pdf:diff` with Poppler's `pdftoppm` on PATH for the expected, actual, diff, side-by-side and 50% overlay PNGs under `tests/output/{Template,Sample-972}/`. Both comparisons use the complete 150 DPI page, Pixelmatch's 0.1 color threshold and its anti-alias detection. The acceptance limit is strictly less than 0.2% of all pixels.
