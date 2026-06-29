# BSE Export Mapping

This note maps the current KYC source tables in `aionion_capital_db` to the BSE UCC REST API request fields described in `UCC_REST_API 2.2 v.pdf`.

No code changes are included in this document. This is the field-mapping and implementation procedure to use before building BSE export.

## API shape

- BSE API base:
  - `https://uat.bseindia.in/UCC_REST_API_SERVICE/UCCService.svc`
- BSE add/modify function:
  - `AddUCCData_V5`
- Request method:
  - `POST`
- Request object:
  - `CLIENTDETAILS_V5`

## Current KYC source tables

- `public.kyc_applications`
- `public.contact_details`
- `public.identity_verifications`
- `public.pan_verifications`
- `public.personal_details`
- `public.bank_details`
- `public.digilocker_details`
- `public.client_codes`

## Mapping status

- `Direct`:
  a source value can be copied without exchange-specific transformation.
- `Transform`:
  source exists, but BSE needs a different code or format.
- `Missing`:
  source is not clearly stored in the current project.

## Recommended BSE field mapping

| BSE Field | Source | Status | Notes |
| --- | --- | --- | --- |
| `TRANSACTIONCODE` | fixed | Transform | Use `N` for first export and `M` for re-export/update if you want explicit BSE semantic. If table-driven local staging is used, this can be derived from whether BSE row exists. |
| `CLIENTTYPE` | fixed/business rule | Transform | For current retail KYC users, recommended default is `I`. Use `NI` or `INS` only when you actually support those flows. |
| `STATUS` | fixed/business rule | Transform | For current retail KYC users, recommended default is `CL`. BSE values are `OW`, `CL`, `ER`, `IN`. |
| `CATEGORY` | `identity_verifications.category` or `pan_verifications.category` | Missing | Current source values like `Individual or Person` do not match BSE category codes like `I`, `BCO`, etc. Needs explicit mapping table. |
| `CLIENTCODE` | `client_codes.client_code` | Direct | Current source already stores generated client code. |
| `PANNO` | `identity_verifications.pan_number` fallback `pan_verifications.pan_number` | Direct | Fits BSE format. |
| `POLITICALEXPERSON` | `personal_details.politically_exposed` | Transform | Map `Yes/No` into `Y/N`. |
| `ADDRESS1` | `identity_verifications.address_1` fallback `personal_details.aadhaar_address` | Transform | BSE uses this as permanent address string in sample request. |
| `PERMNEQUALCORP` | compare permanent vs correspondence source | Missing | No dedicated permanent-address structure exists today. Needs rule. |
| `ADDRESS2` | correspondence address | Transform | For current KYC flow, likely use full correspondence address string from `personal_details.aadhaar_address` or DigiLocker address, not city only. |
| `COUNTRY` | fixed/rule | Transform | BSE wants country name like `INDIA`, not NSE numeric code. |
| `STATE` | `identity_verifications.state` | Transform | BSE wants state name like `TAMIL NADU`, not NSE code. |
| `CITY` | `identity_verifications.address_2` | Transform | In current source data, `address_2` behaves like city. |
| `PINCODE` | `identity_verifications.pincode` | Direct | Use as string. |
| `TYPEOFSERVICE` | business rule | Missing | BSE values are `1/2/3/4`. No stored source column currently represents this preference. |
| `CONTACTDETAILS` | business rule | Missing | BSE values are `1/2/3`. No dedicated source column currently stores this preference. |
| `EMAIL` | `contact_details.email` | Direct | Fits BSE field. |
| `MOBILENUMBER` | `contact_details.mobile_number` | Direct | Fits BSE field for Indian users. |
| `STDCODE` | none | Missing | Not stored today. |
| `PHONENO` | none | Missing | Not stored today. |
| `EQ_CPCODE` | none | Missing | Not stored today. |
| `EQCMID` | none | Missing | Not stored today. |
| `FNOCPCODE` | none | Missing | Not stored today. |
| `FNOCMID` | none | Missing | Not stored today. |
| `DEPOSITORYNAME1` | derive from `kyc_applications.boid` format or configured DP source | Transform | If BOID is CDSL-style 16 digit, use `CDSL`. If NSDL account is split into DP/client portions, use `NSDL`. Current flow needs explicit rule. |
| `DEMANTID1` | DP ID source | Missing | Not stored separately today. |
| `DEPOSITORYPARTICIPANT1` | BOID or DP account source | Missing | Needs explicit BSE DP mapping rule. |
| `BANKNAME1` | `bank_details.bank_name` | Direct | Fits BSE field. |
| `ACCOUNTNO1` | `bank_details.account_number` | Direct | Fits BSE field. |
| `CLIENTAGGREMENTDATE` | none | Missing | No source column found. |
| `PROVIDEDETAILS` | business rule | Missing | Sample request uses numeric codes. Needs BSE spec mapping decision. |
| `INCOME` | `personal_details.annual_income` | Transform | Needs BSE income-code mapping. Current source is text like `1 - 5 Lakh`, `5 - 10 Lakh`. |
| `INCOMEDATE` | none | Missing | No source column found. |
| `NETWORTH` | `personal_details.net_worth` | Transform | Source exists but may be text and may not be consistently populated. |
| `NETWORTHDATE` | none | Missing | No source column found. |
| `ISACTIVE` | fixed/business rule | Transform | Likely default `Y` for active KYC records. |
| `UPDATEREASON` | none | Missing | No source column found. |
| `FIRSTNAME` | split from `identity_verifications.full_name` or `pan_verifications` names | Transform | Current source is full name; BSE asks for split fields. |
| `MIDDLENAME` | split from full name | Transform | Current source not stored separately for primary applicant. |
| `LASTNAME` | split from full name | Transform | Current source not stored separately for primary applicant. |
| `AADHARCARDNO` | `identity_verifications.aadhaar_number` | Direct | Use only if business is comfortable storing/exporting it. |
| `DATEOFBIRTH` | `identity_verifications.dob` | Transform | BSE sample uses `DD/MM/YYYY`. |
| `CLIENTNAME` | `identity_verifications.full_name` fallback `pan_verifications.full_name` fallback DigiLocker name | Direct | Fits BSE field. |
| `REGISTRATIONNO` | none | Missing | Not available for current individual flow. |
| `REGISTERINGAUTHORITY` | none | Missing | Not available for current individual flow. |
| `DATEOFREGISTRATION` | none | Missing | Not available for current individual flow. |
| `PLACEOFREGISTRATION` | none | Missing | Not available for current individual flow. |
| `WHETHERCORPORATE` | fixed/business rule | Transform | For current retail individual KYC users, recommended `N`. |
| `CINNO` | none | Missing | Not available for current individual flow. |
| `NUMBEROFDIRECTORS` | fixed | Transform | For current retail individual KYC users, recommended `0`. |
| `PARTNERS_KARTAUID` | none | Missing | Not stored today. |
| `PARTNERS_COPARCENERUID` | none | Missing | Not stored today. |
| `CONTACTPERSONNAME1/2` and related contact-person fields | none for individuals | Missing | For current retail flow likely `null`. Non-individual flow needs new source model. |
| `SERVERIP` | request metadata | Missing | Not stored in source tables. |
| `BATUSER` | operator/user metadata | Missing | Not stored in source tables. |
| `CASH` | product/segment selection | Missing | No stored segment-choice flags in current KYC source. |
| `EQUITY_DERIVATIVE` | segment selection | Missing | No stored source. |
| `SLB` | segment selection | Missing | No stored source. |
| `CURRENCY` | segment selection | Missing | No stored source. |
| `DEBT` | segment selection | Missing | No stored source. |
| `ISPOA` | `personal_details.ddpi` | Transform | BSE uses `Y/N`. Current source is `Yes/No`. Must convert. Also verify DDPI == POA for BSE business meaning before auto-mapping. |
| `POAFORFUND` | none clearly authoritative | Missing | Do not derive from DDPI without business confirmation. |
| `POAFORSECURITY` | none clearly authoritative | Missing | Do not derive from DDPI without business confirmation. |
| `DATEOFPOAFORFUND` | none | Missing | Not stored. |
| `DATEOFPOAFORSECURITY` | none | Missing | Not stored. |
| `PERCOUNTRY` | fixed/rule | Transform | For current Indian users, recommended `INDIA`. |
| `PERSTATE` | `identity_verifications.state` | Direct | BSE expects state name. |
| `PERCITY` | `identity_verifications.address_2` | Direct | City-like source in current data. |
| `PERPINCODE` | `identity_verifications.pincode` | Direct | Fits BSE field. |
| `CURRENCYCPCODE` | none | Missing | Not stored. |
| `CURRENCYCMID` | none | Missing | Not stored. |
| `ENROLLMENTNUMBER` | none | Missing | Not stored. |
| `COMMDERIVATIVES` | segment selection | Missing | Not stored. |
| `OPTEDFORNOMINATION` | nominee presence | Transform | Can derive `Y/N` from `nominee_details` rows if BSE export includes nominee logic. |
| `CUSTPANNO` and other custodian fields | none | Missing | Not stored for current retail KYC flow. |
| `EGR` | none | Missing | No source column found. |
| `BENEFICIALOWNACNTNO1` | `kyc_applications.boid` | Direct | Current BOID is the best candidate. |
| `OPTED_FOR_UPI` | none clearly stored | Missing | BSE supports `Y/N/NA/D` but current KYC flow has no dedicated UPI option field. |
| `BANKBRANCHIFSCCODE1` | `bank_details.ifsc_code` | Direct | Fits BSE field. |
| `PRIMARYORSECONDARYBANK1` | fixed/rule | Transform | Current source has only one bank record. Recommended default `P` for first bank. |
| `PRIMARYORSECONDARYDP1` | fixed/rule | Transform | Current source has only one BOID/DP record. Recommended default `P`. |
| `CLIENTNAMEDESCRIPTION` | none | Missing | No source column found. |

## Strong recommendations before coding BSE

1. Keep BSE mapping separate from NSE mapping.
   BSE expects names like `INDIA`, `MAHARASHTRA`, `MUMBAI`, `CL`, while NSE uses exchange-specific numeric/short codes.

2. Do not auto-reuse NSE defaults.
   Examples:
   - NSE state `29` is not valid for BSE `STATE`
   - NSE country `85` is not valid for BSE `COUNTRY`

3. Decide which BSE fields are allowed to be fixed defaults for your current retail flow.
   The most likely candidates are:
   - `CLIENTTYPE = I`
   - `STATUS = CL`
   - `WHETHERCORPORATE = N`
   - `NUMBEROFDIRECTORS = 0`
   - `PRIMARYORSECONDARYBANK1 = P`
   - `PRIMARYORSECONDARYDP1 = P`

4. Decide whether BSE export should be:
   - direct API push only, or
   - local DB staging plus push

5. Confirm the BSE-only business fields before implementation:
   - `CATEGORY`
   - `TYPEOFSERVICE`
   - `CONTACTDETAILS`
   - `PROVIDEDETAILS`
   - `INCOME`
   - `ISPOA`
   - `POAFORFUND`
   - `POAFORSECURITY`
   - `OPTED_FOR_UPI`

## Recommended implementation order

1. Create a BSE mapping service/query only after the above business defaults are confirmed.
2. Build one payload preview endpoint first for inspection.
3. Add actual BSE push logic only after payload preview is reviewed.
4. Keep request/response audit payloads, similar to NSE, for supportability.
