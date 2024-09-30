// workout.service.ts
import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { Auth } from '@angular/fire/auth'; 
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationsService } from './notifications.service';

@Injectable({
  providedIn: 'root'
})

export class WorkoutService {

  constructor(private firestore: Firestore, private auth: Auth, private notificationsService: NotificationsService ) {}

  async addWorkout(workout: any): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const workoutRef = collection(this.firestore, `users/${user.uid}/workouts`);
      await addDoc(workoutRef, workout);
    }
  }

  async saveFinishedWorkout(workout: any, timeSpent: number, totalCalories: number): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const finishedWorkoutsRef = collection(this.firestore, `users/${user.uid}/finishedWorkouts`);
      await addDoc(finishedWorkoutsRef, {
        name: workout.name,
        numberOfExercises: workout.exercises.length,
        totalCalories,
        exercises: workout.exercises,
        timeSpent,
        completedAt: new Date()  // Timestamp when workout was completed
      });
    }
  }

  async getUserFinishedWorkouts(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      const finishedWorkouts: any[] = [];
      const finishedWorkoutsCollection = collection(this.firestore, `users/${user.uid}/finishedWorkouts`);
      const finishedWorkoutsSnapshot = await getDocs(finishedWorkoutsCollection);
      finishedWorkoutsSnapshot.forEach(doc => {
        finishedWorkouts.push({ id: doc.id, ...doc.data() });
      });
      return finishedWorkouts;
    }
    return [];
  }

  async getUserWorkouts(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      const workouts: any[] = [];
      const workoutCollection = collection(this.firestore, `users/${user.uid}/workouts`);
      const workoutSnapshot = await getDocs(workoutCollection);
      workoutSnapshot.forEach(doc => workouts.push({ id: doc.id, ...doc.data() }));
      return workouts;
    }
    return [];
  }

  async getUserScheduledWorkouts(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      const scheduledWorkouts: any[] = [];
      const scheduledWorkoutsCollection = collection(this.firestore, `users/${user.uid}/scheduledWorkouts`);
      const scheduledWorkoutsSnapshot = await getDocs(scheduledWorkoutsCollection);
      scheduledWorkoutsSnapshot.forEach(doc => {
        scheduledWorkouts.push({ id: doc.id, ...doc.data() });
      });
      return scheduledWorkouts;
    }
    return [];
  }

  async getMusclesWorkedLast7Days(): Promise<{ [key: string]: number }> {
    const user = this.auth.currentUser;
    if (user) {
      const finishedWorkoutsCollection = collection(this.firestore, `users/${user.uid}/finishedWorkouts`);
      const finishedWorkoutsSnapshot = await getDocs(finishedWorkoutsCollection);
  
      const musclesCount: { [key: string]: number } = {};
      const today = new Date();
  
      finishedWorkoutsSnapshot.forEach(doc => {
        const workout = doc.data();
        const completedAt = workout['completedAt'].toDate();
        
        // Check if the workout was completed in the last 7 days
        if (completedAt >= startOfDay(subDays(today, 7)) && completedAt <= endOfDay(today)) {
          // Check if the workout has exercises and iterate over them
          if (workout['exercises'] && Array.isArray(workout['exercises'])) {
            workout['exercises'].forEach((exercise: any) => {
              // Check if the exercise has primaryMuscles and iterate over them
              if (exercise.primaryMuscles && Array.isArray(exercise.primaryMuscles)) {
                exercise.primaryMuscles.forEach((muscle: string) => {
                  musclesCount[muscle] = (musclesCount[muscle] || 0) + 1; // Increment muscle count
                });
              }
            });
          }
        }
      });
  
      return musclesCount;
    }
    return {};
  }

  async updateWorkout(workoutId: string, workout: any): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const workoutDoc = doc(this.firestore, `users/${user.uid}/workouts/${workoutId}`);
      await updateDoc(workoutDoc, workout);
    }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const workoutDoc = doc(this.firestore, `users/${user.uid}/workouts/${workoutId}`);
      await deleteDoc(workoutDoc);
    }
  }
}

