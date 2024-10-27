import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';
import { WorkoutService } from '../../services/workout.service';
import { EditWorkoutModalComponent } from './edit-workout-modal/edit-workout-modal.component';
import { StartWorkoutModalComponent } from './start-workout-modal/start-workout-modal.component';

@Component({
  selector: 'app-workouts',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, EditWorkoutModalComponent, StartWorkoutModalComponent ],
  templateUrl: './workouts.component.html',
  styleUrls: ['./workouts.component.scss']
})
export class WorkoutsComponent implements OnInit {

  profileData: any = {
    weight: null,
  };
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
  errorMessage: string | null = null;

  constructor(
    private userService: UserService,
    private workoutService: WorkoutService, 
    private auth: Auth,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchWorkouts();
    this.fetchProfileData();  
    this.route.queryParams.subscribe(params => {
      const workoutId = params['workoutId'];
      if (workoutId) {
        this.startWorkoutById(workoutId);
      }
    });
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
    }).catch(error => {
      console.error('Error fetching weight and height:', error);
      this.toastr.error('Could not fetch weight and height.');
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
        this.startWorkout(workout);
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

  startWorkout(workout: any): void { 
    this.resetWorkoutState();
    this.startingWorkout = {
      ...workout,
      exercises: workout.exercises.map((exercise: any) => ({
        ...exercise,
        done: false,
        currentSet: 1,
        current: false
      }))
    };
    this.restTimeRemaining = 30;
    this.isResting = false;
    this.currentExerciseIndex = 0;
    this.elapsedSeconds = 0;
    this.progress = 0;
    this.startTimer();  // Starts the timer for tracking elapsed workout time
    this.toastr.info(`Starting workout: ${workout.name}`);
  }
  
  resetWorkoutState(): void {
    this.startingWorkout = null; // Clear previous workout data
    this.currentExerciseIndex = 0;
    this.progress = 0;
    this.restTimeRemaining = 30; // or default rest time
    this.isResting = false;
    if (this.timer) {
      clearInterval(this.timer);  // Stop any existing timers
    }
    this.timer = null;
    this.earnedBadges = [];
    this.elapsedSeconds = 0;
    this.countdownDuration = 3;
    this.countdown = 0;
    this.isCountdownActive = false;
    this.showConfirmCancelModal = false;
  }

  startTimer(): void {
    this.timer = setInterval(() => {
      this.elapsedSeconds++;
    }, 1000);
  }

}
