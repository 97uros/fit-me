import { Component, OnInit, ElementRef, Renderer2, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { ToastrService } from 'ngx-toastr';
import { CommonModule, DatePipe } from '@angular/common';
import { WorkoutService } from '../../../services/workout.service';

@Component({
  selector: 'app-body-stats',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './body-stats.component.html',
  styleUrls: ['./body-stats.component.scss']
})
export class BodyStatsComponent implements OnInit, AfterViewChecked {
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
  musclesWorked: { [key: string]: { lastWorked: Date, count: number } } = {};
  isSVGReady: boolean = false;
  musclesHighlighted: boolean = false;

  // Tooltip properties
  tooltipVisible: boolean = false;
  tooltipContent: string = '';
  tooltipPosition = { left: 0, top: 0 };
  tooltipTimeout: any = null;  // Used to delay hiding the tooltip

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
      await this.fetchProfileData();
      await this.fetchMusclesWorkedLast7Days();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngAfterViewChecked(): void {
    if (!this.musclesHighlighted && this.isSVGLoaded()) {
      this.highlightMuscles();
    }
  }

  async fetchProfileData() {
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
      this.highlightMuscles();
    }
  }

  isSVGLoaded(): boolean {
    const svgElement = this.elRef.nativeElement.querySelector('svg');
    return !!svgElement;
  }

  highlightMuscles(): void {
    const svgElement = this.elRef.nativeElement.querySelector('svg');
    if (svgElement && this.musclesWorked) {
      const muscleGroups = Object.keys(this.musclesWorked);
      muscleGroups.forEach(muscle => {
        const muscleGroup = svgElement.querySelector(`#${muscle}`);
        if (muscleGroup) {
          this.renderer.removeClass(muscleGroup, 'healed');
          this.renderer.removeClass(muscleGroup, 'healing');
          this.renderer.removeClass(muscleGroup, 'highlighted');

          if (this.isMuscleHealed(muscle)) {
            this.renderer.addClass(muscleGroup, 'healed');
          } else if (this.isMuscleHealing(muscle)) {
            this.renderer.addClass(muscleGroup, 'healing');
          } else {
            this.renderer.addClass(muscleGroup, 'highlighted');
          }
        }
      });
      this.musclesHighlighted = true;
    }
  }

  isMuscleWorked(muscleKey: string): boolean {
    return muscleKey in this.musclesWorked;
  }

  isMuscleHealed(muscleKey: string): boolean {
    const muscle = this.musclesWorked[muscleKey];
    if (!muscle) return false;

    const daysSinceLastWorked = (new Date().getTime() - new Date(muscle.lastWorked).getTime()) / (1000 * 3600 * 24);
    return daysSinceLastWorked >= 3;
  }

  isMuscleHealing(muscleKey: string): boolean {
    const muscle = this.musclesWorked[muscleKey];
    if (!muscle) return false;

    const daysSinceLastWorked = (new Date().getTime() - new Date(muscle.lastWorked).getTime()) / (1000 * 3600 * 24);
    return daysSinceLastWorked >= 1.5 && daysSinceLastWorked < 3;
  }

  getMuscleState(muscleKey: string): string {
    if (this.isMuscleHealed(muscleKey)) {
      return 'Healed Recently';
    } else if (this.isMuscleHealing(muscleKey)) {
      return 'Healing';
    } else if (this.isMuscleWorked(muscleKey)) {
      return 'Worked Recently';
    }
    return 'Not Worked Recently';
  }
  // Tooltip

  showTooltip(event: MouseEvent, muscle: string) {
    const tooltip = this.elRef.nativeElement.querySelector('.tooltip');
  
    // Fetch muscle-specific details
    const muscleState = this.getMuscleState(muscle);
    const lastWorkedDate = this.musclesWorked[muscle]?.lastWorked;
    const daysToHeal = this.calculateDaysToHeal(muscle);
    const muscleUrl = this.router.createUrlTree(['/exercises'], { queryParams: { muscle: muscle } }).toString();

    const tooltipContent = `
      <strong>Muscle: ${muscle.charAt(0).toUpperCase() + muscle.slice(1)}</strong><br>
      State: ${muscleState}<br>
      Last Worked: ${lastWorkedDate ? this.datePipe.transform(lastWorkedDate, 'MMM d, y') : 'N/A'}<br>
      Days to Heal: ${daysToHeal ? `${daysToHeal.toFixed(0)} day(s)` : 'Healed'}<br>
      <a href="${muscleUrl}" class="text-green-600" target="_blank">View Exercises</a>
    `;
  
    // Update tooltip content
    tooltip.innerHTML = tooltipContent;
  
    // Show and position the tooltip
    tooltip.style.display = 'block';
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY + 10 + 'px';
  
    // Clear any previous hide timeout
    clearTimeout(this.tooltipTimeout);
  
    // Allow the tooltip to stay visible when hovering over it
    tooltip.addEventListener('mouseenter', () => clearTimeout(this.tooltipTimeout));
    tooltip.addEventListener('mouseleave', () => this.hideTooltip());
  }
  
  hideTooltip() {
    // Delay hiding the tooltip to check if it's no longer hovered
    this.tooltipTimeout = setTimeout(() => {
      const tooltip = this.elRef.nativeElement.querySelector('.tooltip');
      tooltip.style.display = 'none';
    }, 500);  // Increased delay to ensure smooth hover transition
  }
  
  
  // Helper function to calculate days to heal
  calculateDaysToHeal(muscle: string): number | null {
    const muscleData = this.musclesWorked[muscle];
    if (!muscleData) return null;
  
    const daysSinceLastWorked = (new Date().getTime() - new Date(muscleData.lastWorked).getTime()) / (1000 * 3600 * 24);
  
    if (daysSinceLastWorked < 3) {
      return Math.max(3 - daysSinceLastWorked, 0); // Healing takes 3 days
    } else {
      return null; // Already healed
    }
  }  
  
}
