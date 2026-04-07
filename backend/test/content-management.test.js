const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { closeTestContext, createTestContext, requestJson } = require('./helpers/app');
const { buildTestFontBuffer, sha256Hex } = require('./helpers/font');

let context;

before(async () => {
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('collections, vocabulary, aliases, and admin family listing endpoints are available', async () => {
  const slugSeed = Date.now().toString();
  const fontBuffer = buildTestFontBuffer();
  const fontSha = sha256Hex(fontBuffer);

  const vocabularyResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/vocabulary',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(vocabularyResponse.status, 200);
  assert.ok(Array.isArray(vocabularyResponse.body.categories));
  assert.ok(Array.isArray(vocabularyResponse.body.licenses));

  const createCategoryResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/admin/vocabulary',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      type: 'category',
      name: `Collection Test ${slugSeed}`,
    },
  });
  assert.equal(createCategoryResponse.status, 201);
  assert.match(createCategoryResponse.body.slug, /^collection-test-/);

  const updateCategoryResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/vocabulary/category/${createCategoryResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      type: 'category',
      name: `Collection Test Updated ${slugSeed}`,
    },
  });
  assert.equal(updateCategoryResponse.status, 200);
  assert.match(updateCategoryResponse.body.slug, /^collection-test-updated-/);

  const createCollectionResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/admin/collections',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      titleEn: `Frontend Unblock ${slugSeed}`,
      descriptionEn: 'Backend-created collection for integration.',
      status: 'published',
      isFeatured: true,
    },
  });
  assert.equal(createCollectionResponse.status, 201);
  assert.equal(createCollectionResponse.body.status, 'published');
  assert.equal(createCollectionResponse.body.itemCount, 0);

  const adminCollectionsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/collections',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(adminCollectionsResponse.status, 200);
  assert.ok(
    adminCollectionsResponse.body.some((entry) => entry.id === createCollectionResponse.body.id),
  );

  const publicCollectionsResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/collections',
  });
  assert.equal(publicCollectionsResponse.status, 200);
  assert.ok(
    publicCollectionsResponse.body.some((entry) => entry.id === createCollectionResponse.body.id),
  );
  const createdCollectionSummary = publicCollectionsResponse.body.find(
    (entry) => entry.id === createCollectionResponse.body.id,
  );
  assert.ok('coverImageUrl' in createdCollectionSummary);
  assert.ok('specimenText' in createdCollectionSummary);

  const publicCollectionDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/collections/${createCollectionResponse.body.slug}`,
  });
  assert.equal(publicCollectionDetailResponse.status, 200);
  assert.equal(publicCollectionDetailResponse.body.id, createCollectionResponse.body.id);
  assert.ok(Array.isArray(publicCollectionDetailResponse.body.items));

  const familiesResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/families',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(familiesResponse.status, 200);
  assert.ok(Array.isArray(familiesResponse.body.items));
  assert.ok(typeof familiesResponse.body.pagination.totalItems === 'number');

  const licensesResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/licenses',
  });
  assert.equal(licensesResponse.status, 200);

  const filtersResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/fonts/filters',
  });
  assert.equal(filtersResponse.status, 200);
  assert.ok(Array.isArray(filtersResponse.body.licenses));
  assert.equal(typeof filtersResponse.body.licenses[0].code, 'string');
  assert.ok(Object.hasOwn(filtersResponse.body.licenses[0], 'summary'));
  assert.ok(Object.hasOwn(filtersResponse.body.licenses[0], 'url'));

  const patchMeAliasResponse = await requestJson(context, {
    method: 'PATCH',
    path: '/api/v1/auth/me',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      displayName: `Admin Alias ${slugSeed}`,
    },
  });
  assert.equal(patchMeAliasResponse.status, 200);
  assert.equal(patchMeAliasResponse.body.displayName, `Admin Alias ${slugSeed}`);

  const createPublisherAliasResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/admin/publishers',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      name: `Publisher ${slugSeed}`,
      websiteUrl: 'https://example.com/publisher',
      countryCode: 'ET',
    },
  });
  assert.equal(createPublisherAliasResponse.status, 201);

  const createDesignerAliasResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/admin/designers',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      name: `Designer ${slugSeed}`,
      websiteUrl: 'https://example.com/designer',
    },
  });
  assert.equal(createDesignerAliasResponse.status, 201);

  const createLicenseAliasResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/admin/licenses',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      code: `TEST-${slugSeed}`,
      name: `Test License ${slugSeed}`,
      summaryEn: 'Temporary license for admin endpoint coverage.',
      fullTextUrl: 'https://example.com/license',
      allowsRedistribution: true,
      allowsCommercialUse: true,
      requiresAttribution: true,
    },
  });
  assert.equal(createLicenseAliasResponse.status, 201);

  const failuresAliasResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/failures',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(failuresAliasResponse.status, 200);
  assert.ok(Array.isArray(failuresAliasResponse.body));

  const registerContributorResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/auth/register',
    body: {
      email: `family-admin-${slugSeed}@example.com`,
      password: 'ContributorPass123!',
      displayName: 'Family Admin Test',
      legalFullName: 'Family Admin Test',
      countryCode: 'ET',
    },
  });
  assert.equal(registerContributorResponse.status, 201);

  const createSubmissionResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/submissions',
    headers: {
      authorization: `Bearer ${registerContributorResponse.body.accessToken}`,
    },
    body: {
      familyNameEn: `Admin Family ${slugSeed}`,
      declaredLicenseId: licensesResponse.body[0].id,
      ownershipEvidenceType: 'ownership_statement',
      ownershipEvidenceValue: 'Created for admin family management testing.',
      contributorStatementText:
        'I confirm that I have the legal right to submit this font to the platform for review.',
      termsAcceptanceName: 'Family Admin Test',
      supportsLatin: true,
    },
  });
  assert.equal(createSubmissionResponse.status, 201);
  const familyId = createSubmissionResponse.body.family.id;
  const submissionId = createSubmissionResponse.body.id;

  const initUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/init',
    headers: {
      authorization: `Bearer ${registerContributorResponse.body.accessToken}`,
    },
    body: {
      submissionId,
      filename: `admin-family-${slugSeed}.ttf`,
      contentType: 'font/ttf',
    },
  });
  assert.equal(initUploadResponse.status, 201);

  const uploadPutResponse = await fetch(initUploadResponse.body.upload.url, {
    method: 'PUT',
    headers: {
      'content-type': 'font/ttf',
    },
    body: fontBuffer,
  });
  assert.equal(uploadPutResponse.status, 200);

  const completeUploadResponse = await requestJson(context, {
    method: 'POST',
    path: '/api/v1/uploads/complete',
    headers: {
      authorization: `Bearer ${registerContributorResponse.body.accessToken}`,
    },
    body: {
      uploadId: initUploadResponse.body.uploadId,
      sha256: fontSha,
    },
  });
  assert.equal(completeUploadResponse.status, 201);

  const familyDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/families/${familyId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(familyDetailResponse.status, 200);
  assert.equal(familyDetailResponse.body.id, familyId);
  assert.equal(familyDetailResponse.body.status, 'draft');
  assert.ok(Array.isArray(familyDetailResponse.body.styles));
  assert.ok(familyDetailResponse.body.styles.length >= 1);
  const styleId = familyDetailResponse.body.styles[0].id;

  const updateFamilyResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/families/${familyId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      descriptionEn: 'Updated through the admin family management endpoint.',
      supportsEthiopic: true,
      supportsLatin: true,
      categoryId: createCategoryResponse.body.id,
    },
  });
  assert.equal(updateFamilyResponse.status, 200);
  assert.equal(updateFamilyResponse.body.description.en, 'Updated through the admin family management endpoint.');
  assert.equal(updateFamilyResponse.body.supports.ethiopic, true);
  assert.equal(updateFamilyResponse.body.category.id, createCategoryResponse.body.id);

  const styleDetailResponse = await requestJson(context, {
    method: 'GET',
    path: `/api/v1/admin/families/${familyId}/styles/${styleId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(styleDetailResponse.status, 200);
  assert.equal(styleDetailResponse.body.id, styleId);

  const updateStyleResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/families/${familyId}/styles/${styleId}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      name: `Admin Style ${slugSeed}`,
      weightLabel: 'Book',
      isItalic: false,
      versionLabel: 'v-test',
    },
  });
  assert.equal(updateStyleResponse.status, 200);
  assert.equal(updateStyleResponse.body.name, `Admin Style ${slugSeed}`);
  assert.equal(updateStyleResponse.body.weightLabel, 'Book');
  assert.equal(updateStyleResponse.body.versionLabel, 'v-test');

  const archiveStyleResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/families/${familyId}/styles/${styleId}/archive`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(archiveStyleResponse.status, 201);
  assert.equal(archiveStyleResponse.body.status, 'archived');

  const restoreStyleResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/families/${familyId}/styles/${styleId}/restore`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(restoreStyleResponse.status, 201);
  assert.equal(restoreStyleResponse.body.status, 'draft');

  const archiveFamilyResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/families/${familyId}/archive`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(archiveFamilyResponse.status, 201);
  assert.equal(archiveFamilyResponse.body.status, 'archived');

  const restoreFamilyResponse = await requestJson(context, {
    method: 'POST',
    path: `/api/v1/admin/families/${familyId}/restore`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(restoreFamilyResponse.status, 201);
  assert.equal(restoreFamilyResponse.body.status, 'draft');

  const categoriesAliasResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/categories',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(categoriesAliasResponse.status, 200);
  assert.ok(categoriesAliasResponse.body.some((entry) => entry.id === createCategoryResponse.body.id));

  const publishersAliasResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/publishers',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(publishersAliasResponse.status, 200);
  assert.ok(
    publishersAliasResponse.body.some((entry) => entry.id === createPublisherAliasResponse.body.id),
  );

  const updatePublisherAliasResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/publishers/${createPublisherAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      name: `Publisher Updated ${slugSeed}`,
    },
  });
  assert.equal(updatePublisherAliasResponse.status, 200);
  assert.equal(updatePublisherAliasResponse.body.name, `Publisher Updated ${slugSeed}`);

  const designersAliasResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/designers',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(designersAliasResponse.status, 200);
  assert.ok(
    designersAliasResponse.body.some((entry) => entry.id === createDesignerAliasResponse.body.id),
  );

  const updateDesignerAliasResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/designers/${createDesignerAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      name: `Designer Updated ${slugSeed}`,
    },
  });
  assert.equal(updateDesignerAliasResponse.status, 200);
  assert.equal(updateDesignerAliasResponse.body.name, `Designer Updated ${slugSeed}`);

  const licensesAliasResponse = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/admin/licenses',
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(licensesAliasResponse.status, 200);
  assert.ok(
    licensesAliasResponse.body.some((entry) => entry.id === createLicenseAliasResponse.body.id),
  );

  const updateLicenseAliasResponse = await requestJson(context, {
    method: 'PATCH',
    path: `/api/v1/admin/licenses/${createLicenseAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
    body: {
      code: `TEST-${slugSeed}`,
      name: `Test License Updated ${slugSeed}`,
      summaryEn: 'Updated summary',
      fullTextUrl: 'https://example.com/license-updated',
      allowsRedistribution: true,
      allowsCommercialUse: false,
      requiresAttribution: true,
      isActive: true,
    },
  });
  assert.equal(updateLicenseAliasResponse.status, 200);
  assert.equal(updateLicenseAliasResponse.body.name, `Test License Updated ${slugSeed}`);

  const deletePublisherAliasResponse = await requestJson(context, {
    method: 'DELETE',
    path: `/api/v1/admin/publishers/${createPublisherAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(deletePublisherAliasResponse.status, 200);
  assert.equal(deletePublisherAliasResponse.body.success, true);

  const deleteDesignerAliasResponse = await requestJson(context, {
    method: 'DELETE',
    path: `/api/v1/admin/designers/${createDesignerAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(deleteDesignerAliasResponse.status, 200);
  assert.equal(deleteDesignerAliasResponse.body.success, true);

  const deleteLicenseAliasResponse = await requestJson(context, {
    method: 'DELETE',
    path: `/api/v1/admin/licenses/${createLicenseAliasResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(deleteLicenseAliasResponse.status, 200);
  assert.equal(deleteLicenseAliasResponse.body.success, true);

  const deleteCollectionResponse = await requestJson(context, {
    method: 'DELETE',
    path: `/api/v1/admin/collections/${createCollectionResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(deleteCollectionResponse.status, 200);
  assert.equal(deleteCollectionResponse.body.success, true);

  const deleteCategoryResponse = await requestJson(context, {
    method: 'DELETE',
    path: `/api/v1/admin/vocabulary/category/${createCategoryResponse.body.id}`,
    headers: {
      'x-user-email': 'admin@fonthabesha.local',
    },
  });
  assert.equal(deleteCategoryResponse.status, 200);
  assert.equal(deleteCategoryResponse.body.success, true);
});
