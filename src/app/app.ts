import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HealthIndicator } from './shared/health-indicator';

@Component({
  imports: [RouterOutlet, RouterLink, HealthIndicator],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
