import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  API_BASE_URL,
  errorMessage,
  HealthApiService,
  ProjectApiService,
  TaskApiService,
} from './api';

describe('Typed API contracts', () => {
  let http: HttpTestingController;
  let projects: ProjectApiService;
  let tasks: TaskApiService;
  let health: HealthApiService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    projects = TestBed.inject(ProjectApiService);
    tasks = TestBed.inject(TaskApiService);
    health = TestBed.inject(HealthApiService);
  });
  afterEach(() => http.verify());
  it('reads project envelopes, including empty lists', () => {
    const result = vi.fn();
    projects.list().subscribe(result);
    const request = http.expectOne('/api/v1/project');
    expect(request.request.method).toBe('GET');
    request.flush({ data: [] });
    expect(result).toHaveBeenCalledWith([]);
    projects.get(1).subscribe(result);
    http.expectOne('/api/v1/project/1').flush({ data: { id: 1 } });
    expect(result).toHaveBeenLastCalledWith({ id: 1 });
  });
  it('rejects missing read data but accepts mutation success without data', () => {
    const error = vi.fn();
    projects.list().subscribe({ error });
    http.expectOne('/api/v1/project').flush({ message: 'Success' });
    expect(error.mock.calls[0][0].message).toContain('missing required data');
    const next = vi.fn();
    projects.create({ name: 'New' }).subscribe(next);
    const request = http.expectOne('/api/v1/project');
    expect(request.request.body).toEqual({ name: 'New' });
    expect(request.request.method).toBe('POST');
    request.flush({ message: 'Success' });
    expect(next).toHaveBeenCalled();
  });
  it('uses project PATCH and DELETE', () => {
    projects.update(2, { description: '' }).subscribe();
    const update = http.expectOne('/api/v1/project/2');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ description: '' });
    update.flush({});
    projects.delete(2).subscribe();
    const remove = http.expectOne('/api/v1/project/2');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
  it('uses task list, detail, and eligible downstream endpoints', () => {
    tasks.list(3).subscribe();
    const list = http.expectOne('/api/v1/task?projectId=3');
    expect(list.request.method).toBe('GET');
    list.flush({ data: [] });
    tasks.get(5).subscribe();
    http.expectOne('/api/v1/task/5').flush({ data: { id: 5 } });
    tasks.candidates(5).subscribe();
    const candidates = http.expectOne('/api/v1/task/dependable-list?taskId=5');
    expect(candidates.request.method).toBe('GET');
    candidates.flush({ data: [] });
  });
  it('creates and edits tasks using only the supplied body', () => {
    const body = {
      name: 'Task',
      startDate: '2026-12-01T01:00:00Z',
      endDate: '2026-12-02T01:00:00Z',
    };
    tasks.create(3, body).subscribe();
    const create = http.expectOne('/api/v1/task?projectId=3');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(body);
    create.flush({});
    tasks.update(5, { endDate: body.endDate }).subscribe();
    const update = http.expectOne('/api/v1/task/5');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ endDate: body.endDate });
    update.flush({});
    tasks.delete(5).subscribe();
    const remove = http.expectOne('/api/v1/task/5');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
  it('sends status and directed dependency requests with query parameters and no JSON entity', () => {
    tasks.setStatus(5, 'IN_PROGRESS').subscribe();
    const status = http.expectOne('/api/v1/task/5/status?status=IN_PROGRESS');
    expect(status.request.method).toBe('PATCH');
    expect(status.request.body).toBeNull();
    status.flush({});
    tasks.addDependent(5, 6).subscribe();
    const add = http.expectOne('/api/v1/task/5/dependency?dependentId=6');
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toBeNull();
    add.flush({});
    tasks.removeDependent(5, 6).subscribe();
    const remove = http.expectOne('/api/v1/task/5/dependency?dependentId=6');
    expect(remove.request.method).toBe('DELETE');
    remove.flush({});
  });
  it('reads health and preserves DOWN/503 errors', () => {
    const next = vi.fn();
    health.get().subscribe(next);
    http.expectOne('/api/v1/health').flush({ data: { database: 'UP' } });
    expect(next).toHaveBeenCalledWith({ database: 'UP' });
    const error = vi.fn();
    health.get().subscribe({ error });
    http
      .expectOne('/api/v1/health')
      .flush(
        { message: 'Database is unavailable', data: { database: 'DOWN' } },
        { status: 503, statusText: 'Unavailable' },
      );
    expect(error.mock.calls[0][0].status).toBe(503);
  });
  it('supports a configured API base URL', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/custom' },
      ],
    });
    TestBed.inject(ProjectApiService).list().subscribe();
    const controller = TestBed.inject(HttpTestingController);
    controller.expectOne('/custom/project').flush({ data: [] });
    controller.verify();
  });
});
describe('Error normalization', () => {
  it.each([
    [{ detail: 'Problem detail', message: 'Other' }, 'Problem detail'],
    [{ message: 'Application error' }, 'Application error'],
    [{ detail: 7, message: 'Useful' }, 'Useful'],
  ])('normalizes %j', (body, expected) =>
    expect(errorMessage(new HttpErrorResponse({ status: 400, error: body }))).toBe(expected),
  );
  it('handles browser and unknown failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Cannot connect');
    expect(errorMessage(new HttpErrorResponse({ status: 500, error: 'html' }))).toContain(
      'request failed',
    );
    expect(errorMessage(null)).toContain('Something went wrong');
  });
});
