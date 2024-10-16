import { Component, OnInit, ElementRef, Renderer2 } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { ToastrService } from 'ngx-toastr';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkoutService } from '../../services/workout.service';

@Component({
  selector: 'app-body-stats',
  standalone: true,
  imports: [ CommonModule ],
  providers: [ DatePipe ],
  templateUrl: './body-stats.component.html',
  styleUrls: ['./body-stats.component.scss']
})
export class BodyStatsComponent implements OnInit {
  userId: string | null = null;
  userGender: string | null = null;
  profileData: any = {
    firstName: '',
    dob: '',
    height: null,
    weight: null,
    gender: null,
    profilePicture: null 
  };
  musclesWorked: { [key: string]: { lastWorked: Date, count: number } } = {}; // Assuming this is populated with the muscles worked data

  constructor( 
    private auth: Auth, 
    private firestore: Firestore, 
    private router: Router, 
    private userService: UserService,
    private workoutService: WorkoutService,
    private toastr: ToastrService,
    private renderer: Renderer2,
    private elRef: ElementRef,
    public datePipe: DatePipe
  ) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    if (this.userId) {
      this.fetchProfileData();
      this.fetchMusclesWorkedLast7Days();
    } else {
      this.router.navigate(['/login']);
    }
  }

  fetchProfileData() {
    const profileDocRef = doc(this.firestore, `users/${this.userId}`);
    getDoc(profileDocRef).then(docSnap => {
      if (docSnap.exists()) {
        this.profileData = docSnap.data();
        this.userGender = this.profileData.gender !== undefined ? this.profileData.gender : null;
      } else {
        this.toastr.error('No profile data found. You can create a new profile.');
      }
    }).catch(err => {
      console.error('Error fetching profile data', err);
    });
  }

  async fetchMusclesWorkedLast7Days() {
    if (this.userId) {
      this.musclesWorked = await this.workoutService.getMusclesWorkedLast7Days(this.userId);
    }
    this.highlightMuscles();
  }

  isMuscleWorked(muscleKey: string): boolean {
    return muscleKey in this.musclesWorked;
  }

  isMuscleHealed(muscleKey: string): boolean {
    const muscle = this.musclesWorked[muscleKey];
    if (!muscle) return false;
  
    const daysSinceLastWorked = (new Date().getTime() - new Date(muscle.lastWorked).getTime()) / (1000 * 3600 * 24);
    return daysSinceLastWorked >= 3; // Assuming 3 days for muscle healing
  }

  isMuscleHealing(muscleKey: string): boolean {
    const muscle = this.musclesWorked[muscleKey];
    if (!muscle) return false;

    const daysSinceLastWorked = (new Date().getTime() - new Date(muscle.lastWorked).getTime()) / (1000 * 3600 * 24);
    return daysSinceLastWorked >= 1.5 && daysSinceLastWorked < 3; // Between 1.5 and 3 days for muscle healing
  }

  highlightMuscles(): void {
    const svgElement = document.querySelector('svg');
    if (svgElement) {
      const muscleGroups = Object.keys(this.musclesWorked);
      muscleGroups.forEach(muscle => {
        const muscleGroup = svgElement.querySelector(`#${muscle}`);
        if (muscleGroup) {
          if (this.isMuscleHealed(muscle)) {
            muscleGroup.classList.add('healed');
          } else if (this.isMuscleHealing(muscle)) {
            muscleGroup.classList.add('healing'); // Add "healing" class for muscles trained 1.5 days ago
          } else {
            muscleGroup.classList.add('highlighted');
          }
        }
      });
    }
  }

  getMuscleState(muscleKey: string): string {
    if (this.isMuscleHealed(muscleKey)) {
      return 'Healed';
    } else if (this.isMuscleHealing(muscleKey)) {
      return 'Healing';
    } else if (this.isMuscleWorked(muscleKey)) {
      return 'Worked Recently';
    }
    return 'Not Worked Recently';
  }
}
