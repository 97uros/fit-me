import { Component, OnInit, ElementRef, viewChild, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, getAuth, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';
import { Firestore, doc, getDoc, updateDoc, setDoc, deleteDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { ToastrService } from 'ngx-toastr';
import { GFitService } from '../../services/gfit.service';

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
    dob: '',
    gender: null,
    profilePicture: null 
  };
  points: number = 0;
  achievements: any[] = [];
  errorMessage: string | null = null;

  height: any;
  weight: any;

  isMetric: boolean = true;
  // Goals
  stepGoal: number | null = null;
  caloriesGoal: number | null = null;
  weightGoal: number | null = null;
  inputWeightGoal: number | null = null;

  constructor(
    private auth: Auth, 
    private firestore: Firestore, 
    private storage: Storage, 
    private userService: UserService,
    private router: Router,
    private gfitService: GFitService,
    private toastr: ToastrService
  ) {
    this.isMetric = this.userService.isMetric;
  }

  ngOnInit(): void {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (this.userId) {
      this.fetchProfileData();
      this.fetchUserPoints();
      this.fetchUserAchievements();
      this.loadUserGoals();
      this.userService.loadUnitPreference().then(() => {
        this.isMetric = this.userService.isMetric;
        this.updateInputWeightGoal();
      });
    } else {
      this.router.navigate(['/login']);
    }
  }

  fetchProfileData() {
    this.userService.getGoogleFitProfileData().then(profileData => {
      if (profileData) {
        this.profileData = profileData;
        this.fetchWeightAndHeight();
      } else {
        this.errorMessage = 'No profile data found.';
      }
    }).catch(error => {
      this.errorMessage = 'Error fetching profile data';
      console.error('Error fetching profile data:', error);
    });
  }

  fetchWeightAndHeight() {
    Promise.all([
      this.userService.getUserWeight(),
      this.userService.getUserHeight()
    ]).then(([weight, height]) => {
      this.profileData.weight = weight;
      this.profileData.height = height;
      this.updateInputWeightGoal();
    }).catch(error => {
      console.error('Error fetching weight and height:', error);
      this.toastr.error('Could not fetch weight and height.');
    });
  }
  
  toggleUnits() {
    this.isMetric = !this.isMetric;
    this.userService.saveUnitPreference(this.isMetric);
    this.updateInputWeightGoal();
  }
  
  get displayHeight(): string {
    if (!this.profileData.height) return 'N/A';
    if (this.isMetric) {
      return `${this.profileData.height} cm`;
    } else {
      const feet = Math.floor(this.profileData.height / 30.48);
      const inches = Math.round((this.profileData.height / 2.54) % 12);
      return `${feet}ft ${inches}in`;
    }
  }

  get displayWeight(): string {
    if (!this.profileData.weight) return 'N/A';
    return this.isMetric
      ? `${this.profileData.weight} kg`
      : `${Math.round(this.profileData.weight * 2.20462)} lbs`;
  }

  get displayWeightGoal(): string {
    if (!this.weightGoal) return 'N/A';
    return this.isMetric
      ? `${this.weightGoal} kg`
      : `${Math.round(this.weightGoal * 2.20462)} lbs`;
  }

  updateInputWeightGoal() {
    if (this.weightGoal !== null) {
      this.inputWeightGoal = this.isMetric
        ? this.weightGoal // Display in kg
        : Math.round(this.weightGoal * 2.20462); // Display in lbs
    } else {
      this.inputWeightGoal = null;
    }
  }

  fetchUserPoints() {
    this.userService.getUserTotalPoints().then(points => {
      this.points = points;
    }).catch(error => {
      console.error('Error fetching user points:', error);
      this.toastr.error('Could not fetch user points.');
    });
  }

  fetchUserAchievements() {
    this.userService.getUserAchievements().then(achievements => {
      this.achievements = achievements;
    }).catch(error => {
      console.error('Error fetching user achievements:', error);
      this.toastr.error('Could not fetch user achievements.');
    });
  }

  
  loadUserGoals() {
    this.userService.getUserGoals().then(goals => {
      this.stepGoal = goals?.stepGoal || null;
      this.caloriesGoal = goals?.caloriesGoal || null;
      this.weightGoal = goals?.weightGoal || null; // Load weight goal
    }).catch(error => {
      console.error('Error loading goals:', error);
    });
  }
   
  saveGoals() {
    const stepGoal = this.stepGoal || 0;
    const caloriesGoal = this.caloriesGoal || 0;

    let weightGoal: number | null = this.inputWeightGoal;
    if (weightGoal !== null) {
      weightGoal = this.isMetric ? weightGoal : Math.round(weightGoal / 2.20462);
    }

    this.userService.saveUserGoals({ stepGoal, caloriesGoal, weightGoal })
      .then(() => {
        this.toastr.success('Goals saved successfully!');
      })
      .catch((error) => {
        this.toastr.error('Error saving goals');
        console.error('Error saving goals:', error);
      });
  }
  
  deleteAccount() {
    const user = this.auth.currentUser; 
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (user) {
        deleteUser(user)
          .then(() => {
            const userDocRef = doc(this.firestore, `users/${user.uid}`);
            return deleteDoc(userDocRef);
          })
          .then(() => {
            this.toastr.success('Account and user data deleted successfully');
            this.router.navigate(['/login']); 
          })
          .catch(err => {
            console.error('Error deleting account', err);
            this.toastr.error('Failed to delete account. Please try again later.');
          });
      } else {
        this.toastr.warning('User not authenticated.');
      }
    }
  }  

  get age(): number | null {
    return this.userService.calculateAge(this.profileData.dob);
  }
}
