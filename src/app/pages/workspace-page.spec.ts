import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ProjectDto, TaskDto, TaskStatus } from '../core/models';
import { WorkspacePage } from './workspace-page';
const project: ProjectDto = {
  id: 10,
  name: 'Project',
  description: '',
  startDate: null,
  endDate: null,
  status: 'COMPLETED',
  timeLeft: 'Completed',
  active: true,
};
function task(id: number, status: TaskStatus = 'COMPLETED', children: number[] = []): TaskDto {
  return {
    id,
    name: `Task ${id}`,
    description: '',
    startDate: '2026-12-01T01:00:00Z',
    endDate: '2026-12-02T01:00:00Z',
    status,
    isActive: true,
    dependentTasks: children.map((id) => task(id)),
  };
}
describe('Page orchestration and refresh behavior', () => {
  let http: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let page: WorkspacePage;
  const values = { name: 'New name', description: '', startDate: '', endDate: '' };
  beforeEach(() => {
    params = new BehaviorSubject(convertToParamMap({ projectId: '10', taskId: '1' }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: params } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function create() {
    page = TestBed.runInInjectionContext(() => new WorkspacePage());
  }
  function load(
    tasks = [task(1, 'COMPLETED', [2]), task(2, 'COMPLETED', [3]), task(3)],
    selected = tasks[0],
    candidates: TaskDto[] = [],
  ) {
    http.expectOne('/api/v1/project/10').flush({ data: project });
    http.expectOne('/api/v1/task?projectId=10').flush({ data: tasks });
    if (selected) {
      http.expectOne(`/api/v1/task/${selected.id}`).flush({ data: selected });
      http
        .expectOne(`/api/v1/task/dependable-list?taskId=${selected.id}`)
        .flush({ data: candidates });
    }
  }
  it('confirms backward changes and refreshes every task, summary, detail, and candidates after cascading reset', () => {
    create();
    load();
    page.changeStatus('PENDING');
    http.expectNone((request) => request.method === 'PATCH');
    expect(page.confirmation()?.message).toContain('downstream');
    page.confirm();
    http.expectOne('/api/v1/task/1/status?status=PENDING').flush({ message: 'Success' });
    load([task(1, 'PENDING', [2]), task(2, 'PENDING', [3]), task(3, 'PENDING')]);
    expect(page.data().tasks.map((t) => t.status)).toEqual(['PENDING', 'PENDING', 'PENDING']);
    expect(page.data().project).toEqual(project);
    expect(page.busy()).toBe(false);
  });
  it('cancels confirmation without a mutation', () => {
    create();
    load();
    page.changeStatus('PENDING');
    page.confirmation.set(null);
    http.expectNone((request) => request.method === 'PATCH');
  });
  it('blocks skipped forward progress and starting with incomplete prerequisites', () => {
    create();
    load([task(1, 'PENDING'), task(2, 'PENDING', [1])]);
    page.changeStatus('COMPLETED');
    page.changeStatus('IN_PROGRESS');
    http.expectNone((request) => request.method === 'PATCH');
    expect(page.reason('IN_PROGRESS')).toContain('prerequisites');
  });
  it('uses selected task as principal and refreshes relationships and candidates', () => {
    create();
    load([task(1)], task(1), [task(2)]);
    page.candidateId.set('2');
    page.addDependent();
    http.expectOne('/api/v1/task/1/dependency?dependentId=2').flush({});
    load([task(1, 'COMPLETED', [2]), task(2)]);
    expect(page.candidateId()).toBe('');
    page.removeDependent(task(2));
    http.expectOne('/api/v1/task/1/dependency?dependentId=2').flush({});
    load();
  });
  it('distinguishes saved data from failed refresh and retries reads without repeating the mutation', () => {
    create();
    load();
    page.changeStatus('IN_PROGRESS');
    page.confirm();
    http.expectOne('/api/v1/task/1/status?status=IN_PROGRESS').flush({});
    const tasks = http.expectOne('/api/v1/task?projectId=10');
    http
      .expectOne('/api/v1/project/10')
      .flush({ detail: 'Refresh failed' }, { status: 500, statusText: 'Error' });
    expect(tasks.cancelled).toBe(true);
    expect(page.notice()).toContain('Saved');
    expect(page.error()).toBe('Refresh failed');
    page.refresh();
    load();
    http.expectNone((request) => request.method === 'PATCH');
  });
  it('keeps the editor after failed saves and suppresses duplicate submissions', () => {
    params.next(convertToParamMap({}));
    create();
    http.expectOne('/api/v1/project').flush({ data: [] });
    page.openEditor('project');
    page.save(values);
    page.save(values);
    http
      .expectOne('/api/v1/project')
      .flush({ message: 'Rejected' }, { status: 400, statusText: 'Bad Request' });
    expect(page.editor()).not.toBeNull();
    expect(page.saveError()).toBe('Rejected');
    expect(page.busy()).toBe(false);
  });
  it('reloads the list after create without trying to infer a generated ID', () => {
    params.next(convertToParamMap({}));
    create();
    http.expectOne('/api/v1/project').flush({ data: [] });
    page.openEditor('project');
    page.save(values);
    http.expectOne('/api/v1/project').flush({ message: 'Success' });
    http.expectOne('/api/v1/project').flush({ data: [project, { ...project, id: 11 }] });
    expect(page.data().projects.length).toBe(2);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });
  it('rejects invalid route IDs before HTTP', () => {
    params.next(convertToParamMap({ projectId: '0' }));
    create();
    expect(page.notFound()).toBe(true);
    http.expectNone(() => true);
  });
  it('rejects a task in the wrong project before fetching task details', () => {
    create();
    http.expectOne('/api/v1/project/10').flush({ data: project });
    http.expectOne('/api/v1/task?projectId=10').flush({ data: [task(2)] });
    expect(page.notFound()).toBe(true);
    http.expectNone('/api/v1/task/1');
  });
  it('cancels stale reads when route parameters change', () => {
    create();
    const oldProject = http.expectOne('/api/v1/project/10');
    const oldTasks = http.expectOne('/api/v1/task?projectId=10');
    params.next(convertToParamMap({}));
    expect(oldProject.cancelled).toBe(true);
    expect(oldTasks.cancelled).toBe(true);
    http.expectOne('/api/v1/project').flush({ data: [] });
    expect(page.data().project).toBeNull();
  });
  it('navigates to the project after deleting the selected task', () => {
    create();
    load();
    page.deleteTask(page.data().task!);
    page.confirm();
    http.expectOne('/api/v1/task/1').flush({});
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/projects', 10]);
  });
});
