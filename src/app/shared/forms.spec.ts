import { TestBed } from '@angular/core/testing';
import { TaskDto } from '../core/models';
import { localInput } from '../core/rules';
import { changedFields, ProjectForm, TaskForm } from './forms';
const original: TaskDto = {
  id: 1,
  name: 'Task',
  description: 'Description',
  startDate: '2026-12-01T01:02:03.456Z',
  endDate: '2026-12-02T03:04:05.678Z',
  status: 'PENDING',
  isActive: true,
  dependentTasks: [],
};
describe('Reusable forms', () => {
  it('validates required, nonblank and oversized names and descriptions', () => {
    const fixture = TestBed.createComponent(ProjectForm);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;
    for (const name of ['', '   ', 'x'.repeat(51)]) {
      form.controls.name.setValue(name);
      expect(form.valid).toBe(false);
    }
    form.controls.name.setValue('Valid');
    form.controls.description.setValue('x'.repeat(301));
    expect(form.valid).toBe(false);
    form.controls.description.setValue('');
    expect(form.valid).toBe(true);
  });
  it('requires both dates and strictly ordered valid instants, including for edits', () => {
    const fixture = TestBed.createComponent(TaskForm);
    fixture.componentRef.setInput('entity', original);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;
    expect(form.valid).toBe(true);
    for (const end of ['', 'bad', localInput(original.startDate), '2020-01-01T00:00']) {
      form.controls.endDate.setValue(end);
      expect(form.valid).toBe(false);
    }
  });
  it('omits unchanged dates and fields and uses empty text to clear a description', () => {
    const values = {
      name: original.name,
      description: original.description!,
      startDate: localInput(original.startDate),
      endDate: localInput(original.endDate),
    };
    expect(changedFields(values, original, true)).toEqual({});
    expect(
      changedFields(
        { ...values, description: '', endDate: '2026-12-03T15:30:00.123' },
        original,
        true,
      ),
    ).toEqual({ description: '', endDate: new Date('2026-12-03T15:30:00.123').toISOString() });
  });
  it('retains values after server errors and prevents resubmission while saving', () => {
    const fixture = TestBed.createComponent(ProjectForm);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const save = vi.fn();
    component.save.subscribe(save);
    component.form.controls.name.setValue('Keep my input');
    component.submit();
    expect(save).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('saving', true);
    fixture.detectChanges();
    component.submit();
    expect(save).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('saving', false);
    fixture.componentRef.setInput('error', 'Save rejected');
    fixture.detectChanges();
    expect(component.form.controls.name.value).toBe('Keep my input');
    expect(fixture.nativeElement.textContent).toContain('Save rejected');
  });
  it('shows validation after submitting an invalid form and emits no save', () => {
    const fixture = TestBed.createComponent(TaskForm);
    fixture.detectChanges();
    const save = vi.fn();
    fixture.componentInstance.save.subscribe(save);
    fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(save).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[aria-invalid="true"]')).toBeTruthy();
  });
});
