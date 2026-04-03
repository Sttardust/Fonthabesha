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

test('health metrics endpoint exposes prometheus-formatted operational metrics', async () => {
  const response = await requestJson(context, {
    method: 'GET',
    path: '/api/v1/health/metrics',
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/plain/);
  assert.match(response.body, /# HELP fonthabesha_app_info/);
  assert.match(response.body, /fonthabesha_process_uptime_seconds/);
  assert.match(response.body, /fonthabesha_dependency_up\{dependency="postgres"\}/);
  assert.match(response.body, /fonthabesha_submission_count\{status="needs_review"\}/);
});
