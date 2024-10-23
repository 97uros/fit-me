import { AfterViewInit, Component } from '@angular/core';
import { Auth, signInWithPopup, GoogleAuthProvider } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { doc, setDoc, Firestore } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit {
  quotes: string[] = [
    "Believe in yourself and all that you are.",
    "The only way to do great work is to love what you do.",
    "Success is not final, failure is not fatal.",
    "Your body can stand almost anything. It’s your mind that you have to convince."
  ];
  currentQuote: string = this.quotes[0];
  currentVideoIndex: number = 0;
  videos: HTMLVideoElement[] = [];

  constructor(
    private auth: Auth, 
    private router: Router,
    private toastr: ToastrService,
    private firestore: Firestore
  ) {}

  ngOnInit() {
    // Switch quotes every 15 seconds
    let quoteIndex = 0;
    setInterval(() => {
      quoteIndex = (quoteIndex + 1) % this.quotes.length;
      this.currentQuote = this.quotes[quoteIndex];
    }, 15000);
  }

  ngAfterViewInit() {
    this.videos = Array.from(document.querySelectorAll('video')) as HTMLVideoElement[];
    this.playVideo(this.currentVideoIndex);
  }

  playVideo(index: number) {
    const video = this.videos[index];
  
    // Hide all videos
    this.videos.forEach(v => {
      v.classList.remove('visible'); // Remove visible class
      v.style.opacity = '0'; // Set opacity to 0
      v.style.visibility = 'hidden'; // Set visibility to hidden
    });
  
    // Show the current video
    video.style.visibility = 'visible'; // Make visible first
    video.classList.add('visible'); // Add class to trigger fade in
    setTimeout(() => {
      video.style.opacity = '1'; // Set opacity to 1 after a slight delay
    }, 10); // Small timeout to allow visibility to take effect
  
    // Play the video
    video.play().catch(error => {
      console.error('Error playing video:', error);
    });
  
    // Add event listener for when the video ends
    video.onended = () => {
      this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length; // Move to the next video
      this.playVideo(this.currentVideoIndex); // Play the next video
    };
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
    provider.addScope('https://www.googleapis.com/auth/fitness.body.read');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/user.birthday.read');

    try {
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;

      if (accessToken) {
        const userId = this.auth.currentUser?.uid;
        if (userId) {
          const userDocRef = doc(this.firestore, `users/${userId}`);
          await setDoc(userDocRef, { googleFitAccessToken: accessToken }, { merge: true });
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.toastr.error('Google Fit access token not available.');
      }
    } catch (err) {
      this.toastr.error('Error signing in with Google');
      console.error('Google Sign-In error', err);
    }
  }
}
