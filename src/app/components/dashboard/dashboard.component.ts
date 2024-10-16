import { Component, OnInit } from '@angular/core';
import { WorkoutService } from '../../services/workout.service';
import { UserService } from '../../services/user.service';
import { CommonModule } from '@angular/common';
import {
  ChartComponent,
  NgApexchartsModule,
  ApexChart,
  ApexStroke,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexResponsive,
  ApexMarkers,
  ApexOptions,
  ApexFill,
  ApexTheme,
} from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { Firestore } from '@angular/fire/firestore';
import { achievements, getAchievement, calculatePoints } from '../../utils/points-and-achievements';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule ],
  providers: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  userId: string | null = null;
  profileData: any = {
    firstName: '',
    dob: '',
    height: null,
    weight: null,
    gender: null,
    profilePicture: null 
  };
  userAchievements: { id: string; badgeUrl: string; dateUnlocked: any }[] = [];
  currentAchievement: { name: string; badgeUrl: string } | null = null; // Declare the currentAchievement property
  achievementList = [
    achievements.level_1,
    achievements.level_2,
    achievements.level_3,
    achievements.level_4,
    achievements.level_5,
    achievements.level_6,
    achievements.level_7
  ];
  userWeight: number = 0;
  weightDifference: string | null = null;
  errorMessage: string | null = null;
  totalTimeSpent: string = '00:00:00';
  numberOfWorkoutsDone: number = 0;
  mostRecentWorkout: any = null;
  nextScheduledWorkout: any = null;
  caloriesBurnedToday: number | null = null;

  public chartOptions: Partial<{
    chart: ApexChart;
    stroke: ApexStroke;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    series: { name: string; data: number[] }[];
    title: ApexTitleSubtitle;
    tooltip: ApexTooltip;
  }> = {};

  public pieChartOptions: Partial<{
    chart: ApexChart;
    series: ApexNonAxisChartSeries;
    labels: string[];
    responsive: ApexResponsive[];
    title: ApexTitleSubtitle;
    legend: ApexLegend;
    colors: string[];
    theme: ApexTheme;
  }> = {};

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private userService: UserService, 
    private workoutService: WorkoutService, 
    private toastr: ToastrService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (!this.userId) {
      this.router.navigate(['/login']);
      return;
    }
    this.fetchProfileData();
    await this.fetchWeightHistory();
    await this.loadDashboardData();
    await this.loadPieChartData();
    this.setupChart();
  }

  fetchProfileData() {
    const profileDocRef = doc(this.firestore, `users/${this.userId}`);
    getDoc(profileDocRef).then(docSnap => {
      if (docSnap.exists()) {
        this.profileData = docSnap.data();
        this.userWeight = this.profileData.weight || 0; // Prepopulate userWeight
      } else {
        this.errorMessage = 'No profile data found. You can create a new profile.';
      }
    }).catch(err => {
      console.error('Error fetching profile data', err);
    });
  }  

  get age(): number | null {
    if (!this.profileData.dob) return null;
    const dob = new Date(this.profileData.dob);
    const ageDiff = Date.now() - dob.getTime();
    const ageDate = new Date(ageDiff); // miliseconds from epoch
    return Math.abs(ageDate.getUTCFullYear() - 1970); // subtract 1970 to get age
  }

  async fetchWeightHistory() {
    if (!this.userId) return;
    const weightHistory = await this.userService.getWeightHistory(this.userId);
    this.calculateWeightDifference(weightHistory);
  }

  calculateWeightDifference(weightHistory: any[]) {
    if (weightHistory.length === 0) {
      this.weightDifference = null;
      return;
    }

    const currentMonth = new Date().getMonth();
    let lastMonthWeight: number | null = null;

    for (let i = weightHistory.length - 1; i >= 0; i--) {
      const recordDate = new Date(weightHistory[i].date);
      const recordMonth = recordDate.getMonth();
      if (recordMonth === currentMonth - 1 || (currentMonth === 0 && recordMonth === 11)) {
        lastMonthWeight = weightHistory[i].weight;
        break;
      }
    }

    if (lastMonthWeight !== null) {
      const currentWeight = this.profileData.weight;
      const difference = currentWeight - lastMonthWeight;
      this.weightDifference = `${Math.abs(difference)}kg ${difference < 0 ? 'less' : 'more'} than last month`;
    } else {
      this.weightDifference = 'No weight data from last month available.';
    }
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  getDaysAgo(targetDate: Date): string {
    const today = new Date();
    const timeDiff = today.getTime() - targetDate.getTime(); // Difference between today and the target date
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
  
    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
    } else {
      return 'Invalid date';
    }
  }
  
  getInDays(dateString: string): string {
    const today = new Date();
    const date = new Date(dateString); // Convert string to Date object
    const timeDiff = date.getTime() - today.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''} from now`;
    } else {
      return 'Invalid date';
    }
  }

  async loadDashboardData() {
    if (!this.userId) return;

    try {
      // Fetch finished workouts
      const finishedWorkouts = await this.workoutService.getFinishedWorkouts(this.userId);
      console.log('Finished workouts:', finishedWorkouts);
      this.numberOfWorkoutsDone = finishedWorkouts.length;

      if (finishedWorkouts.length > 0) {
        this.mostRecentWorkout = finishedWorkouts.reduce((prev, current) =>
          prev.completedAt.toDate() > current.completedAt.toDate() ? prev : current
        );
        const totalMinutes = finishedWorkouts.reduce((sum, workout) => sum + workout.timeSpent, 0);
        this.totalTimeSpent = this.formatTime(totalMinutes);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.caloriesBurnedToday = finishedWorkouts
          .filter(workout => workout.completedAt.toDate() >= today)
          .reduce((sum, workout) => sum + workout.totalCalories, 0);
      }

      // Fetch scheduled workouts
      const scheduledWorkouts = await this.workoutService.getScheduledWorkouts(this.userId);
      console.log('Scheduled workouts:', scheduledWorkouts);
      if (scheduledWorkouts.length > 0) {
        this.nextScheduledWorkout = scheduledWorkouts.reduce((prev, current) =>
          new Date(prev.scheduledDate) < new Date(current.scheduledDate) ? prev : current
        );
      }

      // Fetch achievements
      const totalPoints = await this.userService.getUserTotalPoints();
      this.currentAchievement = getAchievement(totalPoints);
      this.userAchievements = await this.userService.getUserAchievements();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  }

  changeUserWeight() {
    if (this.userWeight === this.profileData.weight) {
      this.toastr.info('This is your current weight.');
    } else {
      this.userService.addBodyWeight(this.userWeight).then(() => {
        this.toastr.success('Weight updated successfully');
      }).catch(error => {
        this.toastr.error('Error updating weight:', error);
      });
    }
  }

  async setupChart(): Promise<void> {
    const currentWeek = this.getCurrentWeekDates();
    const finishedWorkouts = await this.workoutService.getFinishedWorkouts(this.userId!);
    const workoutData = currentWeek.map(date => {
      const workout = finishedWorkouts.find(w => w.completedAt.toDate().toDateString() === date.toDateString());
      return workout ? workout.timeSpent : 0;
    });
    this.chartOptions = {
      chart: { type: 'line', height: 350, zoom: { enabled: false } }, 
      stroke: { curve: 'smooth', colors: ['#0284c7'] },
      series: [{ name: 'Time Spent (minutes)', data: workoutData }],
      xaxis: { categories: currentWeek.map(date => date.toLocaleDateString()), labels: { style: { colors: 'white' } } },
      yaxis: { labels: { style: { colors: 'white' } } },
      title: { text: 'Workout Activity This Week', align: 'center', style: { color: 'white' } },
      tooltip: { enabled: false }
    };
  }

  async loadPieChartData(): Promise<void> {
    if (!this.userId) return;
  
    const musclesWorkedData = await this.workoutService.getMusclesWorkedLast7Days(this.userId);
    const series = Object.values(musclesWorkedData).map(data => data.count); // Extract counts
    const labels = Object.keys(musclesWorkedData);  // Extract muscle names
  
    const customColors = ['#075985', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#a5f3fc', '#e0f2fe', '#f0f9ff'];
  
    // If there's no data, show a message
    if (series.length === 0) {
      this.pieChartOptions = {
        chart: { type: 'donut', height: 350 },
        series: [0],  // No data
        labels: ['No data available'],
        colors: customColors,
        title: { text: 'Muscles Worked in the Last 7 Days', align: 'center', style: { color: 'white' } },
        legend: { show: false }
      };
    } else {
      this.pieChartOptions = {
        chart: { type: 'donut', height: 350 },
        series: series,  // Number of times each muscle was worked
        labels: labels,  // Muscle names
        colors: customColors.slice(0, series.length),
        title: { text: 'Muscles Worked in the Last 7 Days', align: 'center', margin: 20, style: { color: 'white' } },
        legend: { show: true, labels: { colors: 'white' }, position: 'bottom' }
      };
    }
  }
  

  getCurrentWeekDates(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return week;
  }
}