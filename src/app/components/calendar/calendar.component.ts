import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Firestore, collection, addDoc, getDocs, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { WorkoutService } from '../../services/workout.service';
import { ToastrService } from 'ngx-toastr';
import { doc } from 'firebase/firestore';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
interface Exercise {
  name: string;
  sets: number;
  reps: number;
  done: boolean;
}

interface Workout {
  id: string; // Change this to string if it's a string in Firestore
  name: string;
  exercises: Exercise[];
  scheduledTime?: string; // Optional time for scheduled workout
  scheduledDate?: string; // Date when the workout is scheduled
  status?: 'completed' | 'missed' | 'scheduled' | 'none'; // Include 'scheduled'
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  currentDate = new Date();
  days: (Date | null)[] = [];
  monthName: string = '';
  year: number = 0;
  scheduledWorkouts: { [dateString: string]: Workout[] } = {};
  finishedWorkouts: any[] = [];
  workouts: Workout[] = []; // List of available workouts
  selectedDate: Date | null = null;
  hoveredDate: string | null = null;
  selectedWorkout: Workout | null = null;
  selectedTime: string = '';

  hoveredFinishedWorkout: any = null;
  hoveredFinishedWorkoutTime: Date | null = null;
  hoveredScheduledWorkout: any = null;

  constructor(
    private firestore: Firestore, 
    private auth: Auth, 
    private workoutService: WorkoutService,
    private router: Router,
    private notificationService: NotificationService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.updateCalendar();
    this.loadWorkouts();
    this.loadScheduledWorkouts();
    this.loadFinishedWorkouts();
  }

  scheduleWorkoutReminder(workout: Workout) {
    const now = new Date().getTime();
    const workoutTime = new Date(workout.scheduledDate + ' ' + workout.scheduledTime).getTime(); // combine date & time
    const timeDifference = workoutTime - now;
  
    if (timeDifference > 0) {
      // Trigger reminder 15 minutes before workout
      const reminderTime = timeDifference - 15 * 60 * 1000; // 15 minutes in milliseconds
  
      setTimeout(() => {
        this.notificationService.showReminder(
          'Workout Reminder',
          `Your workout "${workout.name}" is in 15 minutes!`
        );
      }, reminderTime);
    }
  }

  async loadWorkouts() {
    const user = this.auth.currentUser;
    if (user) {
      this.workouts = await this.workoutService.getUserWorkouts(user.uid);
    }
  }

  async loadScheduledWorkouts() {
    const user = this.auth.currentUser;
    if (user) {
      const scheduledWorkouts: { [dateString: string]: Workout[] } = {};
      try {
        const workoutInstances = await this.workoutService.getScheduledWorkouts(user.uid);
        workoutInstances.forEach(instance => {
          let scheduledDate: Date;     
          // Check if scheduledDate is a Firestore Timestamp
          if (instance.scheduledDate && typeof instance.scheduledDate.toDate === 'function') {
            scheduledDate = instance.scheduledDate.toDate();
          } else if (typeof instance.scheduledDate === 'string') {
            scheduledDate = new Date(instance.scheduledDate); // Convert string to Date
          } else {
            console.warn('Invalid scheduledDate format:', instance.scheduledDate);
            return; // Skip this instance if the format is invalid
          }
          const dateString = scheduledDate.toDateString(); // Ensure it’s a string
          if (!scheduledWorkouts[dateString]) {
            scheduledWorkouts[dateString] = [];
          }
          scheduledWorkouts[dateString].push(instance);
        });
        this.scheduledWorkouts = scheduledWorkouts;
      } catch (error) {
        this.toastr.error('Error loading scheduled workouts: ' + (error as any).message);
      }
    }
  }

  async loadFinishedWorkouts(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      this.finishedWorkouts = await this.workoutService.getFinishedWorkouts(user.uid);
    }
  }

  showFinishedWorkoutTooltip(day: Date): void {
    this.hoveredFinishedWorkout = this.finishedWorkouts.find(workout => {
      const completedDate = workout.completedAt?.toDate();
      return completedDate && this.isSameDate(completedDate, day);
    });
    if (this.hoveredFinishedWorkout) {
      this.hoveredFinishedWorkoutTime = this.hoveredFinishedWorkout.completedAt?.toDate();
    }
  }

  hideFinishedWorkoutTooltip(): void {
    this.hoveredFinishedWorkout = null;
    this.hoveredFinishedWorkoutTime = null;
  }

  showScheduledWorkoutTooltip(workout: any): void {
    this.hoveredScheduledWorkout = workout;
  }

  hideScheduledWorkoutTooltip(): void {
    this.hoveredScheduledWorkout = null;
  }

  hasFinishedWorkoutOnDate(day: Date): boolean {
    return this.finishedWorkouts.some(workout => {
      const completedDate = workout.completedAt?.toDate();
      return completedDate && this.isSameDate(completedDate, day);
    });
  }

  hasMissedWorkoutOnDate(day: Date): boolean {
    const scheduledWorkouts = this.scheduledWorkouts[day.toDateString()];
    if (!scheduledWorkouts || !this.isPastDay(day)) {
      return false;
    }
    return scheduledWorkouts.some(workout => workout.status === 'missed');
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  updateCalendar() {
    const firstDayOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    this.monthName = format(firstDayOfMonth, 'MMMM');
    this.year = firstDayOfMonth.getFullYear();
    this.days = Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDayOfMonth.getDay() + 1;
      return day > 0 && day <= daysInMonth ? new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day) : null;
    });
  }

  changeMonth(direction: number) {
    const newDate = new Date(this.currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today && direction < 0) {
      return;
    }
    this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    this.updateCalendar();
  }

  isToday(day: Date | null): boolean {
    return day ? day.getDate() === new Date().getDate() &&
      day.getMonth() === new Date().getMonth() &&
      day.getFullYear() === new Date().getFullYear() : false;
  }

  isPastDay(day: Date | null): boolean {
    if (!day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight to compare only the date
    return day.getTime() < today.getTime(); // Compare day timestamps
  }

  getDayClasses(day: Date | null): string {
    if (!day) return 'rounded-md p-2';
    return [
      'rounded-md p-2',
      this.isToday(day) ? 'bg-sky-800 text-white font-bold uppercase hover:bg-sky-700' : '',
      this.isPastDay(day) ? 'bg-transparent text-gray-400 disabled:cursor-not-allowed disabled:opacity-50' : ''
    ].join(' ');
  }

  selectDate(day: Date | null) {
    if (day) {
      this.selectedDate = day;
    }
  }

  async addWorkoutToDate() {
    if (this.selectedDate && this.selectedWorkout) {
      const dateString = this.selectedDate.toDateString();
      const workoutWithTime = { 
        ...this.selectedWorkout, 
        scheduledTime: this.selectedTime, 
        scheduledDate: dateString,
        status: 'scheduled' as 'scheduled' // Ensure this matches the expected type
      }; 
      // Save scheduled workout to Firestore in workoutInstances
      const user = this.auth.currentUser;
      if (user) {
        const workoutRef = collection(this.firestore, `users/${user.uid}/workoutInstances`);
        await addDoc(workoutRef, workoutWithTime);
      }
      // Update local state to reflect the scheduled workout
      if (!this.scheduledWorkouts[dateString]) {
        this.scheduledWorkouts[dateString] = [];
      }
      this.scheduledWorkouts[dateString].push(workoutWithTime);
      this.scheduleWorkoutReminder(this.selectedWorkout); // Keep the local state for display
      this.selectedWorkout = null;
      this.cancelSelection();
    }
  }

  async deleteWorkoutFromDate(date: Date, workoutId: string) {
    const dateString = date.toDateString();
    if (this.scheduledWorkouts[dateString]) {
      const workoutToDelete = this.scheduledWorkouts[dateString].find(workout => workout.id === workoutId);
      if (workoutToDelete) {
        // Remove from local state
        this.scheduledWorkouts[dateString] = this.scheduledWorkouts[dateString].filter(workout => workout.id !== workoutId);
        if (this.scheduledWorkouts[dateString].length === 0) {
          delete this.scheduledWorkouts[dateString];
        }
        // Remove from Firestore
        const user = this.auth.currentUser;
        if (user) {
          const scheduledCollection = collection(this.firestore, `users/${user.uid}/workoutInstances`);
          const query = (await getDocs(scheduledCollection)).docs.find(doc => doc.data()['id'] === workoutId);
          if (query) {
            await deleteDoc(doc(this.firestore, `users/${user.uid}/workoutInstances/${query.id}`));
          }
        }
      }
    }
  }

  startWorkout(workout: Workout): void {
    // Navigate to the workout component and pass the selected workout
    this.router.navigate(['/workouts'], { queryParams: { workoutId: workout.id } });
  }

  cancelSelection() {
    this.selectedDate = null;
    this.selectedWorkout = null;
    this.selectedTime = '';
  }
}
