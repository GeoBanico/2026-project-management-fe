import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectDto, TaskDependencyDto, TaskDto, TaskStatus } from '../core/models';
import { displayDate } from '../core/rules';

@Component({
  selector: 'app-status-badge',
  template:
    '<span class="badge" [attr.data-status]="status()">{{ status().replaceAll("_", " ") }}</span>',
})
export class StatusBadge {
  readonly status = input.required<TaskStatus>();
}
@Component({ selector: 'app-schedule-summary', templateUrl: './schedule-summary.html' })
export class ScheduleSummary {
  readonly schedule = input.required<
    Pick<ProjectDto, 'startDate' | 'endDate'> & { timeLeft?: string }
  >();
  readonly date = displayDate;
}
@Component({
  selector: 'app-loading-state',
  template: '<p role="status" class="state">{{ message() }}</p>',
})
export class LoadingState {
  readonly message = input('Loading…');
}
@Component({
  selector: 'app-error-state',
  template:
    '<div role="alert" class="error"><p>{{ message() }}</p>@if (retryable()) { <button type="button" (click)="retry.emit()">Retry</button> }</div>',
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly retryable = input(true);
  readonly retry = output<void>();
}
@Component({ selector: 'app-empty-state', template: '<p class="state">{{ message() }}</p>' })
export class EmptyState {
  readonly message = input.required<string>();
}
@Component({
  selector: 'app-task-table',
  imports: [RouterLink, StatusBadge, EmptyState],
  templateUrl: './task-table.html',
})
export class TaskTable {
  readonly tasks = input.required<TaskDto[]>();
  readonly projectId = input.required<number>();
  readonly busy = input(false);
  readonly edit = output<TaskDto>();
  readonly remove = output<TaskDto>();
  readonly date = displayDate;
}
@Component({
  selector: 'app-dependency-list',
  imports: [RouterLink, StatusBadge, EmptyState],
  templateUrl: './dependency-list.html',
})
export class DependencyList {
  readonly heading = input.required<string>();
  readonly tasks = input.required<TaskDependencyDto[]>();
  readonly projectId = input.required<number>();
  readonly removable = input(false);
  readonly busy = input(false);
  readonly remove = output<TaskDependencyDto>();
}
