import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, collection, addDoc } from '@angular/fire/firestore';
import { getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { format } from 'date-fns';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private auth: Auth, private firestore: Firestore, private toastr: ToastrService) {}

  getUserProfile(): Observable<any> {
    const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (!userId) {
      return of(null); // Return an observable with null if no user is logged in
    }
    const profileDocRef = doc(this.firestore, `users/${userId}`);
    return new Observable(observer => {
      getDoc(profileDocRef).then(docSnap => {
        if (docSnap.exists()) {
          observer.next(docSnap.data());
        } else {
          observer.next(null);
        }
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  // New method to get user weight
  getUserWeight(): Observable<number | null> {
    return new Observable(observer => {
      this.getUserProfile().subscribe(userProfile => {
        if (userProfile && userProfile.weight) {
          observer.next(userProfile.weight);
        } else {
          observer.next(null); // Return null if weight is not available
        }
        observer.complete();
      }, error => {
        observer.error(error); // Pass error to the observer
      });
    });
  }

  // Weight tracker

  async getWeightHistory(userId: string): Promise<any[]> {
    const weightRecordsRef = collection(this.firestore, `users/${userId}/bodyWeightRecords`);
    const weightSnapshot = await getDocs(weightRecordsRef);
    return weightSnapshot.docs.map(doc => doc.data());
  }

  async addBodyWeight(newWeight: number): Promise<void> {
    const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (!userId) {
      return Promise.reject('User not logged in'); // Handle case where user is not logged in
    }
    const userDocRef = doc(this.firestore, `users/${userId}`);
    try {
      // Get the existing user data to log the current weight
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userProfile = userDocSnap.data();
        const currentWeight = userProfile['weight']; // Accessing weight after checking existence
        // Log the old weight in the bodyWeightRecords sub-collection
        const record = {
          date: new Date().toLocaleDateString(),
          weight: currentWeight
        };
        const weightRecordsRef = collection(this.firestore, `users/${userId}/bodyWeightRecords`);
        await addDoc(weightRecordsRef, record);
        // Update the current weight
        await updateDoc(userDocRef, { weight: newWeight });
        console.log('User weight updated and old weight logged successfully');
      } else {
        return Promise.reject('User document does not exist');
      }
    } catch (error) {
      console.error('Error updating weight:', error);
      return Promise.reject(error); // Reject with the error
    }
  }  

  // Achievements and points

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
      // Reference to the specific achievement document
      const achievementDocRef = doc(this.firestore, `users/${user.uid}/achievements/${achievementName}`);
      
      // Get the document to check if it already exists
      const achievementDocSnapshot = await getDoc(achievementDocRef);
  
      // Check if the document already exists
      if (achievementDocSnapshot.exists()) {
        console.log('Achievement already unlocked:', achievementName);
        return; // Exit the function if the achievement already exists
      }
  
      // Save the achievement if it doesn't exist
      await setDoc(achievementDocRef, { unlocked: true, dateUnlocked: new Date() });
      this.toastr.success(`Achievement unlocked:` , achievementName);
    }
  }

  async getUserAchievements(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      // Get all documents from the achievements collection
      const achievementsCollectionRef = collection(this.firestore, `users/${user.uid}/achievements`);
      const achievementsSnapshot = await getDocs(achievementsCollectionRef);
      // Map through all the achievement documents and return them
      return achievementsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return [];
  }
}
