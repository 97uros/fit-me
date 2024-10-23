import { Component, OnInit } from '@angular/core';
import { WorkoutService } from '../../services/workout.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { achievements, getAchievement } from '../../utils/points-and-achievements';
import { ToastrService } from 'ngx-toastr';
import { ChartsComponent } from './charts/charts.component';
import { TimeService } from '../../services/time.service';
import { BodyStatsComponent } from './body-stats/body-stats.component';
import { GFitService } from '../../services/gfit.service';
import { WeightTrackerComponent } from './weight-tracker/weight-tracker.component';
import { StepsTrackerComponent } from './steps-tracker/steps-tracker.component';
import { CaloriesTrackerComponent } from './calories-tracker/calories-tracker.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartsComponent, BodyStatsComponent, WeightTrackerComponent, StepsTrackerComponent, CaloriesTrackerComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userId: string | null = null;
  profileData: any = {
    weight: null,
  };
  points: number = 0;
  achievements: any[] = [];
  currentAchievement: any = { name: '', badgeUrl: '' };
  userWeight: any;
  weightDifference: string | null = null;
  errorMessage: string | null = null;
  totalTimeSpent: string = '00:00:00';
  numberOfWorkoutsDone: number = 0;
  mostRecentWorkout: any = null;
  nextScheduledWorkout: any = null;

  // User weight

  isMetric: boolean = true;
  
  // Steps and calories

  caloriesBurnedToday: number = 0;
  steps: number = 0;
  stepGoal: number | null = null;
  stepProgress: number = 0;
  caloriesGoal: number | null = null;
  caloriesProgress: number = 0;

  constructor(
    private auth: Auth,
    private userService: UserService,
    private workoutService: WorkoutService,
    private toastr: ToastrService,
    private timeService: TimeService,
    private router: Router,
    private gfitService: GFitService,
  ) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }
    await this.fetchProfileData();
    await this.loadDashboardData();
    await this.loadGoogleFitData();
    await this.fetchUserPoints();
    await this.fetchCurrentAchievement();
    await this.loadUserGoals();
  }

  loadUserGoals() {
    this.userService.getUserGoals().subscribe((goals: { stepGoal: number | null; caloriesGoal: number | null; }) => {
      this.stepGoal = goals.stepGoal;
      this.caloriesGoal = goals.caloriesGoal;
      this.calculateProgress();
    });
  }
  
  loadGoogleFitData() {
    this.gfitService.getSteps().subscribe(steps => {
      this.steps = steps || 0;
      this.calculateCaloriesFromSteps();
      this.calculateProgress();
    });
  }

  calculateCaloriesFromSteps() {
    const caloriesPerStep = 0.05;
    const caloriesBurnedFromSteps = this.steps * caloriesPerStep;
    this.caloriesBurnedToday += caloriesBurnedFromSteps;
  }

  calculateProgress() {
    if (this.stepGoal && this.steps) {
      this.stepProgress = Math.min((this.steps / this.stepGoal) * 100, 100);
    }
    if (this.caloriesGoal && this.caloriesBurnedToday) {
      this.caloriesProgress = Math.min((this.caloriesBurnedToday / this.caloriesGoal) * 100, 100);
    }
  }

  fetchProfileData() {
    this.userService.getGoogleFitProfileData().subscribe({
      next: (profileData) => {
        if (profileData) {
          this.profileData = profileData;
          this.fetchWeightAndHeight();
        } else {
          this.errorMessage = 'No profile data found.';
        }
      },
      error: (error) => this.errorMessage = 'Error fetching profile data'
    });    
  }

  fetchWeightAndHeight() {
    this.userService.getUserWeight().subscribe(weight => this.profileData.weight = weight);
    this.userService.getUserHeight().subscribe(height => this.profileData.height = height);
  }

  get age(): number | null {
    return this.userService.calculateAge(this.profileData.dob);
  }

  getDaysAgo(date: Date): string {
    return this.timeService.getDaysAgo(date);
  }

  getInDays(dateString: string): string {
    return this.timeService.getInDays(dateString);
  }

  async fetchUserPoints() {
    this.userService.getUserTotalPoints().then(points => {
      this.points = points;
      this.currentAchievement = getAchievement(points);
    }).catch(error => {
      console.error('Error fetching user points:', error);
      this.toastr.error('Could not fetch user points.');
    });
  }

  async fetchCurrentAchievement(): Promise<void> {
    const points = await this.userService.getUserTotalPoints();
    this.currentAchievement = getAchievement(points) || { name: 'No achievement', badgeUrl: '' };
  }

  async loadDashboardData() {
    if (!this.userId) return;
    try {
      // Fetch finished workouts
      const finishedWorkouts = await this.workoutService.getFinishedWorkouts(this.userId);
      this.numberOfWorkoutsDone = finishedWorkouts.length;
      if (finishedWorkouts.length > 0) {
        this.mostRecentWorkout = finishedWorkouts.reduce((prev, current) =>
          prev.completedAt.toDate() > current.completedAt.toDate() ? prev : current
        );
        const totalMinutes = finishedWorkouts.reduce((sum, workout) => sum + workout.timeSpent, 0);
        this.totalTimeSpent = this.timeService.formatTime(totalMinutes);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Calculate calories burned from finished workouts today
        this.caloriesBurnedToday = finishedWorkouts
          .filter(workout => workout.completedAt.toDate() >= today)
          .reduce((sum, workout) => sum + workout.totalCalories, 0) || 0; // Default to 0 if no workouts
        this.calculateCaloriesFromSteps(); // Ensure steps calories are combined
      }
      // Fetch scheduled workouts
      const scheduledWorkouts = await this.workoutService.getScheduledWorkouts(this.userId);
      if (scheduledWorkouts.length > 0) {
        this.nextScheduledWorkout = scheduledWorkouts.reduce((prev, current) =>
          new Date(prev.scheduledDate) < new Date(current.scheduledDate) ? prev : current
        );
      }
      // Fetch achievements and points
      this.fetchUserPoints();
      // After fetching points, calculate current achievement
      const points = await this.userService.getUserTotalPoints();
      this.currentAchievement = getAchievement(points);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  onChartReady() {}
}
