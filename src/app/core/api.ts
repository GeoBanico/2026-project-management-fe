import { inject, Injectable, InjectionToken } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  ApiResponse,
  HealthDto,
  ProjectCreateRequest,
  ProjectDto,
  ProjectUpdateRequest,
  TaskCreateRequest,
  TaskDto,
  TaskStatus,
  TaskUpdateRequest,
} from './models';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});
export function readData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined || response.data === null)
    throw new Error('The server response is missing required data. Please retry.');
  return response.data;
}
export function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'Cannot connect to the server. Check your connection and retry.';
    const body: unknown = error.error;
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      for (const key of ['detail', 'message'])
        if (typeof record[key] === 'string' && record[key]) return record[key];
    }
    return 'The request failed. Please retry.';
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please retry.';
}
@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  list() {
    return this.http.get<ApiResponse<ProjectDto[]>>(`${this.base}/project`).pipe(map(readData));
  }
  get(id: number) {
    return this.http.get<ApiResponse<ProjectDto>>(`${this.base}/project/${id}`).pipe(map(readData));
  }
  create(body: ProjectCreateRequest) {
    return this.http.post<ApiResponse>(`${this.base}/project`, body);
  }
  update(id: number, body: ProjectUpdateRequest) {
    return this.http.patch<ApiResponse>(`${this.base}/project/${id}`, body);
  }
  delete(id: number) {
    return this.http.delete<ApiResponse>(`${this.base}/project/${id}`);
  }
}
@Injectable({ providedIn: 'root' })
export class TaskApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private params(key: string, value: number | string) {
    return new HttpParams().set(key, value);
  }
  list(projectId: number) {
    return this.http
      .get<ApiResponse<TaskDto[]>>(`${this.base}/task`, {
        params: this.params('projectId', projectId),
      })
      .pipe(map(readData));
  }
  get(id: number) {
    return this.http.get<ApiResponse<TaskDto>>(`${this.base}/task/${id}`).pipe(map(readData));
  }
  create(projectId: number, body: TaskCreateRequest) {
    return this.http.post<ApiResponse>(`${this.base}/task`, body, {
      params: this.params('projectId', projectId),
    });
  }
  update(id: number, body: TaskUpdateRequest) {
    return this.http.patch<ApiResponse>(`${this.base}/task/${id}`, body);
  }
  delete(id: number) {
    return this.http.delete<ApiResponse>(`${this.base}/task/${id}`);
  }
  setStatus(id: number, status: TaskStatus) {
    return this.http.patch<ApiResponse>(`${this.base}/task/${id}/status`, null, {
      params: this.params('status', status),
    });
  }
  candidates(taskId: number) {
    return this.http
      .get<ApiResponse<TaskDto[]>>(`${this.base}/task/dependable-list`, {
        params: this.params('taskId', taskId),
      })
      .pipe(map(readData));
  }
  addDependent(id: number, dependentId: number) {
    return this.http.post<ApiResponse>(`${this.base}/task/${id}/dependency`, null, {
      params: this.params('dependentId', dependentId),
    });
  }
  removeDependent(id: number, dependentId: number) {
    return this.http.delete<ApiResponse>(`${this.base}/task/${id}/dependency`, {
      params: this.params('dependentId', dependentId),
    });
  }
}
@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  get(): Observable<HealthDto> {
    return this.http.get<ApiResponse<HealthDto>>(`${this.base}/health`).pipe(map(readData));
  }
}
