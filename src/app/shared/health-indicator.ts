import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { errorMessage, HealthApiService } from '../core/api';
@Component({ selector: 'app-health-indicator', templateUrl: './health-indicator.html' })
export class HealthIndicator {
  private readonly api = inject(HealthApiService);
  private readonly destroy = inject(DestroyRef);
  readonly state = signal('Checking');
  readonly loading = signal(false);
  readonly error = signal('');
  constructor() {
    this.retry();
  }
  retry() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.api
      .get()
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (health) => {
          this.state.set(health.database);
          this.loading.set(false);
        },
        error: (error) => {
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 503
              ? 'DOWN'
              : 'Connection failure',
          );
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
  }
}
