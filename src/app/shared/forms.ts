import { Component, Directive, input, OnInit, output } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ProjectDto, TaskDto, TaskUpdateRequest } from '../core/models';
import { localInput, utcInput } from '../core/rules';

export interface FormValue {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}
export const nonblank = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { blank: true };
export function dateOrder(control: AbstractControl): ValidationErrors | null {
  const start = new Date(control.get('startDate')?.value as string).getTime();
  const end = new Date(control.get('endDate')?.value as string).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? null : { dateOrder: true };
}
export function changedFields(
  value: FormValue,
  original: ProjectDto | TaskDto | null,
  task: boolean,
): TaskUpdateRequest {
  const patch: TaskUpdateRequest = {};
  if (!original || value.name !== original.name) patch.name = value.name;
  if (!original || value.description !== (original.description ?? ''))
    patch.description = value.description;
  if (task) {
    const previous = original && 'dependentTasks' in original ? original : null;
    if (!previous || value.startDate !== localInput(previous.startDate))
      patch.startDate = utcInput(value.startDate);
    if (!previous || value.endDate !== localInput(previous.endDate))
      patch.endDate = utcInput(value.endDate);
  }
  return patch;
}
@Directive()
abstract class EditorForm implements OnInit {
  readonly entity = input<ProjectDto | TaskDto | null>(null);
  readonly saving = input(false);
  readonly error = input('');
  readonly save = output<FormValue>();
  readonly cancel = output<void>();
  readonly taskMode: boolean = false;
  readonly timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  submitted = false;
  readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [nonblank, Validators.maxLength(50)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    startDate: new FormControl('', { nonNullable: true }),
    endDate: new FormControl('', { nonNullable: true }),
  });
  ngOnInit() {
    const entity = this.entity();
    this.form.patchValue({
      name: entity?.name ?? '',
      description: entity?.description ?? '',
      startDate: localInput(entity?.startDate),
      endDate: localInput(entity?.endDate),
    });
    if (this.taskMode) {
      this.form.controls.startDate.addValidators(Validators.required);
      this.form.controls.endDate.addValidators(Validators.required);
      this.form.addValidators(dateOrder);
      this.form.updateValueAndValidity();
    }
  }
  invalid(field: keyof FormValue) {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted);
  }
  submit() {
    if (this.saving()) return;
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.valid) this.save.emit(this.form.getRawValue());
  }
}
@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule],
  templateUrl: './editor-form.html',
})
export class ProjectForm extends EditorForm {}
@Component({
  selector: 'app-task-form',
  imports: [ReactiveFormsModule],
  templateUrl: './editor-form.html',
})
export class TaskForm extends EditorForm {
  override readonly taskMode = true;
}
