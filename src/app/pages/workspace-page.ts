import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  EMPTY,
  forkJoin,
  map,
  Observable,
  of,
  startWith,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { ProjectApiService, TaskApiService, errorMessage } from '../core/api';
import {
  ProjectDto,
  TaskCreateRequest,
  TaskDependencyDto,
  TaskDto,
  TaskStatus,
} from '../core/models';
import { prerequisites, routeId, sorted, statuses, transitionReason } from '../core/rules';
import {
  DependencyList,
  EmptyState,
  ErrorState,
  LoadingState,
  ScheduleSummary,
  StatusBadge,
  TaskTable,
} from '../shared/display';
import { changedFields, FormValue, ProjectForm, TaskForm } from '../shared/forms';
import { ConfirmationDialog } from '../shared/confirmation-dialog';

interface PageData {
  projects: ProjectDto[];
  project: ProjectDto | null;
  tasks: TaskDto[];
  task: TaskDto | null;
  candidates: TaskDto[];
}
interface Editor {
  kind: 'project' | 'task';
  entity: ProjectDto | TaskDto | null;
}
interface Confirmation {
  heading: string;
  message: string;
  action: () => void;
}
const emptyData = (): PageData => ({
  projects: [],
  project: null,
  tasks: [],
  task: null,
  candidates: [],
});

@Component({
  selector: 'app-workspace-page',
  templateUrl: './workspace-page.html',
  imports: [
    RouterLink,
    StatusBadge,
    ScheduleSummary,
    TaskTable,
    DependencyList,
    ProjectForm,
    TaskForm,
    ConfirmationDialog,
    LoadingState,
    ErrorState,
    EmptyState,
  ],
})
export class WorkspacePage {
  private readonly projectsApi = inject(ProjectApiService);
  private readonly tasksApi = inject(TaskApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy = inject(DestroyRef);
  private readonly refreshRequests = new Subject<void>();
  private readonly routeChanges = new Subject<void>();
  readonly data = signal<PageData>(emptyData());
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly saveError = signal('');
  readonly notice = signal('');
  readonly notFound = signal(false);
  readonly editor = signal<Editor | null>(null);
  readonly confirmation = signal<Confirmation | null>(null);
  readonly candidateId = signal('');
  readonly statuses = statuses;
  projectId: number | null = null;
  taskId: number | null = null;

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(
        tap(() => {
          this.routeChanges.next();
          this.editor.set(null);
          this.confirmation.set(null);
          this.busy.set(false);
          this.notice.set('');
          this.data.set(emptyData());
        }),
      ),
      this.refreshRequests.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([params]) => {
          this.loading.set(true);
          this.error.set('');
          this.saveError.set('');
          this.notFound.set(false);
          this.candidateId.set('');
          const project = params.get('projectId');
          const task = params.get('taskId');
          this.projectId = routeId(project);
          this.taskId = routeId(task);
          if ((project !== null && !this.projectId) || (task !== null && !this.taskId)) {
            this.notFound.set(true);
            this.loading.set(false);
            return EMPTY;
          }
          return this.readPage().pipe(
            tap((data) => {
              this.data.set(data);
              this.loading.set(false);
            }),
            catchError((error) => {
              this.loading.set(false);
              this.error.set(errorMessage(error));
              this.notFound.set(error instanceof HttpErrorResponse && error.status === 404);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe();
  }
  private readPage(): Observable<PageData> {
    const projectId = this.projectId;
    const taskId = this.taskId;
    if (!projectId)
      return this.projectsApi
        .list()
        .pipe(map((projects) => ({ ...emptyData(), projects: sorted(projects) })));
    return forkJoin({
      project: this.projectsApi.get(projectId),
      tasks: this.tasksApi.list(projectId),
    }).pipe(
      switchMap(({ project, tasks }) => {
        const base: PageData = { ...emptyData(), project, tasks: sorted(tasks) };
        if (!taskId) return of(base);
        if (!tasks.some((task) => task.id === taskId)) {
          this.notFound.set(true);
          return of(emptyData());
        }
        return forkJoin({
          task: this.tasksApi.get(taskId),
          candidates: this.tasksApi.candidates(taskId),
        }).pipe(map(({ task, candidates }) => ({ ...base, task, candidates: sorted(candidates) })));
      }),
    );
  }
  refresh() {
    if (!this.busy() && !this.editor()) this.refreshRequests.next();
  }
  openEditor(kind: Editor['kind'], entity: Editor['entity'] = null) {
    if (!this.busy() && !this.loading()) {
      this.saveError.set('');
      this.editor.set({ kind, entity });
    }
  }
  closeEditor() {
    if (!this.busy()) {
      this.editor.set(null);
      this.saveError.set('');
    }
  }
  incoming() {
    return this.taskId ? prerequisites(this.data().tasks, this.taskId) : [];
  }
  reason(next: TaskStatus) {
    const task = this.data().task;
    return task ? transitionReason(task.status, next, this.incoming()) : 'Task unavailable';
  }
  private mutate(request: Observable<unknown>, destination?: unknown[]) {
    if (this.busy() || this.loading()) return;
    this.busy.set(true);
    this.saveError.set('');
    this.error.set('');
    this.notice.set('');
    request.pipe(takeUntil(this.routeChanges), takeUntilDestroyed(this.destroy)).subscribe({
      next: () => {
        this.busy.set(false);
        this.editor.set(null);
        this.notice.set('Saved successfully.');
        if (destination) void this.router.navigate(destination);
        else this.refresh();
      },
      error: (error) => {
        this.busy.set(false);
        if (this.editor()) this.saveError.set(errorMessage(error));
        else this.error.set(errorMessage(error));
      },
    });
  }
  save(value: FormValue) {
    const editor = this.editor();
    if (!editor || this.busy()) return;
    const patch = changedFields(value, editor.entity, editor.kind === 'task');
    if (editor.entity && Object.keys(patch).length === 0) {
      this.closeEditor();
      this.notice.set('No changes to save.');
      return;
    }
    if (editor.kind === 'project') {
      this.mutate(
        editor.entity
          ? this.projectsApi.update(editor.entity.id, patch)
          : this.projectsApi.create({ name: value.name, description: value.description }),
      );
    } else if (this.projectId) {
      this.mutate(
        editor.entity
          ? this.tasksApi.update(editor.entity.id, patch)
          : this.tasksApi.create(this.projectId, {
              name: value.name,
              description: value.description,
              startDate: patch.startDate!,
              endDate: patch.endDate!,
            } satisfies TaskCreateRequest),
      );
    }
  }
  deleteProject(project: ProjectDto) {
    this.ask(
      'Delete project?',
      `Delete “${project.name}”? Its tasks will also be hidden. This cannot be undone.`,
      () =>
        this.mutate(
          this.projectsApi.delete(project.id),
          this.projectId ? ['/projects'] : undefined,
        ),
    );
  }
  deleteTask(task: TaskDto) {
    this.ask(
      'Delete task?',
      `Delete “${task.name}” and remove its dependency links? This cannot be undone.`,
      () =>
        this.mutate(
          this.tasksApi.delete(task.id),
          this.taskId === task.id ? ['/projects', this.projectId] : undefined,
        ),
    );
  }
  changeStatus(next: TaskStatus) {
    const task = this.data().task;
    if (!task || this.reason(next) || this.busy()) return;
    const action = () => this.mutate(this.tasksApi.setStatus(task.id, next));
    if (statuses.indexOf(next) < statuses.indexOf(task.status))
      this.ask(
        'Move task backward?',
        'Active downstream tasks will reset to Pending, including tasks further down the dependency chain.',
        action,
      );
    else action();
  }
  addDependent() {
    const id = routeId(this.candidateId());
    if (this.taskId && id && this.data().candidates.some((task) => task.id === id))
      this.mutate(this.tasksApi.addDependent(this.taskId, id));
  }
  removeDependent(task: TaskDependencyDto) {
    if (this.taskId) this.mutate(this.tasksApi.removeDependent(this.taskId, task.id));
  }
  private ask(heading: string, message: string, action: () => void) {
    if (!this.busy() && !this.loading()) this.confirmation.set({ heading, message, action });
  }
  confirm() {
    const confirmation = this.confirmation();
    this.confirmation.set(null);
    confirmation?.action();
  }
}
