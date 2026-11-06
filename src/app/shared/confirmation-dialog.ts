import {
  AfterViewInit,
  Component,
  ElementRef,
  input,
  OnDestroy,
  output,
  viewChild,
} from '@angular/core';

@Component({ selector: 'app-confirmation-dialog', templateUrl: './confirmation-dialog.html' })
export class ConfirmationDialog implements AfterViewInit, OnDestroy {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly confirm = output<void>();
  readonly cancel = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private previous: HTMLElement | null = null;
  ngAfterViewInit() {
    this.previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.dialog().nativeElement.showModal();
  }
  ngOnDestroy() {
    this.dialog().nativeElement.close();
    this.previous?.focus();
  }
}
