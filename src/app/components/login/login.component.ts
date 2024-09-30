import { Component } from '@angular/core';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkoutService } from '../../services/workout.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']  // Optional, if you have a specific stylesheet
})
export class LoginComponent {
  email = '';
  password = '';
  errorMessage: string | null = null;  // Variable to hold the error message

  constructor(private auth: Auth, private router: Router, private workoutService: WorkoutService) {}

  login() {
    this.errorMessage = null;  // Clear any previous error message
    signInWithEmailAndPassword(this.auth, this.email, this.password)
      .then(() => {
        this.router.navigate(['/dashboard']);
      })
      .catch(err => {
        switch (err.code) {
          case 'auth/user-not-found':
            this.errorMessage = 'User not found. Please check your email and try again.';
            break;
          case 'auth/wrong-password':
            this.errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email address. Please enter a valid email.';
            break;
          default:
            this.errorMessage = 'An unexpected error occurred. Please try again.';
        }
        console.error('Login error', err);
      });
  }
}
