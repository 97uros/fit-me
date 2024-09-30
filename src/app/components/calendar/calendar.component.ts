import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Firestore, collection, addDoc, getDocs, doc, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { WorkoutService } from '../../services/workout.service';
import { ToastrService } from 'ngx-toastr';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  done: boolean;
}

interface Workout {
  id: number;
  name: string;
  exercises: Exercise[];
  scheduledTime?: string; // Optional time for scheduled workout
  scheduledDate?: string; // Date when the workout is scheduled
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
  scheduledWorkouts: { [dateString: string]: Workout[] } = {}; // Use string keys for scheduled workouts
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
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.updateCalendar();
    this.loadWorkouts();
    this.loadScheduledWorkouts();
    this.loadFinishedWorkouts();
  }

  async loadWorkouts() {
    this.workouts = await this.workoutService.getUserWorkouts();
  }

  async loadScheduledWorkouts() {
    const user = this.auth.currentUser;
    if (user) {
      const scheduledWorkouts: { [dateString: string]: Workout[] } = {};
      const scheduledCollection = collection(this.firestore, `users/${user.uid}/scheduledWorkouts`);
      const snapshot = await getDocs(scheduledCollection);
      snapshot.forEach(doc => {
        const data = doc.data() as Workout;
        const dateString = data.scheduledDate || '';
        if (!scheduledWorkouts[dateString]) {
          scheduledWorkouts[dateString] = [];
        }
        scheduledWorkouts[dateString].push(data);
      });
      this.scheduledWorkouts = scheduledWorkouts;
    }
  }

  async loadFinishedWorkouts(): Promise<void> {
    const finishedWorkouts = await this.workoutService.getUserFinishedWorkouts();
    this.finishedWorkouts = finishedWorkouts;
    console.log(this.finishedWorkouts);    
  }

  showFinishedWorkoutTooltip(day: Date): void {
    this.hoveredFinishedWorkout = this.finishedWorkouts.find(workout => {
      const completedDate = this.convertTimestampToDate(workout.completedAt);
      return this.isSameDate(completedDate, day);
    });
    if (this.hoveredFinishedWorkout) {
      this.hoveredFinishedWorkoutTime = this.convertTimestampToDate(this.hoveredFinishedWorkout.completedAt);
    }
  }

  // Function to hide finished workout tooltip
  hideFinishedWorkoutTooltip(): void {
    this.hoveredFinishedWorkout = null;
    this.hoveredFinishedWorkoutTime = null;
  }

  // Function to show scheduled workout tooltip
  showScheduledWorkoutTooltip(workout: any): void {
    this.hoveredScheduledWorkout = workout;
  }

  // Function to hide scheduled workout tooltip
  hideScheduledWorkoutTooltip(): void {
    this.hoveredScheduledWorkout = null;
  }

  convertTimestampToDate(timestamp: any): Date {
    if (timestamp && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    return new Date();
  }

  hasFinishedWorkoutOnDate(day: Date): boolean {
    return this.finishedWorkouts.some(workout => {
      const completedDate = this.convertTimestampToDate(workout.completedAt);
      return this.isSameDate(completedDate, day);
    });
  }

  hasMissedWorkoutOnDate(day: Date): boolean {
    const scheduledWorkouts = this.scheduledWorkouts[day.toDateString()];
    if (!scheduledWorkouts || !this.isPastDay(day)) {
      return false;
    }
    return scheduledWorkouts.some(workout => {
      return !this.finishedWorkouts.some(finished => {
        const completedDate = this.convertTimestampToDate(finished.completedAt);
        return this.isSameDate(completedDate, day);
      });
    });
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
      const workoutWithTime = { ...this.selectedWorkout, scheduledTime: this.selectedTime, scheduledDate: dateString }; // Add selected time and date
      if (!this.scheduledWorkouts[dateString]) {
        this.scheduledWorkouts[dateString] = [];
      }
      this.scheduledWorkouts[dateString].push(workoutWithTime);
      // Save scheduled workout to Firestore
      const user = this.auth.currentUser;
      if (user) {
        const workoutRef = collection(this.firestore, `users/${user.uid}/scheduledWorkouts`);
        await addDoc(workoutRef, workoutWithTime);
      }
      this.selectedWorkout = null;
      this.cancelSelection();
    }
  }

  async deleteWorkoutFromDate(date: Date, workoutId: number) {
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
          const scheduledCollection = collection(this.firestore, `users/${user.uid}/scheduledWorkouts`);
          const query = (await getDocs(scheduledCollection)).docs.find(doc => doc.data()['id'] === workoutId.toString());
          if (query) {
            await deleteDoc(doc(this.firestore, `users/${user.uid}/scheduledWorkouts/${query.id}`));
          }
        }
      }
    }
  }

  cancelSelection() {
    this.selectedDate = null;
    this.selectedWorkout = null;
    this.selectedTime = '';
  }
}
