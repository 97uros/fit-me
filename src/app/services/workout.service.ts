import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth'; 
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { getDoc, setDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {

  constructor( private firestore: Firestore, private auth: Auth ) {}

  // 1. Add a new base workout (reusable)
  async addWorkout(userId: string, workout: any): Promise<void> {
    const workoutRef = collection(this.firestore, `users/${userId}/workouts`);
    await addDoc(workoutRef, workout);
  }

  // 2. Schedule a workout instance
  async scheduleWorkout(userId: string, workoutId: string, scheduledDate: Date): Promise<void> {
    const workoutInstancesRef = collection(this.firestore, `users/${userId}/workoutInstances`);
    await addDoc(workoutInstancesRef, {
      workoutId,         // Reference to the base workout
      scheduledDate,     // When the workout is scheduled
      status: 'scheduled', // Initially scheduled
      completedAt: null  // Initially null
    });
  }

  async completeWorkout(userId: string, instanceId: string | null, workout: any, timeSpent: number, totalCalories: number): Promise<void> {
    const workoutInstanceRef = instanceId
      ? doc(this.firestore, `users/${userId}/workoutInstances/${instanceId}`)  // For scheduled workout
      : doc(collection(this.firestore, `users/${userId}/workoutInstances`));   // For non-scheduled workout
  
    await setDoc(workoutInstanceRef, {
      workoutId: workout.id,         // Reference to workout
      name: workout.name,            // Workout name
      exercises: workout.exercises,  // Save exercises performed
      status: 'completed',           // Set status to completed
      completedAt: new Date(),       // Set the completion time
      totalCalories,                 // Store calories burned
      timeSpent                      // Store time spent
    });
  }

  // 4. Mark a workout instance as missed
  async markWorkoutAsMissed(userId: string, instanceId: string): Promise<void> {
    const workoutInstanceRef = doc(this.firestore, `users/${userId}/workoutInstances/${instanceId}`);
    await updateDoc(workoutInstanceRef, {
      status: 'missed'
    });
  }

  // 5. Get all workouts for the user
  async getUserWorkouts(userId: string): Promise<any[]> {
    const workouts: any[] = [];
    const workoutCollection = collection(this.firestore, `users/${userId}/workouts`);
    const workoutSnapshot = await getDocs(workoutCollection);
    workoutSnapshot.forEach(doc => workouts.push({ id: doc.id, ...doc.data() }));
    return workouts;
  }

  // Get user workouts by id
  async getUserWorkoutById(userId: string, workoutId: string): Promise<any> {
    const workoutDoc = doc(this.firestore, `users/${userId}/workouts/${workoutId}`);
    const snapshot = await getDoc(workoutDoc);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null; // Return workout data or null if not found
  }

  // 6. Get all scheduled workouts for the user
  async getScheduledWorkouts(userId: string): Promise<any[]> {
    const scheduledWorkouts: any[] = [];
    const workoutInstancesCollection = collection(this.firestore, `users/${userId}/workoutInstances`);
    const q = query(workoutInstancesCollection, where('status', '==', 'scheduled'));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      scheduledWorkouts.push({ id: doc.id, ...doc.data() });
    });
    return scheduledWorkouts;
  }

  // 7. Get all finished workouts for the user
  async getFinishedWorkouts(userId: string): Promise<any[]> {
    const finishedWorkouts: any[] = [];
    const workoutInstancesCollection = collection(this.firestore, `users/${userId}/workoutInstances`);
    const q = query(workoutInstancesCollection, where('status', '==', 'completed'));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      finishedWorkouts.push({ id: doc.id, ...doc.data() });
    });
    return finishedWorkouts;
  }

  // 8. Get all missed workouts for the user
  async getMissedWorkouts(userId: string): Promise<any[]> {
    const missedWorkouts: any[] = [];
    const workoutInstancesCollection = collection(this.firestore, `users/${userId}/workoutInstances`);
    const q = query(workoutInstancesCollection, where('status', '==', 'missed'));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
      missedWorkouts.push({ id: doc.id, ...doc.data() });
    });
    return missedWorkouts;
  }

  async getMusclesWorkedLast7Days(userId: string): Promise<{ [key: string]: { lastWorked: Date, count: number } }> {
    const finishedWorkoutsCollection = collection(this.firestore, `users/${userId}/workoutInstances`);
    const snapshot = await getDocs(finishedWorkoutsCollection);
    const musclesData: { [key: string]: { lastWorked: Date, count: number } } = {};
    const today = new Date();
    const promises: Promise<void>[] = [];

    snapshot.forEach(doc => {
      const workout = doc.data();
      const completedAt = workout['completedAt']?.toDate();
      if (completedAt && completedAt >= startOfDay(subDays(today, 7)) && completedAt <= endOfDay(today)) {
        const promise = this.getWorkoutById(userId, workout['workoutId']).then(baseWorkout => {
          if (!baseWorkout || !Array.isArray(baseWorkout.exercises)) {
            console.error(`Workout not found or does not have exercises for ID: ${workout['workoutId']}`);
            return;
          }

          baseWorkout.exercises.forEach((exercise: any) => {
            if (exercise.primaryMuscles && Array.isArray(exercise.primaryMuscles)) {
              exercise.primaryMuscles.forEach((muscle: string) => {
                if (!musclesData[muscle]) {
                  musclesData[muscle] = { lastWorked: completedAt, count: 1 };
                } else {
                  musclesData[muscle].count += 1;
                  if (completedAt > musclesData[muscle].lastWorked) {
                    musclesData[muscle].lastWorked = completedAt;
                  }
                }
              });
            }
          });
        }).catch(error => {
          console.error(`Error fetching workout data for ID ${workout['workoutId']}:`, error);
        });

        promises.push(promise);
      }
    });
    await Promise.all(promises);
    return musclesData;
  }


  // 10. Update a base workout
  async updateWorkout(userId: string, workoutId: string, workout: any): Promise<void> {
    const workoutDoc = doc(this.firestore, `users/${userId}/workouts/${workoutId}`);
    await updateDoc(workoutDoc, workout);
  }

  // 11. Delete a workout
  async deleteWorkout(userId: string, workoutId: string): Promise<void> {
    const workoutDoc = doc(this.firestore, `users/${userId}/workouts/${workoutId}`);
    await deleteDoc(workoutDoc);
  }

  // 12. Helper function to get a workout by ID
  private async getWorkoutById(userId: string, workoutId: string): Promise<any> {
    const workoutDoc = doc(this.firestore, `users/${userId}/workouts/${workoutId}`);
    const snapshot = await getDoc(workoutDoc);
    return snapshot.data();
  }
}
