import { Component, OnInit, viewChild, TemplateRef, ViewChild } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { WorkoutService } from '../../services/workout.service';
import { ToastrService } from 'ngx-toastr';
import { Router } from '@angular/router';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { FullCalendarModule } from '@fullcalendar/angular';
import tippy from 'tippy.js';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getDatabase, ref, set, get, remove, push } from 'firebase/database';

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
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {

  @ViewChild('tooltipTemplate', { static: true })
  tooltipTemplate!: TemplateRef<any>;

  currentDate = new Date();
  workouts: Workout[] = [];
  scheduledWorkouts: { [dateString: string]: Workout[] } = {};
  finishedWorkouts: Workout[] = [];
  selectedDate: Date | null = null;
  selectedWorkout: Workout | null = null;
  selectedTime: string = '';

  calendarOptions: {
    plugins: any[];
    initialView: string;
    headerToolbar: {
      left: string;
      center: string;
      right: string;
    };
    editable: boolean;
    dateClick: (arg: any) => void;
    eventClick: (arg: any) => void;
    events: (info: { start: Date; end: Date; }) => Promise<any[]>;
    eventDidMount: (arg: any) => void;
    firstDay: number
  };

  constructor(
    private auth: Auth,
    private workoutService: WorkoutService,
    private router: Router,
    private toastr: ToastrService,
  ) {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay'
      },
      editable: true,
      dateClick: this.handleDateClick.bind(this),
      eventClick: this.handleEventClick.bind(this),
      events: this.loadScheduledWorkouts.bind(this),
      eventDidMount: this.handleEventDidMount.bind(this),
      firstDay: 1
    };
  }

  ngOnInit() {
    this.loadWorkouts();
    this.loadFinishedWorkouts();
  }

  async loadWorkouts() {
    const user = this.auth.currentUser;
    if (user) {
      this.workouts = await this.workoutService.getUserWorkouts(user.uid);
    }
  }

  async loadScheduledWorkouts(info: any) {
    const user = this.auth.currentUser;
    if (user) {
      const scheduledWorkouts: any[] = [];
      const db = getDatabase();
      const workoutsRef = ref(db, `users/${user.uid}/workoutInstances`);
      try {
        const snapshot = await get(workoutsRef);
        if (snapshot.exists()) {
          const workoutInstances = snapshot.val();
          this.scheduledWorkouts = {}; // Reset the scheduledWorkouts before loading
          for (const key in workoutInstances) {
            const instance = workoutInstances[key];
            let workoutDate: Date;
            // Ensure we're processing the date correctly
            if (instance.status === 'completed' && instance.completedAt) {
              workoutDate = new Date(instance.completedAt);
            } else if (instance.scheduledDate && typeof instance.scheduledDate === 'string') {
              // Parse as UTC
              workoutDate = new Date(instance.scheduledDate + 'T00:00:00Z'); // Add Z to ensure it's treated as UTC
            } else {
              console.warn('Invalid date format for workout instance:', instance);
              continue;
            }
            // Normalize the date to UTC midnight
            workoutDate.setUTCHours(0, 0, 0, 0);
            const dateString = workoutDate.toISOString().split('T')[0]; // Format to YYYY-MM-DD
            // Initialize the date entry if it doesn't exist
            if (!this.scheduledWorkouts[dateString]) {
              this.scheduledWorkouts[dateString] = [];
            }
            // Prepare event data for FullCalendar
            const event = {
              title: this.getEventTitle(instance),
              date: dateString, // Use the formatted date
              extendedProps: {
                id: key,
                scheduledTime: instance.scheduledTime,
                status: instance.status,
              },
              className: this.getEventClass(instance.status),
            };
             scheduledWorkouts.push(event);
            this.scheduledWorkouts[dateString].push(instance); // Store the instance
          }
        }
        return scheduledWorkouts; // Return events for FullCalendar
      } catch (error) {
        this.toastr.error('Error loading scheduled workouts: ' + (error as any).message);
      }
    }
    return []; // Return empty if user is not logged in
  }


  getEventTitle(instance: Workout) {
    return `${instance.name}`;
  }

  getEventClass(status: string) {
    if (status === 'completed') {
      return 'fc-event-completed';
    } else if (status === 'missed') {
      return 'fc-event-missed';
    }
    return 'fc-event-scheduled';
  }

  async markWorkoutAsMissed(workout: Workout) {
    const user = this.auth.currentUser;
    if (user) {
      const db = getDatabase();
      const workoutRef = ref(db, `users/${user.uid}/workoutInstances/${workout.id}`);
      await set(workoutRef, { ...workout, status: 'missed' });
    }
  }

  async loadFinishedWorkouts(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const db = getDatabase();
      const finishedWorkoutsRef = ref(db, `users/${user.uid}/workoutInstances`);
      try {
        const snapshot = await get(finishedWorkoutsRef);
        if (snapshot.exists()) {
          const workoutInstances = snapshot.val();
          this.finishedWorkouts = [];
          for (const key in workoutInstances) {
            const instance = workoutInstances[key];
            if (instance.status === 'completed') {
              this.finishedWorkouts.push({
                id: key,
                name: instance.workoutName,
                scheduledDate: new Date(instance.completedAt).toISOString().split('T')[0], // Use completedAt for the date
                scheduledTime: instance.scheduledTime,
                exercises: instance.exercises,
                status: 'completed', // Keep track of the status
              });
            }
          }
        }
      } catch (error) {
        this.toastr.error('Error loading finished workouts: ' + (error as any).message);
      }
    }
  }

  handleDateClick(arg: any) {
    // Disable interaction with past dates
    if (this.isPastDay(arg.date)) {
      return; // Do nothing for past dates
    }
    // Get the date string in YYYY-MM-DD format
    const dateString = arg.date.toISOString().split('T')[0];
    const existingWorkouts = this.scheduledWorkouts[dateString] || [];    
    // Debugging output
    if (existingWorkouts.length > 0) {
      this.toastr.warning('A workout is already scheduled for this date. Please choose another date.');
      return; // Do nothing and prevent opening the modal
    }
    // Proceed to open the modal for scheduling a workout
    this.selectedDate = arg.date; // Get the clicked date
    this.selectedWorkout = null; // Reset selected workout
    this.selectedTime = ''; // Reset selected time
  }


  handleEventClick(arg: any) {
    // Do nothing for calendar events; we don't want to open a modal when clicking an event   
    return;
  }

  handleEventDidMount(arg: any) {
    const workoutId = arg.event.extendedProps.id;
    const eventDate = new Date(arg.event.start);
    if (this.isPastDay(eventDate)) {
      return; // Do not initialize the tooltip for past events
    }
    
    // Create tooltip content
    const tooltipContent = this.tooltipTemplate.createEmbeddedView({ workoutId });
    
    // Initialize tippy.js tooltip and store the single instance
    const instance = tippy(arg.el, {
      content: tooltipContent.rootNodes[0],
      allowHTML: true,
      interactive: true,
      arrow: true,
      trigger: 'mouseenter',
    })
  }

  async addWorkoutToDate() {
    if (this.selectedDate && this.selectedWorkout) {
      const dateToSchedule = new Date(this.selectedDate);
      dateToSchedule.setHours(0, 0, 0, 0); // Set to the start of the day in local time

      // Get the date string in YYYY-MM-DD format
      const dateString = dateToSchedule.toLocaleDateString('en-CA'); // 'en-CA' returns YYYY-MM-DD format
      const user = this.auth.currentUser;

      // Check if a workout is already scheduled for the selected date
      const existingWorkouts = await this.loadScheduledWorkouts({ start: dateToSchedule, end: dateToSchedule });
      const isDateOccupied = existingWorkouts.some(event => event.date === dateString);
      if (isDateOccupied) {
        this.toastr.warning('A workout is already scheduled for this date. Please choose another date.');
        return; // Exit the function to prevent adding a duplicate workout
      }

      const workoutWithTime = {
        ...this.selectedWorkout,
        scheduledTime: this.selectedTime,
        scheduledDate: dateString,
        status: 'scheduled' as 'scheduled'
      };

      if (user) {
        try {
          const db = getDatabase();
          // Generate a new unique instance ID using push()
          const workoutRef = push(ref(db, `users/${user.uid}/workoutInstances`));
          await set(workoutRef, { ...workoutWithTime, id: workoutRef.key }); // Include only 'id' from the generated key
          this.selectedWorkout = null;
          this.cancelSelection();
          this.calendarOptions.events = this.loadScheduledWorkouts.bind(this);
        } catch (error) {
          console.error('Error adding workout: ', error);
          this.toastr.error('Failed to add workout: ' + (error as any).message);
        }
      } else {
        this.toastr.error('User not authenticated.');
      }
    } else {
        this.toastr.warning('Please select a date and workout before adding.');
    }
  }

  async deleteWorkoutFromDate(eventId: string) {
    const user = this.auth.currentUser;
    if (user) {
      const db = getDatabase();
      const workoutRef = ref(db, `users/${user.uid}/workoutInstances/${eventId}`);
      await remove(workoutRef); // Use the remove method to delete the workout
      // Reload the scheduled workouts to refresh the calendar view
      this.calendarOptions.events = this.loadScheduledWorkouts.bind(this);
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

  isPastDay(day: Date | null): boolean {
    if (!day) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    day.setHours(0, 0, 0, 0); // Normalize to the start of the day
    return day.getTime() < today.getTime();
  }

}

