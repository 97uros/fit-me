import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutService } from '../../../services/workout.service';
import { ToastrService } from 'ngx-toastr';
import { MET_VALUES } from '../../../utils/met-values';
import { calculatePoints, getAchievement } from '../../../utils/points-and-achievements';
import { UserService } from '../../../services/user.service';
import { Auth } from '@angular/fire/auth';
import { Exercise } from '../../../services/exercise.service';

@Component({
  selector: 'app-start-workout-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './start-workout-modal.component.html',
  styleUrls: ['./start-workout-modal.component.scss']
})
export class StartWorkoutModalComponent {
  @Input() userWeight: number | null = null;
  @Input() startingWorkout: any = null;
  @Input() currentExerciseIndex: number | null = null;
  @Input() progress: number = 0;
  @Input() restTimeRemaining: number = 30;
  @Input() isResting: boolean = false;
  @Input() timer: any;
  @Input() earnedBadges: any[] = [];
  @Input() elapsedSeconds: number = 0;
  @Input() countdownDuration: number = 3;
  @Input() countdown: number = 0;
  @Input() isCountdownActive: boolean = false;
  @Input() showConfirmCancelModal: boolean = false;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private workoutService: WorkoutService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
  ) {}

  resetWorkout(): void {
    this.startingWorkout = null;
    this.currentExerciseIndex = 0;
    this.progress = 0;
    this.showConfirmCancelModal = false;
    this.isResting = false;
    this.elapsedSeconds = 0;
    this.restTimeRemaining = 30;
    clearInterval(this.timer);  // Stop the timer if running
  }

  currentImage(exercise: any): string {
    return exercise.images?.[0] || 'assets/default-image.png';
  }

  completeSet(): void {
    const currentExercise = this.startingWorkout.exercises[this.currentExerciseIndex || 0];
    this.toastr.success('Set finished! Take a bit of rest...');

    if (currentExercise.currentSet < currentExercise.sets) {
      currentExercise.currentSet++;
      this.startRestBetweenSets(currentExercise);
    } else {
      this.finishExercise(currentExercise);
    }

    this.updateProgress();
    this.checkAllExercisesDone();
    this.cdr.detectChanges();
  }

  finishExercise(currentExercise: any): void {
    currentExercise.done = true;

    if (this.currentExerciseIndex! < this.startingWorkout.exercises.length - 1) {
      this.currentExerciseIndex!++;
      const nextExercise = this.startingWorkout.exercises[this.currentExerciseIndex!];
      nextExercise.currentSet = 1;
      this.toastr.info(`Get ready for ${nextExercise.name}`);
      this.resetAndLoadImage(nextExercise.images);
      this.startRest();
    } else {
      this.finishWorkout();
    }
  }

  checkAllExercisesDone(): void {
    const allDone = this.startingWorkout.exercises.every((exercise: any) => exercise.done);
    if (allDone) {
      this.toastr.success('All exercises are completed! Great job!');
    }
  }

  resetAndLoadImage(images: string[]): void {
    const firstImage = images?.[0];
    if (firstImage) {
      this.startingWorkout.exercises[this.currentExerciseIndex!].currentImage = firstImage;
    }
  }

  updateProgress(): void {
    if (this.startingWorkout && this.startingWorkout.exercises.length > 0) {
      const totalSets = this.startingWorkout.exercises.reduce((sum: number, exercise: any) => sum + (exercise.sets || 0), 0);
      const completedSets = this.startingWorkout.exercises.reduce((sum: number, exercise: any) => sum + (exercise.done ? exercise.sets : exercise.currentSet - 1), 0);

      this.progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
    }
  }

  calculateCalories(exercise: Exercise, duration: number): number {
    const met = MET_VALUES[exercise.category.toLowerCase() as keyof typeof MET_VALUES];
    if (met && this.userWeight !== null) {
      return met * this.userWeight * (duration / 3600);
    }
    return 0;
  }

  finishWorkout(): void {
    if (!this.startingWorkout) return;

    const totalCalories = this.startingWorkout.exercises.reduce((sum: number, exercise: any) => sum + this.calculateCalories(exercise, this.elapsedSeconds), 0);
    this.startingWorkout.totalCalories = totalCalories;

    const pointsEarned = calculatePoints(this.startingWorkout);
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
    if (user) {
      this.workoutService.completeWorkout(user.uid, null, this.startingWorkout, this.elapsedSeconds, totalCalories)
        .then(() => {
          this.toastr.success('Workout completed! Great job!');
          this.toastr.info(`You burned approximately ${totalCalories.toFixed(0)} calories!`);
        })
        .catch(error => {
          console.error('Error saving finished workout:', error);
          this.toastr.error('Failed to save finished workout');
        });
    }

    this.startingWorkout.completed = true;
    this.resetWorkout(); // Reset after finishing workout
  }

  startRestBetweenSets(exercise: any): void {
    this.isResting = true;
    this.restTimeRemaining = 30;
    this.startRestTimer(() => {
      this.isResting = false;
      this.toastr.info(`Rest over! Start set ${exercise.currentSet} of ${exercise.name}.`);
    });
  }

  startRest(): void {
    this.isResting = true;
    this.restTimeRemaining = 60;
    this.startRestTimer(() => {
      this.isResting = false;
      this.toastr.info('Rest period over! Time to start the next exercise.');
    });
  }

  startRestTimer(callback: () => void): void {
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

  cancelWorkout(): void {
    this.resetWorkout();
    clearInterval(this.timer);
    this.toastr.error('Workout has been cancelled.');
  }

  openConfirmCancelModal(): void {
    this.showConfirmCancelModal = true;
  }

  closeConfirmCancelModal(): void {
    this.showConfirmCancelModal = false;
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
}
