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
    
  }
}
