import { TestBed } from '@angular/core/testing';
import { ConfirmationDialog } from './confirmation-dialog';
describe('Confirmation dialog', () => {
  // jsdom lacks native dialog methods. Exercise our event/focus handling with
  // explicit stubs; native modal focus containment still needs browser QA.
  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });
  it('opens a named modal, cancels with Escape, and restores focus', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const fixture = TestBed.createComponent(ConfirmationDialog);
    fixture.componentRef.setInput('heading', 'Delete task?');
    fixture.componentRef.setInput('message', 'This cannot be undone.');
    const cancel = vi.fn();
    fixture.componentInstance.cancel.subscribe(cancel);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirmation-heading');
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    expect(cancel).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
    fixture.destroy();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
