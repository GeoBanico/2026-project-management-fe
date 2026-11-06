import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('Rendered routes', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('renders projects after the root redirect and exposes the inline create form', async () => {
    const harness = await RouterTestingHarness.create('/');
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/v1/project').flush({ data: [] });
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('No projects yet');
    const create = Array.from(harness.routeNativeElement!.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Create project'),
    )!;
    create.click();
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('app-project-form input')).toBeTruthy();
    expect(
      Array.from(harness.routeNativeElement!.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Refresh'),
      )?.disabled,
    ).toBe(true);
    http.verify();
  });
  it('renders contextual not-found for invalid IDs without requests and handles unknown routes', async () => {
    const harness = await RouterTestingHarness.create('/projects/0/tasks/1');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(
      'not found in the selected project context',
    );
    TestBed.inject(HttpTestingController).expectNone(() => true);
    await harness.navigateByUrl('/unknown');
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});
