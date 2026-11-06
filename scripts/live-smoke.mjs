// Explicitly invoked integration check. Creates temporary records and removes them.
import assert from 'node:assert/strict';
const base = process.env.API_URL ?? 'http://127.0.0.1:4200/api/v1';
async function request(path, method = 'GET', body, expected = 200) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Accept: 'application/json, application/problem+json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(json)}`);
  if (method !== 'GET' && expected === 200)
    assert.equal(json.data, undefined, 'Mutation must not need returned data');
  return json;
}
async function createAndFind(listPath, createPath, body) {
  const before = new Set((await request(listPath)).data.map((item) => item.id));
  await request(createPath, 'POST', body);
  const created = (await request(listPath)).data.filter((item) => !before.has(item.id));
  assert.equal(
    created.length,
    1,
    'Concurrent creation prevents unambiguous test-record identification',
  );
  return created[0];
}
let project;
const taskIds = [];
try {
  assert.equal((await request('/health')).data.database, 'UP');
  await request('/project', 'POST', { name: ' ' }, 400);
  project = await createAndFind('/project', '/project', {
    name: 'Frontend integration check',
    description: 'Temporary integration check records',
  });
  assert.equal(project.status, 'PENDING');
  assert.equal(project.startDate, null);
  await request(`/project/${project.id}`, 'PATCH', { description: 'Updated' });
  assert.equal((await request(`/project/${project.id}`)).data.description, 'Updated');
  const tasksPath = `/task?projectId=${project.id}`;
  for (const name of ['A', 'B', 'C']) {
    const task = await createAndFind(tasksPath, tasksPath, {
      name,
      startDate: '2026-12-01T01:00:00Z',
      endDate: '2026-12-02T09:00:00Z',
    });
    taskIds.push(task.id);
  }
  const [a, b, c] = taskIds;
  await request(`/task/${a}`, 'PATCH', { description: 'Edited task' });
  assert.equal((await request(`/task/${a}`)).data.description, 'Edited task');
  assert((await request(`/task/dependable-list?taskId=${a}`)).data.some((task) => task.id === b));
  await request(`/task/${a}/dependency?dependentId=${b}`, 'POST');
  await request(`/task/${b}/dependency?dependentId=${c}`, 'POST');
  assert((await request(`/task/${a}`)).data.dependentTasks.some((task) => task.id === b));
  const incoming = (await request(tasksPath)).data.filter((task) =>
    task.dependentTasks.some((dependent) => dependent.id === b),
  );
  assert.deepEqual(
    incoming.map((task) => task.id),
    [a],
  );
  await request(`/task/${c}/dependency?dependentId=${a}`, 'POST', undefined, 400);
  await request(`/task/${b}/status?status=IN_PROGRESS`, 'PATCH', undefined, 400);
  await request(`/task/${a}/status?status=COMPLETED`, 'PATCH', undefined, 400);
  for (const id of taskIds) {
    await request(`/task/${id}/status?status=IN_PROGRESS`, 'PATCH');
    await request(`/task/${id}/status?status=COMPLETED`, 'PATCH');
  }
  assert.equal((await request(`/project/${project.id}`)).data.status, 'COMPLETED');
  await request(`/task/${a}/status?status=IN_PROGRESS`, 'PATCH');
  const reset = (await request(tasksPath)).data;
  assert.equal(reset.find((task) => task.id === b).status, 'PENDING');
  assert.equal(reset.find((task) => task.id === c).status, 'PENDING');
  assert.equal((await request(`/project/${project.id}`)).data.status, 'IN_PROGRESS');
  await request(`/task/${a}/dependency?dependentId=${b}`, 'DELETE');
  await request(`/task/${a}/dependency?dependentId=${b}`, 'DELETE');
  console.log(
    'PASS: live proxy health, CRUD, validation, dependency direction/cycle checks, progression, and cascading reset.',
  );
} finally {
  if (project) {
    for (const id of taskIds) await request(`/task/${id}`, 'DELETE');
    assert.equal((await request(`/project/${project.id}`)).data.startDate, null);
    await request(`/project/${project.id}`, 'DELETE');
    await request(`/project/${project.id}`, 'GET', undefined, 404);
    assert.deepEqual((await request(`/task?projectId=${project.id}`)).data, []);
    console.log(
      'PASS: temporary tasks and project removed; empty schedule and deleted reads verified.',
    );
  }
}
