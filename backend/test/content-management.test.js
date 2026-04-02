const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { closeTestContext, createTestContext, requestJson } = require('./helpers/app');

let context;

before(async () => {
  context = await createTestContext();
});

after(async () => {
  await closeTestContext(context);
});

test('collections, vocabulary, and admin family listing endpoints are available', async () => {
  const slugSeed = Date.now().toString();

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
