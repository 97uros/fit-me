import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  email = '';
  password = '';
  firstName = ''; // Full name
  dob: string | null = null; // Date of birth as string
  height: number | null = null;
  weight: number | null = null;
  gender: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private auth: Auth,
    private router: Router,
    private authService: AuthService,
    private firestore: Firestore
  ) {}

  register() {
    this.errorMessage = null; // Clear previous errors

    // Check if all fields are filled
    if (!this.firstName || !this.dob || !this.height || !this.weight || !this.gender) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    // Calculate age from DOB
    const age = this.calculateAge(this.dob);

    // Create user in Firebase Auth
    createUserWithEmailAndPassword(this.auth, this.email, this.password)
      .then((userCredential) => {
        const userId = userCredential.user.uid;

        // After successful registration, save additional profile data to Firestore
        const profileData = {
          firstName: this.firstName,
          age: age, // Use calculated age
          height: this.height,
          weight: this.weight,
          gender: this.gender
        };

        // Save user profile information to Firestore under the 'users' collection
        setDoc(doc(this.firestore, `users/${userId}`), profileData) // Use setDoc to save directly to the user document
          .then(() => {
            console.log('Profile data added successfully'); // Add logging
            this.router.navigate(['/dashboard']);
          })
          .catch(err => {
            this.errorMessage = 'Failed to save profile data. Please try again.';
            console.error('Profile error', err);
          });
      })
      .catch(err => {
        switch (err.code) {
          case 'auth/email-already-in-use':
            this.errorMessage = 'Email already in use!';
            break;
          case 'auth/invalid-email':
            this.errorMessage = 'Invalid email address. Please enter a valid email.';
            break;
          case 'auth/weak-password':
            this.errorMessage = 'Password should be at least 6 characters.';
            break;
          default:
            this.errorMessage = 'An unexpected error occurred. Please try again.';
        }
        console.error('Registration error', err);
      });
  }

  calculateAge(dob: string): number {
    const dobDate = new Date(dob); // Convert the string to a Date object
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const monthDiff = today.getMonth() - dobDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--;
    }
    return age;
  }
}
