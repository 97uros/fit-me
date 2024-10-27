import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, UserCredential } from '@angular/fire/auth';
import { getDatabase, ref, set, get, child, update } from 'firebase/database';
import { ToastrService } from 'ngx-toastr';
import { GFitService } from './gfit.service';

interface UserGoals {
  stepGoal: number | null;
  caloriesGoal: number | null;
  weightGoal: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  userProfile: any = {};
  isMetric: boolean = true;
  private db = getDatabase();

  constructor(
    private auth: Auth,
    private gfitService: GFitService,
    private toastr: ToastrService
  ) {}

  async createUserProfileIfNotExists(user: UserCredential): Promise<void> {
    const userId = user.user.uid;
    const userRef = ref(this.db, `users/${userId}`);
    const userSnap = await get(userRef);

    if (!userSnap.exists()) {
      const profileData = await this.gfitService.getGoogleFitProfile().toPromise();
      const userData = {
        email: user.user.email,
        name: user.user.displayName,
        profilePicture: user.user.photoURL,
        dob: profileData?.birthday || null,
        gender: profileData?.gender || null,
        points: 0,
        achievements: [],
        weight: profileData?.height,
        height: profileData?.weight,
      };
      await set(userRef, userData);
      this.toastr.success('User profile created successfully');
    }
  }

  async getGoogleFitProfileData(): Promise<any> {
    try {
      const profileData = await this.gfitService.getGoogleFitProfile().toPromise();
      return profileData
        ? {
            name: profileData.name,
            gender: profileData.gender,
            profilePicture: profileData.profilePicture,
            dob: profileData.birthday,
          }
        : null;
    } catch (error) {
      console.error('Error retrieving Google Fit profile data', error);
      return null;
    }
  }

  calculateAge(dob: string | null): number | null {
    if (!dob) return null;
    const dateOfBirth = new Date(dob);
    const ageDiff = Date.now() - dateOfBirth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  async getUserWeight(): Promise<number | null> {
    const weight = await this.gfitService.getUserWeightFromGoogleFit().toPromise();
    return weight ? Math.round(weight) : null;
  }

  async getUserHeight(): Promise<number | null> {
    const height = await this.gfitService.getUserHeightFromGoogleFit().toPromise();
    return height ? Math.round(height * 100) : null; // convert to cm
  }  

  async loadUnitPreference() {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(this.db, `users/${userId}/unitPreference`);
      const unitSnap = await get(userRef);
      this.isMetric = unitSnap.exists() && unitSnap.val() === 'metric';
    } else {
      console.log('No unit preference found, defaulting to metric');
    }
  }

  async saveUnitPreference(isMetric: boolean) {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(this.db, `users/${userId}`);
      await update(userRef, { unitPreference: isMetric ? 'metric' : 'imperial' });
      this.isMetric = isMetric; // Update locally
    }
  }

  async getUserGoals(): Promise<UserGoals> {
    const userId = this.auth.currentUser?.uid;
    const userRef = ref(this.db, `users/${userId}`);
    const userSnap = await get(userRef);
    if (userSnap.exists()) {
      const data = userSnap.val();
      return {
        stepGoal: data.stepGoal || null,
        caloriesGoal: data.caloriesGoal || null,
        weightGoal: data.weightGoal || null,
      };
    }
    return { stepGoal: null, caloriesGoal: null, weightGoal: null };
  }

  async saveUserGoals(goals: { stepGoal: number; caloriesGoal: number; weightGoal: any }) {
    const userId = this.auth.currentUser?.uid;
    const userRef = ref(this.db, `users/${userId}`);
    await update(userRef, { 
      stepGoal: goals.stepGoal,
      caloriesGoal: goals.caloriesGoal,
      weightGoal: goals.weightGoal,
    });
  }

  async updateUserPoints(pointsEarned: number): Promise<number> {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(this.db, `users/${userId}`);
      const userSnap = await get(userRef);
      const currentPoints = userSnap.exists() ? userSnap.val().points || 0 : 0;
      const newTotalPoints = currentPoints + pointsEarned;

      await update(userRef, { points: newTotalPoints });
      return newTotalPoints;
    }
    return 0;
  }

  async getUserTotalPoints(): Promise<number> {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userRef = ref(this.db, `users/${userId}`);
      const userSnap = await get(userRef);
      return userSnap.exists() ? userSnap.val().points || 0 : 0;
    }
    return 0;
  }

  async saveAchievement(achievementName: string): Promise<void> {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const achievementRef = ref(this.db, `users/${userId}/achievements/${achievementName}`);
      const achievementSnap = await get(achievementRef);
      if (achievementSnap.exists()) {
        return;
      }
      await set(achievementRef, { unlocked: true, dateUnlocked: new Date().toISOString() });
      this.toastr.success(`Achievement unlocked:`, achievementName);
    }
  }

  async getUserAchievements(): Promise<any[]> {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const achievementsRef = ref(this.db, `users/${userId}/achievements`);
      const achievementsSnap = await get(achievementsRef);
      if (achievementsSnap.exists()) {
        return Object.keys(achievementsSnap.val()).map(key => ({ id: key, ...achievementsSnap.val()[key] }));
      }
    }
    return [];
  }
}
