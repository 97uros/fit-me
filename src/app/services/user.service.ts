import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, UserCredential } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, addDoc, setDoc, docData } from '@angular/fire/firestore';
import { getDocs, updateDoc } from 'firebase/firestore';
import { map, Observable, switchMap } from 'rxjs';
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

  constructor(
    private auth: Auth, 
    private firestore: Firestore, 
    private gfitService: GFitService,
    private toastr: ToastrService
  ) {}

  async createUserProfileIfNotExists(user: UserCredential): Promise<void> {
    const userDocRef = doc(this.firestore, `users/${user.user.uid}`);
    const userDocSnap = await getDoc(userDocRef);   
    if (!userDocSnap.exists()) {
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
        height: profileData?.weight 
      }; 
      await setDoc(userDocRef, userData);
      this.toastr.success('User profile created successfully');
    }
  }

  getGoogleFitProfileData(): Observable<any> {
    return new Observable(observer => {
      this.gfitService.getGoogleFitProfile().subscribe({
        next: (profileData) => {
          if (profileData) {        
            observer.next({
              name: profileData.name,
              gender: profileData.gender,
              profilePicture: profileData.profilePicture,
              dob: profileData.birthday
            });
          } else {
            observer.next(null);
          }
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }
  
  calculateAge(dob: string | null): number | null {
    if (!dob) return null;
    const dateOfBirth = new Date(dob);
    const ageDiff = Date.now() - dateOfBirth.getTime();
    const ageDate = new Date(ageDiff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  getUserWeight(): Observable<number | null> {
    return this.gfitService.getUserWeightFromGoogleFit().pipe(
      map(weight => weight ? Math.round(weight) : null)
    );
  }
  
  getUserHeight() {
    return this.gfitService.getUserHeightFromGoogleFit().pipe(
      map(height => height !== null ? Math.round(height * 100) : null) // convert to cm
    );
  }

  // Unit Preference 

  async loadUnitPreference() {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        this.isMetric = data['unitPreference'] === 'metric';
      } else {
        console.log('No unit preference found, defaulting to metric');
      }
    }
  }

  // Save the unit preference to Firestore
  async saveUnitPreference(isMetric: boolean) {
    const userId = this.auth.currentUser?.uid;
    if (userId) {
      const userDocRef = doc(this.firestore, `users/${userId}`);
      await updateDoc(userDocRef, { unitPreference: isMetric ? 'metric' : 'imperial' });
      this.isMetric = isMetric; // Update locally
    }
  }

  // Goals
  
  getUserGoals() {
    const userId = this.auth.currentUser?.uid;
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return docData(userDocRef).pipe(
      map(userData => {
        const data = userData as UserGoals; // Type assertion
        return {
          stepGoal: data.stepGoal || null,
          caloriesGoal: data.caloriesGoal || null,
          weightGoal: data.weightGoal || null
        };
      })
    );
  }

  saveUserGoals(goals: { stepGoal: number, caloriesGoal: number, weightGoal: any }) {
    const userId = this.auth.currentUser?.uid;
    const userDocRef = doc(this.firestore, `users/${userId}`);
    return setDoc(userDocRef, { 
      stepGoal: goals.stepGoal, 
      caloriesGoal: goals.caloriesGoal, 
      weightGoal: goals.weightGoal 
    }, { merge: true });
  }
  
  async updateUserPoints(pointsEarned: number): Promise<number> {
    const user = this.auth.currentUser;
    if (user) {
      const userDoc = doc(this.firestore, `users/${user.uid}`);
      const userSnapshot = await getDoc(userDoc);
      const currentPoints = userSnapshot.data()?.['points'] || 0;
      const newTotalPoints = currentPoints + pointsEarned;
  
      await updateDoc(userDoc, { points: newTotalPoints });
      return newTotalPoints;
    }
    return 0;
  }

  async getUserTotalPoints(): Promise<number> {
    const user = this.auth.currentUser;
    if (user) {
      const userDoc = doc(this.firestore, `users/${user.uid}`);
      const userSnapshot = await getDoc(userDoc);
      return userSnapshot.exists() ? userSnapshot.data()?.['points'] || 0 : 0;
    }
    return 0;
  }
  
  async saveAchievement(achievementName: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const achievementDocRef = doc(this.firestore, `users/${user.uid}/achievements/${achievementName}`);
      const achievementDocSnapshot = await getDoc(achievementDocRef);
      if (achievementDocSnapshot.exists()) {
        return;
      }
      await setDoc(achievementDocRef, { unlocked: true, dateUnlocked: new Date() });
      this.toastr.success(`Achievement unlocked:`, achievementName);
    }
  }

  async getUserAchievements(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      const achievementsCollectionRef = collection(this.firestore, `users/${user.uid}/achievements`);
      const achievementsSnapshot = await getDocs(achievementsCollectionRef);
      return achievementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return [];
  }
}
