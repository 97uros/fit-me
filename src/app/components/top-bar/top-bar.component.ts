import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { WorkoutService } from '../../services/workout.service'; // Import WorkoutService
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {
  userProfile: any = null;
  currentRoute: string = '';
  showNotifications: boolean = false;
  notifications: string[] = [];

  constructor(
    private router: Router,
    private userService: UserService,
    private workoutService: WorkoutService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentRoute = this.router.url;
      });
    
    this.userService.getUserProfile().subscribe(
      profile => {
        this.userProfile = profile;
        this.cdr.detectChanges();
      },
      error => {
        console.error('Error loading user profile:', error);
      }
    );

    this.checkForScheduledWorkouts(); // Check notifications on init
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  private async checkForScheduledWorkouts(): Promise<void> {
    const scheduledWorkouts = await this.workoutService.getUserScheduledWorkouts();
    const currentTime = new Date();
    
    // Calculate one hour and half an hour from now
    const oneHourFromNow = new Date(currentTime.getTime() + 60 * 60 * 1000);
    const halfAnHourFromNow = new Date(currentTime.getTime() + 30 * 60 * 1000);
  
    this.notifications = scheduledWorkouts
      .flatMap(workout => {
        const scheduledDateTime = new Date(`${workout.scheduledDate}T${workout.scheduledTime}`);
        const notifications = [];
  
        // Check for one hour notice
        if (scheduledDateTime <= oneHourFromNow && scheduledDateTime > currentTime) {
          const minutesUntilWorkout = Math.round((scheduledDateTime.getTime() - currentTime.getTime()) / 60000);
          notifications.push(`Scheduled workout: ${workout.name} in ${minutesUntilWorkout} minutes`);
        }
  
        // Check for half an hour notice
        if (scheduledDateTime <= halfAnHourFromNow && scheduledDateTime > currentTime) {
          const minutesUntilWorkout = Math.round((scheduledDateTime.getTime() - currentTime.getTime()) / 60000);
          notifications.push(`Reminder: ${workout.name} in ${minutesUntilWorkout} minutes`);
        }
  
        return notifications; // Return the notifications for this workout
      });
  
    this.cdr.detectChanges(); // Update view
  }
}
