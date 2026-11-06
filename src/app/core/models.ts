export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type InstantString = string;
export interface ApiResponse<T = never> {
  status: string;
  message: string;
  data?: T;
  timestamp: InstantString;
}
export interface ApiProblem {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  [key: string]: unknown;
}
export interface ProjectDto {
  id: number;
  name: string;
  description: string | null;
  startDate: InstantString | null;
  endDate: InstantString | null;
  timeLeft: string;
  status: TaskStatus;
  active: boolean;
}
export interface TaskDependencyDto {
  id: number;
  name: string;
  description: string | null;
  startDate: InstantString;
  endDate: InstantString;
  status: TaskStatus;
  isActive: boolean | null;
}
export interface TaskDto extends TaskDependencyDto {
  dependentTasks: TaskDependencyDto[];
}
export interface HealthDto {
  database: 'UP' | 'DOWN';
}
export interface ProjectCreateRequest {
  name: string;
  description?: string | null;
}
export interface ProjectUpdateRequest {
  name?: string | null;
  description?: string | null;
}
export interface TaskCreateRequest extends ProjectCreateRequest {
  startDate: InstantString;
  endDate: InstantString;
}
export interface TaskUpdateRequest extends ProjectUpdateRequest {
  startDate?: InstantString | null;
  endDate?: InstantString | null;
  status?: TaskStatus | null;
}
