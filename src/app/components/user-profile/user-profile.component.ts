import { Component, OnInit, ElementRef, viewChild, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, getAuth, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  userId: string | null = null;
  profileData: any = {
    firstName: '',
    dob: '',
    height: null,
    weight: null,
    gender: null,
    profilePicture: null 
  };
  selectedFile: File | null = null;
  isHovering = false;
  errorMessage: string | null = null;
  isEditing = false;
  userWeight: number | null = null;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(
    private auth: Auth, 
    private firestore: Firestore, 
    private storage: Storage, 
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (this.userId) {
      this.fetchProfileData();
    } else {
      this.router.navigate(['/login']);
    }
  }

  fetchProfileData() {
    const profileDocRef = doc(this.firestore, `users/${this.userId}`);
    getDoc(profileDocRef).then(docSnap => {
      if (docSnap.exists()) {
        this.profileData = docSnap.data();
        this.userWeight = this.profileData.weight !== undefined ? this.profileData.weight : null; // Check if weight exists
      } else {
        this.errorMessage = 'No profile data found. You can create a new profile.';
      }
    }).catch(err => {
      console.error('Error fetching profile data', err);
    });
  }

  changeUserWeight() {
    if (this.userWeight !== null) { // Check if userWeight is not null
      this.userService.addBodyWeight(this.userWeight);
    } else {
      console.error('User weight is not set.');
      // Handle the situation where userWeight is null
    }
  }

  async updateProfile() {
    this.userWeight = this.profileData.weight; // Update userWeight based on the current profile data
    await this.changeUserWeight(); // This will check if userWeight is not null before proceeding
    const profileDocRef = doc(this.firestore, `users/${this.userId}`);
    try {
      await setDoc(profileDocRef, this.profileData, { merge: true });
      console.log('Profile updated successfully');
      await this.fetchProfileData(); // Refetch data after update
      this.isEditing = false; 
    } catch (err) {
      this.errorMessage = 'Failed to update profile data. Please try again.';
      console.error('Update error', err);
    }
}

  editProfile() {
    this.isEditing = true;
  }

   // Profile picture

   onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file && this.userId) {
      const storageRef = ref(this.storage, `profile_pictures/${this.userId}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      // Listen for upload progress and completion
      uploadTask.on(
        'state_changed', 
        snapshot => {
          // Optional: Track upload progress if needed
        },
        error => {
          console.error('Upload error:', error);
          this.errorMessage = 'Failed to upload image.';
        },
        () => {
          // Get the download URL after successful upload
          getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
            this.profileData.profilePicture = downloadURL;
            this.saveProfilePicture(downloadURL);  // Save the image URL to Firestore
          });
        }
      );
    }
  }

  saveProfilePicture(downloadURL: string) {
    const profileDocRef = doc(this.firestore, `users/${this.userId}`);
    updateDoc(profileDocRef, { profilePicture: downloadURL })
      .then(() => {
        console.log('Profile picture updated successfully.');
      })
      .catch(err => {
        console.error('Error updating profile picture:', err);
      });
  }

  onChangePicture() {
    this.fileInput.nativeElement.click();
  }

  removeProfilePicture() {
    if (this.userId && this.profileData.profilePicture) {
      const storageRef = ref(this.storage, `profile_pictures/${this.userId}`);

      // Delete the image from Firebase Storage
      deleteObject(storageRef).then(() => {
        // Remove the profile picture URL from Firestore
        const profileDocRef = doc(this.firestore, `users/${this.userId}`);
        updateDoc(profileDocRef, { profilePicture: '' })
          .then(() => {
            this.profileData.profilePicture = ''; // Clear the local profile picture
            console.log('Profile picture removed successfully.');
          })
          .catch(err => {
            console.error('Error removing profile picture from Firestore:', err);
            this.errorMessage = 'Failed to remove profile picture from Firestore.';
          });
      }).catch(err => {
        console.error('Error deleting profile picture from Storage:', err);
        this.errorMessage = 'Failed to remove profile picture from Storage.';
      });
    }
  }


  deleteAccount() {
    const user = this.auth.currentUser; 
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (user) {
        const email = user.email; 
        const password = prompt('Please enter your password to confirm deletion:'); 
        if (password && email) {
          const credential = EmailAuthProvider.credential(email, password);
          reauthenticateWithCredential(user, credential)
            .then(() => {
              return deleteUser(user);
            })
            .then(() => {
              const userDocRef = doc(this.firestore, `users/${user.uid}`);
              return deleteDoc(userDocRef);
            })
            .then(() => {
              console.log('Account and user data deleted successfully');
              this.router.navigate(['/login']); 
            })
            .catch(err => {
              console.error('Error deleting account', err);
              this.errorMessage = 'Failed to delete account. Please ensure your password is correct.';
            });
        } else {
          this.errorMessage = 'Password is required to delete the account.';
        }
      } else {
        this.errorMessage = 'User not authenticated.';
      }
    }
  }

  get age(): number | null {
    if (!this.profileData.dob) return null;
    
    const dob = new Date(this.profileData.dob);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970); // subtract 1970 to get age
  }
}
