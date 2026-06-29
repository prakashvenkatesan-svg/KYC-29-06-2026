# BOID PDF Template Setup

## Goal

Make `BO ID` behave like `CLIENT NAME` and other correctly filled PDF fields.

The current BOID value flow is already correct:

1. Allocate BOID from `master_data.public.boid_master`
2. Save BOID into `aionion_capital_db.public.kyc_applications.boid`
3. Use that stored BOID during PDF generation

The remaining issue is only the PDF template structure.

## Why BOID Needs Extra Work

Fields like `CLIENT NAME` fill correctly because they are real PDF form fields.

The visible `BO ID` boxes in the current template are mostly visual table cells and labels, not actual PDF text fields. Because of that, the system must use overlay coordinates unless the template is updated.

## Recommended Permanent Fix

Edit `server/templates/account_opening_form.pdf` in Adobe Acrobat and create real text fields exactly inside each visible `BO ID` box.

Recommended field names:

- `boid_page1`
- `boid_page2`

Add more only if there are more approved visible BOID boxes:

- `boid_page3`
- `boid_page4`

## Acrobat Steps

1. Open `server/templates/account_opening_form.pdf` in Adobe Acrobat Pro.
2. Open `Prepare Form`.
3. Navigate to the page with the visible `BO ID` box.
4. Add a new text field exactly inside the BOID box.
5. Set the field name:
   - page 1 -> `boid_page1`
   - additional KYC page -> `boid_page2`
6. Make sure each BOID field name is unique.
7. Save the PDF template.

## Project Config After Template Update

Update `server/.env`:

```env
ACCOUNT_OPENING_BOID_FIELD_NAMES=boid_page1,boid_page2
ACCOUNT_OPENING_BOID_REPEAT_FIELD_NAMES=
ACCOUNT_OPENING_BOID_OVERLAYS=
ACCOUNT_OPENING_BOID_OVERLAY=
```

## Expected Result

After the template contains real BOID fields:

- BOID will be fetched from DB only
- BOID will fill exact field positions
- No coordinate tuning will be needed
- BOID will behave like `CLIENT NAME`

## If Template Is Not Updated

If the PDF template is not updated, BOID can still be shown only by overlay:

- visible BOID boxes -> overlay
- real `Demat Account ID_*` fields -> optional field mapping

That works, but it is not the clean long-term solution.
