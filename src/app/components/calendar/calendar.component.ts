import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Firestore, collection, addDoc, getDocs, deleteDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { WorkoutService } from '../../services/workout.service';
import { ToastrService } from 'ngx-toastr';
import { doc, updateDoc } from 'firebase/firestore';
import { Router } from '@angular/router';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  done: boolean;
}
interface Workout {
  id: string; 
  name: string;
  exercises: Exercise[];
  scheduledTime?: string;
  scheduledDate?: string;
  status?: 'completed' | 'missed' | 'scheduled' | 'none';
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
  workouts: Workout[] = [];
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
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.updateCalendar();
    this.loadWorkouts();
    this.loadScheduledWorkouts();
    this.loadFinishedWorkouts();
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
        workoutInstances.forEach(async instance => {
          let scheduledDate: Date;     
          if (instance.scheduledDate && typeof instance.scheduledDate.toDate === 'function') {
            scheduledDate = instance.scheduledDate.toDate();
          } else if (typeof instance.scheduledDate === 'string') {
            scheduledDate = new Date(instance.scheduledDate);
          } else {
            console.warn('Invalid scheduledDate format:', instance.scheduledDate);
            return;
          }
          
          const dateString = scheduledDate.toDateString();
          if (!scheduledWorkouts[dateString]) {
            scheduledWorkouts[dateString] = [];
          }

          // Check if the workout is missed
          if (this.isPastDay(scheduledDate)) {
            // If missed, mark it as missed and update Firestore
            instance.status = 'missed';
            await this.markWorkoutAsMissed(instance);
          } else {
            // Only keep future scheduled workouts
            scheduledWorkouts[dateString].push(instance);
          }
        });
        this.scheduledWorkouts = scheduledWorkouts;
      } catch (error) {
        this.toastr.error('Error loading scheduled workouts: ' + (error as any).message);
      }
    }
  }

  async markWorkoutAsMissed(workout: Workout) {
    const user = this.auth.currentUser;
    if (user) {
      const workoutRef = doc(this.firestore, `users/${user.uid}/workoutInstances/${workout.id}`);
      await updateDoc(workoutRef, { status: 'missed' });
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
    today.setHours(0, 0, 0, 0);
    return day.getTime() < today.getTime();
  }

  getDayClasses(day: Date | null): string {
    if (!day) return 'rounded-full p-2';
    return [
      'rounded-full p-2',
      this.isToday(day) ? 'bg-green-600 text-white font-bold uppercase hover:bg-green-700' : '',
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
        status: 'scheduled' as 'scheduled'
      }; 
      const user = this.auth.currentUser;
      if (user) {
        const workoutRef = collection(this.firestore, `users/${user.uid}/workoutInstances`);
        await addDoc(workoutRef, workoutWithTime);
      }
      if (!this.scheduledWorkouts[dateString]) {
        this.scheduledWorkouts[dateString] = [];
      }
      this.scheduledWorkouts[dateString].push(workoutWithTime);
      this.selectedWorkout = null;
      this.cancelSelection();
    }
  }

  async deleteWorkoutFromDate(date: Date, workoutId: string) {
    const dateString = date.toDateString();
    if (this.scheduledWorkouts[dateString]) {
      const workoutToDelete = this.scheduledWorkouts[dateString].find(workout => workout.id === workoutId);
      if (workoutToDelete) {
        this.scheduledWorkouts[dateString] = this.scheduledWorkouts[dateString].filter(workout => workout.id !== workoutId);
        if (this.scheduledWorkouts[dateString].length === 0) {
          delete this.scheduledWorkouts[dateString];
        }
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
    this.router.navigate(['/workouts'], { queryParams: { workoutId: workout.id } });
  }

  cancelSelection() {
    this.selectedDate = null;
    this.selectedWorkout = null;
    this.selectedTime = '';
  }
}
