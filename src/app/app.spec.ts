import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { App } from './app';
describe('App database indicator', () => {
  it('shows DOWN on 503, retries manually, and leaves the application shell visible', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/v1/health')
      .flush(
        { message: 'Database is unavailable', data: { database: 'DOWN' } },
        { status: 503, statusText: 'Unavailable' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DOWN');
    expect(fixture.nativeElement.querySelector('main')).toBeTruthy();
    fixture.nativeElement.querySelector('app-health-indicator button').click();
    http.expectOne('/api/v1/health').flush({ data: { database: 'UP' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('UP');
    http.verify();
  });
});
