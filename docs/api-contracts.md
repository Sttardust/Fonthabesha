# API Contracts Draft

## 1. Conventions

- base path: `/api/v1`
- content type: `application/json`
- auth header: `Authorization: Bearer <token>`
- timestamps use ISO 8601 UTC strings
- IDs use UUID strings

## 2. Pagination Envelope

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0,
    "hasNext": false
  }
}
```

## 3. Public API

### `GET /fonts`

Purpose:

- list published font families for browse pages

Query parameters:

- `q`
- `category`
- `script`
- `license`
- `publisher`
- `designer`
- `tag`
- `variable`
- `sort`
- `page`
- `pageSize`

Allowed `sort` values:

- `popular`
- `newest`
- `alphabetical`

Response item shape:

```json
{
  "id": "uuid",
  "slug": "awaze",
  "name": {
    "en": "Awaze",
    "am": "አዋዜ",
    "native": "አዋዜ"
  },
  "category": "Sans",
  "script": "ethiopic",
  "license": {
    "code": "OFL-1.1",
    "name": "SIL Open Font License 1.1"
  },
  "publisher": {
    "id": "uuid",
    "name": "Fonthabesha"
  },
  "designers": [
    {
      "id": "uuid",
      "name": "Designer Name"
    }
  ],
  "tags": ["Readable", "UI", "Amharic"],
  "numberOfStyles": 8,
  "hasVariableStyles": true,
  "defaultPreviewStyleId": "uuid",
  "coverImageUrl": "https://cdn.example.com/covers/awaze.jpg",
  "publishedAt": "2026-03-30T10:00:00Z"
}
```

### `GET /fonts/:slug`

Purpose:

- fetch complete detail for a published family page

Response shape:

```json
{
  "id": "uuid",
  "slug": "awaze",
  "name": {
    "en": "Awaze",
    "am": "አዋዜ",
    "native": "አዋዜ"
  },
  "description": {
    "en": "Readable Amharic sans family.",
    "am": "ለአማርኛ ተነባቢ ሳንስ ፎንት ቤተሰብ።"
  },
  "category": "Sans",
  "script": "ethiopic",
  "primaryLanguage": "am",
  "license": {
    "code": "OFL-1.1",
    "name": "SIL Open Font License 1.1",
    "summary": {
      "en": "Free to use, modify, and redistribute under OFL.",
      "am": "በOFL ፈቃድ መጠቀም፣ ማሻሻል እና መልሶ ማሰራጨት ይቻላል።"
    }
  },
  "publisher": {
    "id": "uuid",
    "name": "Fonthabesha",
    "slug": "fonthabesha"
  },
  "designers": [
    {
      "id": "uuid",
      "name": "Designer Name",
      "slug": "designer-name"
    }
  ],
  "tags": [
    { "id": "uuid", "name": { "en": "Readable", "am": "ተነባቢ" }, "slug": "readable" }
  ],
  "supports": {
    "ethiopic": true,
    "latin": true
  },
  "specimenDefaults": {
    "am": "ሰላም ዓለም",
    "en": "The quick brown fox"
  },
  "styles": [],
  "download": {
    "familyPackageAvailable": true
  },
  "relatedFamilies": [],
  "publishedAt": "2026-03-30T10:00:00Z",
  "version": "1.0.0"
}
```

### `GET /fonts/:slug/styles`

Purpose:

- fetch style-specific data if the frontend loads styles separately

Response item shape:

```json
{
  "id": "uuid",
  "name": "Regular",
  "slug": "regular",
  "weightClass": 400,
  "weightLabel": "Regular",
  "isItalic": false,
  "isVariable": false,
  "isDefault": true,
  "format": "ttf",
  "fileSizeBytes": 245120,
  "axes": [],
  "features": ["liga", "kern"],
  "metrics": {
    "capHeight": 710,
    "xHeight": 490
  }
}
```

### `GET /fonts/filters`

Purpose:

- return frontend filter vocabularies for browse UI

Response shape:

```json
{
  "categories": ["Sans", "Serif", "Display", "Handwritten"],
  "scripts": ["ethiopic"],
  "licenses": [
    { "code": "OFL-1.1", "name": "SIL Open Font License 1.1" }
  ],
  "publishers": [
    { "id": "uuid", "name": "Fonthabesha", "slug": "fonthabesha" }
  ],
  "designers": [
    { "id": "uuid", "name": "Designer Name", "slug": "designer-name" }
  ],
  "tags": [
    { "id": "uuid", "name": { "en": "Readable", "am": "ተነባቢ" }, "slug": "readable" }
  ]
}
```

### `GET /search/fonts`

Purpose:

- dedicated search endpoint if browse and search are split

Query parameters:

- `q`
- `page`
- `pageSize`
- all supported filter parameters from `/fonts`

Response:

- same envelope as `GET /fonts`

### `GET /collections`

Response item shape:

```json
{
  "id": "uuid",
  "slug": "best-amharic-ui-fonts",
  "title": {
    "en": "Best Amharic UI Fonts",
    "am": "ምርጥ የአማርኛ ዩአይ ፎንቶች"
  },
  "description": {
    "en": "Editorial picks for interfaces.",
    "am": "ለመተግበሪያ ገጾች የተመረጡ ፎንቶች።"
  },
  "coverImageUrl": "https://cdn.example.com/collections/ui-fonts.jpg",
  "itemCount": 6,
  "publishedAt": "2026-03-30T10:00:00Z"
}
```

### `GET /collections/:slug`

Response shape:

```json
{
  "id": "uuid",
  "slug": "best-amharic-ui-fonts",
  "title": {
    "en": "Best Amharic UI Fonts",
    "am": "ምርጥ የአማርኛ ዩአይ ፎንቶች"
  },
  "description": {
    "en": "Editorial picks for interfaces.",
    "am": "ለመተግበሪያ ገጾች የተመረጡ ፎንቶች።"
  },
  "items": []
}
```

### `POST /downloads/families/:familyId`

Purpose:

- issue a signed family package URL and record analytics

Response shape:

```json
{
  "downloadUrl": "https://cdn.example.com/signed/package.zip",
  "expiresAt": "2026-03-30T10:15:00Z"
}
```

### `POST /downloads/styles/:styleId`

Response shape:

```json
{
  "downloadUrl": "https://cdn.example.com/signed/style.ttf",
  "expiresAt": "2026-03-30T10:15:00Z"
}
```

## 4. Auth API

### `POST /auth/login`

Request:

```json
{
  "email": "reviewer@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "reviewer@example.com",
    "displayName": "Reviewer",
    "role": "reviewer"
  }
}
```

### `POST /auth/refresh`

Request:

```json
{
  "refreshToken": "jwt"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt"
}
```

### `POST /auth/logout`

Request:

```json
{
  "refreshToken": "jwt"
}
```

Response:

```json
{
  "success": true
}
```

### `GET /auth/me`

Response:

```json
{
  "id": "uuid",
  "email": "reviewer@example.com",
  "displayName": "Reviewer",
  "role": "reviewer"
}
```

### `PATCH /auth/me/profile`

Purpose:

- update contributor profile and contact information required for submissions

Request:

```json
{
  "legalFullName": "Abebe Kebede",
  "countryCode": "ET",
  "organizationName": "Habesha Type",
  "phoneNumber": "+251900000000"
}
```

Response:

```json
{
  "id": "uuid",
  "email": "contributor@example.com",
  "displayName": "Abebe",
  "legalFullName": "Abebe Kebede",
  "countryCode": "ET",
  "organizationName": "Habesha Type",
  "phoneNumber": "+251900000000",
  "role": "contributor"
}
```

## 5. Contributor API

### `GET /contributor/compliance/requirements`

Purpose:

- return the active contributor declaration and required profile fields before submission

Response:

```json
{
  "requiredProfileFields": [
    "legalFullName",
    "countryCode"
  ],
  "activeTerms": {
    "version": "v1.0",
    "title": "Contributor Submission Terms",
    "documentUrl": "https://example.com/legal/contributor-terms-v1.pdf"
  },
  "declarationText": "I declare that I own this font or have the right to distribute it under the selected license, and that the information I provide is accurate to the best of my knowledge."
}
```

### `POST /submissions`

Purpose:

- create a draft family owned by the contributor

Request:

```json
{
  "name": {
    "en": "Awaze",
    "am": "አዋዜ",
    "native": "አዋዜ"
  },
  "description": {
    "en": "Readable Amharic sans family.",
    "am": "ለአማርኛ ተነባቢ ሳንስ ፎንት ቤተሰብ።"
  },
  "categoryId": "uuid",
  "licenseId": "uuid",
  "publisherId": "uuid",
  "designerIds": ["uuid"],
  "tagIds": ["uuid"],
  "ownershipEvidence": {
    "type": "source_url",
    "value": "https://example.com/repository-or-license-source"
  },
  "contributorAssent": {
    "termsVersion": "v1.0",
    "acceptanceName": "Abebe Kebede",
    "accepted": true
  }
}
```

Response:

```json
{
  "id": "uuid",
  "familyId": "uuid",
  "status": "draft",
  "slug": "awaze"
}
```

### `PATCH /submissions/:id`

Purpose:

- update contributor-owned draft metadata

### `GET /submissions`

Purpose:

- list current contributor drafts and submitted items

Response item shape:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "slug": "awaze",
  "status": "draft",
  "declaredLicense": {
    "code": "OFL-1.1",
    "name": "SIL Open Font License 1.1"
  },
  "compliance": {
    "profileComplete": true,
    "termsAccepted": true,
    "ownershipEvidencePresent": true
  },
  "updatedAt": "2026-03-30T10:00:00Z"
}
```

### `POST /uploads/init`

Purpose:

- request a direct upload target

Request:

```json
{
  "submissionId": "uuid",
  "filename": "Awaze-Regular.ttf",
  "contentType": "font/ttf",
  "fileSizeBytes": 245120
}
```

Response:

```json
{
  "uploadId": "uuid",
  "storageKey": "raw-uploads/2026/03/30/uuid-Awaze-Regular.ttf",
  "uploadUrl": "https://storage.example.com/signed-upload",
  "headers": {
    "Content-Type": "font/ttf"
  },
  "expiresAt": "2026-03-30T10:15:00Z"
}
```

### `POST /uploads/complete`

Request:

```json
{
  "uploadId": "uuid",
  "submissionId": "uuid",
  "sha256": "hex"
}
```

Response:

```json
{
  "uploadId": "uuid",
  "processingStatus": "queued"
}
```

### `POST /submissions/:id/submit`

Purpose:

- send a draft to review

Response:

```json
{
  "id": "uuid",
  "familyId": "uuid",
  "status": "needs_review"
}
```

## 6. Admin Review API

### `GET /admin/reviews`

Purpose:

- list review queue

Query parameters:

- `status`
- `publisherId`
- `page`
- `pageSize`

Response item shape:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "slug": "awaze",
  "name": {
    "en": "Awaze",
    "am": "አዋዜ"
  },
  "status": "needs_review",
  "publisher": {
    "id": "uuid",
    "name": "Fonthabesha"
  },
  "submittedBy": {
    "id": "uuid",
    "displayName": "Contributor Name"
  },
  "submittedAt": "2026-03-30T10:00:00Z"
}
```

### `GET /admin/reviews/summary`

Purpose:

- return dashboard counters for reviewer triage

Response:

```json
{
  "counts": {
    "needsReview": 12,
    "processingFailed": 3,
    "changesRequested": 5,
    "approved7d": 18,
    "rejected7d": 2
  }
}
```

### `GET /admin/reviews/:submissionId`

Purpose:

- fetch draft family plus extracted metadata and review history

Response shape:

```json
{
  "family": {
    "id": "uuid",
    "slug": "awaze",
    "status": "needs_review",
    "name": {
      "en": "Awaze",
      "am": "አዋዜ"
    }
  },
  "submissionId": "uuid",
  "submission": {
    "submittedBy": {
      "id": "uuid",
      "displayName": "Contributor Name",
      "email": "contributor@example.com"
    },
    "submittedAt": "2026-03-30T10:00:00Z",
    "declaredLicense": {
      "code": "OFL-1.1",
      "name": "SIL Open Font License 1.1"
    },
    "ownershipEvidence": {
      "type": "source_url",
      "value": "https://example.com/repo"
    },
    "contributorAssent": {
      "termsVersion": "v1.0",
      "acceptedAt": "2026-03-30T09:55:00Z",
      "acceptanceName": "Abebe Kebede"
    }
  },
  "processing": {
    "status": "completed",
    "warnings": [
      {
        "severity": "warning",
        "code": "NAME_MISMATCH",
        "message": "Family naming differs slightly across uploaded files."
      }
    ],
    "blockingIssues": []
  },
  "styles": [],
  "reviewHistory": [],
  "permissions": {
    "canApprove": true,
    "canReject": true,
    "canRequestChanges": true
  }
}
```

### `POST /admin/reviews/:submissionId/approve`

Request:

```json
{
  "notes": "License confirmed and Ethiopic coverage validated."
}
```

Response:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "status": "approved",
  "publishedAt": "2026-03-30T10:05:00Z"
}
```

### `POST /admin/reviews/:submissionId/reject`

Request:

```json
{
  "notes": "License source missing."
}
```

Response:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "status": "rejected"
}
```

### `POST /admin/reviews/:submissionId/request-changes`

Request:

```json
{
  "notes": "Please add Amharic description and verify designer attribution."
}
```

Response:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "status": "draft"
}
```

### `GET /admin/uploads/failures`

Purpose:

- list failed upload-processing cases for admin recovery

Response item shape:

```json
{
  "uploadId": "uuid",
  "familyId": "uuid",
  "filename": "Awaze-Regular.ttf",
  "processingStatus": "processing_failed",
  "errorCode": "INVALID_FONT_FILE",
  "errorMessage": "Parser could not read required font tables.",
  "contributor": {
    "id": "uuid",
    "displayName": "Contributor Name"
  },
  "createdAt": "2026-03-30T10:00:00Z"
}
```

### `POST /admin/uploads/:uploadId/retry`

Purpose:

- retry processing for a failed upload when recovery is allowed

Response:

```json
{
  "uploadId": "uuid",
  "processingStatus": "queued"
}
```

### `POST /admin/reviews/:submissionId/archive`

Purpose:

- archive an approved or rejected family from active flows while preserving history

Response:

```json
{
  "submissionId": "uuid",
  "familyId": "uuid",
  "status": "archived"
}
```

## 7. Admin Vocabulary API

Protected CRUD endpoints are expected for:

- `/admin/publishers`
- `/admin/designers`
- `/admin/licenses`
- `/admin/categories`
- `/admin/tags`
- `/admin/collections`

Detailed request and response bodies can follow the same DTO patterns as the public resources, but with internal status fields and mutation support.

## 8. Analytics API

### `GET /admin/analytics/overview`

Response:

```json
{
  "totals": {
    "publishedFamilies": 120,
    "publishedStyles": 840,
    "downloads30d": 15000,
    "views30d": 62000
  },
  "topFamilies": [
    {
      "familyId": "uuid",
      "name": "Awaze",
      "downloads30d": 540
    }
  ]
}
```

## 9. Error Codes

Recommended initial error codes:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `FONT_NOT_FOUND`
- `STYLE_NOT_FOUND`
- `SUBMISSION_NOT_FOUND`
- `UPLOAD_NOT_FOUND`
- `UPLOAD_EXPIRED`
- `INVALID_FONT_FILE`
- `DUPLICATE_FONT_UPLOAD`
- `LICENSE_NOT_ALLOWED`
- `REVIEW_STATE_INVALID`
- `SEARCH_UNAVAILABLE`
- `RATE_LIMITED`

## 10. Contract Notes

- public endpoints must return only published resources
- admin endpoints may expose draft and rejected states
- contributor endpoints must scope records to ownership unless admin or reviewer access is used
- style file URLs themselves should never be permanently public in API payloads
