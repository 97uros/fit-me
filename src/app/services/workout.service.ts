import { Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth'; 
import { getDatabase, ref, set, get, update, remove, push, query, orderByChild, equalTo } from 'firebase/database';
import { UserService } from './user.service';
import { Exercise } from './exercise.service';
import { startOfDay, subDays, endOfDay } from 'date-fns';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  private db = getDatabase();

  constructor(private auth: Auth, private userService: UserService) {}

  // 1. Add a new base workout (reusable)
  async addWorkout(userId: string, workout: any): Promise<void> {
    const workoutRef = ref(this.db, `users/${userId}/workouts`);
    await push(workoutRef, workout);
  }

  // 2. Schedule a workout instance
  async scheduleWorkout(userId: string, workoutId: string, workoutName: string, scheduledDate: Date): Promise<void> {
    const workoutInstancesRef = ref(this.db, `users/${userId}/workoutInstances`);
    await push(workoutInstancesRef, {
      workoutName,
      workoutId,         // Reference to the base workout
      scheduledDate: scheduledDate.getTime(), // Convert to timestamp
      status: 'scheduled', // Initially scheduled
      completedAt: null  // Initially null
    });
  }

  async completeWorkout(
    userId: string,
    name: string,  // Include workout name
    workoutId: string,
    exercises: Exercise[],  // Include exercises directly
    timeSpent: number,
    totalCalories: number
  ): Promise<void> {
    const workoutInstancesRef = ref(this.db, `users/${userId}/workoutInstances`);
    const newInstanceRef = push(workoutInstancesRef); // Generate a new unique ID for the workout instance
    await set(newInstanceRef, {
      name,       // Save the workout name
      exercises,         // Directly save the exercises array
      status: 'completed', // Set status to completed
      completedAt: new Date().getTime(), // Set the completion time
      totalCalories,     // Store calories burned
      timeSpent          // Store time spent
    });
  }

  // 4. Mark a workout instance as missed
  async markWorkoutAsMissed(userId: string, instanceId: string): Promise<void> {
    const workoutInstanceRef = ref(this.db, `users/${userId}/workoutInstances/${instanceId}`);
    await update(workoutInstanceRef, {
      status: 'missed'
    });
  }

  // 5. Get all workouts for the user
  async getUserWorkouts(userId: string): Promise<any[]> {
    const workouts: any[] = [];
    const workoutRef = ref(this.db, `users/${userId}/workouts`);
    const snapshot = await get(workoutRef);
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        workouts.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return workouts;
  }

  // 6. Get user workouts by ID
  async getUserWorkoutById(userId: string, workoutId: string): Promise<any> {
    const workoutRef = ref(this.db, `users/${userId}/workouts/${workoutId}`);
    const snapshot = await get(workoutRef);
    return snapshot.exists() ? { id: snapshot.key, ...snapshot.val() } : null; // Return workout data or null if not found
  }

  // 7. Get all scheduled workouts for the user
  async getScheduledWorkouts(userId: string): Promise<any[]> {
    const scheduledWorkouts: any[] = [];
    const workoutInstancesRef = ref(this.db, `users/${userId}/workoutInstances`);
    const scheduledQuery = query(workoutInstancesRef, orderByChild('status'), equalTo('scheduled'));
    const snapshot = await get(scheduledQuery);
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        scheduledWorkouts.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return scheduledWorkouts;
  }

  // 8. Get all finished workouts for the user
  async getFinishedWorkouts(userId: string): Promise<any[]> {
    const finishedWorkouts: any[] = [];
    const workoutInstancesRef = ref(this.db, `users/${userId}/workoutInstances`);
    const finishedQuery = query(workoutInstancesRef, orderByChild('status'), equalTo('completed'));
    const snapshot = await get(finishedQuery);
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        finishedWorkouts.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return finishedWorkouts;
  }

  // 9. Get all missed workouts for the user
  async getMissedWorkouts(userId: string): Promise<any[]> {
    const missedWorkouts: any[] = [];
    const workoutInstancesRef = ref(this.db, `users/${userId}/workoutInstances`);
    const missedQuery = query(workoutInstancesRef, orderByChild('status'), equalTo('missed'));
    const snapshot = await get(missedQuery);
    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        missedWorkouts.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
    }
    return missedWorkouts;
  }

  async getMusclesWorkedLast7Days(userId: string): Promise<{ [key: string]: { lastWorked: Date, count: number } }> {
    const finishedWorkoutsCollection = ref(this.db, `users/${userId}/workoutInstances`);
    const snapshot = await get(finishedWorkoutsCollection);
    const musclesData: { [key: string]: { lastWorked: Date, count: number } } = {};
    const today = new Date();

    if (snapshot.exists()) {
      snapshot.forEach(childSnapshot => {
        const workout = childSnapshot.val();
        const completedAt = workout['completedAt'];
        if (completedAt && completedAt >= startOfDay(subDays(today, 7)).getTime() && completedAt <= endOfDay(today).getTime()) {
          if (!Array.isArray(workout.exercises)) {
            console.error(`Workout instance does not have exercises for ID: ${childSnapshot.key}`);
            return;
          }
          workout.exercises.forEach((exercise: any) => {
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
        }
      });
    }
    return musclesData;
  }



  // 10. Update a base workout
  async updateWorkout(userId: string, workoutId: string, workout: any): Promise<void> {
    const workoutRef = ref(this.db, `users/${userId}/workouts/${workoutId}`);
    await set(workoutRef, workout);
  }

  // 11. Delete a workout
  async deleteWorkout(userId: string, workoutId: string): Promise<void> {
    const workoutRef = ref(this.db, `users/${userId}/workouts/${workoutId}`);
    await remove(workoutRef);
  }

  // 12. Helper function to get a workout by ID
  private async getWorkoutById(userId: string, workoutId: string): Promise<any> {
    const workoutRef = ref(this.db, `users/${userId}/workouts/${workoutId}`);
    const snapshot = await get(workoutRef);
    return snapshot.exists() ? snapshot.val() : null;
  }

}
