import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { WorkoutService } from '../../services/workout.service';
import { MET_VALUES } from '../../utils/met-values';
import { calculatePoints, getAchievement } from '../../utils/points-and-achievements';
import { Exercise, ExerciseService } from '../../services/exercise.service';

@Component({
  selector: 'app-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink ], // Add ToastrModule and BrowserAnimationsModule here
  templateUrl: './workouts.component.html',
  styleUrls: ['./workouts.component.scss']
})
export class WorkoutsComponent implements OnInit {

  @ViewChild('videoPlayer', {static: false}) videoPlayer!: ElementRef<HTMLVideoElement>;

  userWeight: number | null = null;
  workouts: any[] = [];
  newWorkoutName: string = '';
  editingWorkout: any = null;
  startingWorkout: any = null;
  currentExerciseIndex: number | null = null;
  progress: number = 0;
  restTimeRemaining: number = 30;
  isResting: boolean = false;
  timer: any;
  earnedBadges: any[] = [];
  elapsedSeconds: number = 0;
  countdownDuration: number = 3;
  countdown: number = 0;
  isCountdownActive: boolean = false;
  showConfirmCancelModal: boolean = false;

  constructor(
    private userService: UserService,
    private workoutService: WorkoutService, 
    private exerciseService: ExerciseService,
    private firestore: Firestore,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef, 
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchWorkouts();
    this.userService.getUserWeight().subscribe(weight => {
      this.userWeight = weight;
    });    
    this.route.queryParams.subscribe(params => {
      const workoutId = params['workoutId'];
      if (workoutId) {
        this.startWorkoutById(workoutId);
      }
    });
  }

  fetchWorkouts(): void {
    const user = this.auth.currentUser;
    if (user) {
      this.workoutService.getUserWorkouts(user.uid).then((data: any) => {
        this.workouts = data;
      }).catch((error) => {
        this.toastr.error('Error fetching workouts:', error);
      });
    }
  }

  async startWorkoutById(workoutId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const workout = await this.workoutService.getUserWorkoutById(user.uid, workoutId);
      if (workout) {
        this.startWorkout(workout); // Start the workout
      } else {
        this.toastr.error('Workout not found!');
      }
    }
  }

  editWorkout(workout: any): void {
    this.editingWorkout = { ...workout };
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      await this.workoutService.deleteWorkout(user.uid, workoutId);
      this.workouts = this.workouts.filter(workout => workout.id !== workoutId);
      this.toastr.success('Workout deleted successfully!');
    }
  }

  moveExerciseUp(index: number): void {
    if (index === 0) return;
    const exercises = this.editingWorkout.exercises;
    [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
  }

  moveExerciseDown(index: number): void {
    if (index === this.editingWorkout.exercises.length - 1) return;
    const exercises = this.editingWorkout.exercises;
    [exercises[index + 1], exercises[index]] = [exercises[index], exercises[index + 1]];
  }

  removeExercise(index: number): void {
    this.editingWorkout.exercises.splice(index, 1);
    this.toastr.success('Exercise removed successfully!'); // Use Toastr notification
  }

  async saveWorkout(): Promise<void> {
    if (this.editingWorkout) {
      const user = this.auth.currentUser;
      if (user) {
        await this.workoutService.updateWorkout(user.uid, this.editingWorkout.id, this.editingWorkout);
        const index = this.workouts.findIndex(workout => workout.id === this.editingWorkout.id);
        if (index !== -1) {
          this.workouts[index] = { ...this.editingWorkout };
          this.toastr.success('Workout saved successfully!');
        }
        this.cancelEdit();
      }
    }
  }

  startWorkout(workout: any): void {
    this.startingWorkout = {
      ...workout,
      exercises: workout.exercises.map((exercise: any) => ({
        ...exercise,
        done: false,
        currentSet: 1,
        current: false
      }))
    };
    this.currentExerciseIndex = 0;
    this.elapsedSeconds = 0;
    this.progress = 0;
    this.startTimer();
    this.toastr.info(`Starting workout: ${workout.name}`);
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

  formatDuration(): string {
    const hours = Math.floor(this.elapsedSeconds / 3600);
    const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
    const seconds = this.elapsedSeconds % 60;
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : num.toString();
  }

  completeSet(): void {
    const currentExercise = this.startingWorkout.exercises[this.currentExerciseIndex!];
    // Mark the set as finished
    this.toastr.success('Set finished! Take a bit of rest...');
  
    if (currentExercise.currentSet < currentExercise.sets) {
      currentExercise.currentSet++;
      this.startRestBetweenSets(currentExercise);
    } else {
      // Current exercise is done
      currentExercise.done = true;
      // Move to the next exercise
      if (this.currentExerciseIndex! < this.startingWorkout.exercises.length - 1) {
        this.currentExerciseIndex!++;
        // Reset current set for the next exercise
        const nextExercise = this.startingWorkout.exercises[this.currentExerciseIndex!];
        nextExercise.currentSet = 1; // Reset the set count for the new exercise
        this.toastr.info(`Get ready for ${nextExercise.name}`);
        this.resetAndLoadVideo(nextExercise.videoUrl);
        this.startRest(); // Optionally start rest before the next exercise
      } else {
        // If all exercises are done, finish the workout
        this.finishWorkout();
      }
    }
    this.updateProgress();
    this.checkAllExercisesDone();
    this.cdr.detectChanges();
  }

  checkAllExercisesDone(): void {
    const allDone = this.startingWorkout.exercises.every((exercise: any) => exercise.done);
    if (allDone) {
      this.toastr.success('All exercises are completed! Great job!');
    }
  }

  resetAndLoadVideo(videoUrl: string): void {
    if (this.videoPlayer) {
      const videoElement = this.videoPlayer.nativeElement;
      // Pause the video, clear the source, and reload
      videoElement.pause();
      videoElement.src = '';  // Clear the current video source
      videoElement.load();    // Reset the video player
      // Set the new source and play
      setTimeout(() => {
        videoElement.src = `${videoUrl}?t=${new Date().getTime()}`;
        videoElement.play();
      }, 100); // Small delay to ensure the video reloads
    }
  }

  getCurrentExerciseVideoUrl(): string | undefined {
    if (this.startingWorkout && this.currentExerciseIndex !== null) {
      const currentExercise = this.startingWorkout.exercises[this.currentExerciseIndex];
      return currentExercise.videoUrl ? `${currentExercise.videoUrl}?t=${new Date().getTime()}` : '';
    }
    return undefined;
  }

  updateProgress(): void {
    if (this.startingWorkout && this.startingWorkout.exercises.length > 0) {
      // Ensure that sets and currentSet are valid numbers before calculation
      const totalSets = this.startingWorkout.exercises.reduce((sum: number, exercise: any) => {
        const sets = exercise.sets || 0; // Default to 0 if sets is undefined or NaN
        return sum + sets;
      }, 0);
  
      const completedSets = this.startingWorkout.exercises.reduce((sum: number, exercise: any) => {
        const currentSet = exercise.currentSet || 1; // Default to 1 if currentSet is undefined or NaN
        return sum + (currentSet - 1);
      }, 0);
  
      // Check if totalSets is greater than 0 to avoid division by zero
      this.progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
    }
  }

  calculateCalories(exercise: Exercise, duration: number): number {
    const met = MET_VALUES[exercise.category.toLowerCase() as keyof typeof MET_VALUES];
    if (met) {
      const durationInHours = duration / 3600;
      if (this.userWeight !== null) { 
        return met * this.userWeight * durationInHours;
      }
    }
    return 0;
  }

  finishWorkout(): void {
    if (this.startingWorkout) {
      let totalCalories = 0;
      const durationInSeconds = this.elapsedSeconds;
      this.startingWorkout.exercises.forEach((exercise: any) => {
        const caloriesBurned = this.calculateCalories(exercise, durationInSeconds);
        totalCalories += caloriesBurned;
      });
       // Calculate points based on the workout
      this.startingWorkout.totalCalories = totalCalories;
      const pointsEarned = calculatePoints(this.startingWorkout);
      // Update user points
      this.userService.updateUserPoints(pointsEarned).then(newTotalPoints => {
        const achievement = getAchievement(newTotalPoints);
        if (achievement) {
          this.userService.saveAchievement(achievement.name);
        }
        this.toastr.success(`Workout completed! You earned ${pointsEarned.toFixed(0)} points.`);
        this.toastr.info(`You burned approximately ${totalCalories.toFixed(0)} calories!`);
      }).catch((error: any) => {
        console.error('Error updating points:', error);
        this.toastr.error('Failed to update points');
      });
      const user = this.auth.currentUser;
      if(user) {
        this.workoutService.completeWorkout(user.uid, null, this.startingWorkout, durationInSeconds, totalCalories).then(() => {
          this.toastr.success('Workout completed! Great job!');
          this.toastr.info(`You burned approximately ${totalCalories.toFixed(0)} calories!`);
        }).catch(error => {
          console.error('Error saving finished workout:', error);
          this.toastr.error('Failed to save finished workout');
        });
      }
      this.startingWorkout.completed = true;
      clearInterval(this.timer);
    }
    this.startingWorkout = null;
  }

  startRestBetweenSets(exercise: any): void {
    this.isResting = true; // Start resting
    this.restTimeRemaining = 30;
    this.restTimer(() => {
      this.isResting = false; // End resting
      this.toastr.info(`Rest over! Start set ${exercise.currentSet} of ${exercise.name}.`);
    });
  }  

  startRest(): void {
    this.isResting = true; // Start resting
    this.restTimeRemaining = 60;
    this.restTimer(() => {
      this.isResting = false; // End resting
      this.toastr.info('Rest period over! Time to start the next exercise.');
    });
  }

  restTimer(callback: () => void): void {
    this.timer = setInterval(() => {
      if (this.restTimeRemaining > 0) {
        this.restTimeRemaining--;
      } else {
        clearInterval(this.timer);
        callback();
      }
    }, 1000);
  }

  skipRest(): void {
    this.isResting = false;
    clearInterval(this.timer);
    this.restTimeRemaining = 0;
    this.toastr.info('Rest skipped! Time to move on.');
  }

  addRestTime(): void {
    this.restTimeRemaining += 10;
    this.toastr.info('Added 10 seconds to rest time!');
  }

  cancelEdit(): void {
    this.editingWorkout = null;
  }

  openConfirmCancelModal(): void {
    this.showConfirmCancelModal = true;
  }

  closeConfirmCancelModal(): void {
    this.showConfirmCancelModal = false;
  }

  cancelWorkout(): void {
    this.showConfirmCancelModal = false;
    this.toastr.error('Workout has been cancelled.');
    this.startingWorkout = null;
    clearInterval(this.timer);
  }
}