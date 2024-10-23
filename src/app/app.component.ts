import { Component, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ExercisesComponent } from './components/exercises/exercises.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { WorkoutsComponent } from './components/workouts/workouts.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [ 
    RouterLink, 
    RouterLinkActive, 
    RouterOutlet, 
    LoginComponent,
    DashboardComponent, 
    ExercisesComponent, 
    WorkoutsComponent, 
    CalendarComponent, 
    NavbarComponent,
    CommonModule 
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'fit-me';
  isAuthenticated = false;
  isLoading = true; // Add loading state

  constructor(private auth: Auth, private router: Router) {
    // Listen for authentication state changes
    onAuthStateChanged(this.auth, (user) => {
      this.isAuthenticated = !!user;
      this.isLoading = false; // Set loading to false once state is determined

      // Redirect if user is authenticated and on login or register pages
      if (this.isAuthenticated && (this.router.url === '/login' || this.router.url === '/register')) {
        this.router.navigate(['/dashboard']);
      }
    });
  }
}
