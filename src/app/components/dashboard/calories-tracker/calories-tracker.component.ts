import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-calories-tracker',
  standalone: true,
  imports: [],
  templateUrl: './calories-tracker.component.html',
  styleUrl: './calories-tracker.component.scss'
})
export class CaloriesTrackerComponent implements OnInit {
  @Input() caloriesGoal: number | null = null;
  @Input() caloriesBurnedToday: number | null = null;
  @Input() caloriesProgress: number = 0;

  ngOnInit() {
    this.calculateProgress(); // Calculate progress initially
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['caloriesGoal'] || changes['caloriesBurnedToday']) {
      this.calculateProgress();
    }
  }

  calculateProgress() {
    if (this.caloriesGoal && this.caloriesBurnedToday) {
      this.caloriesProgress = Math.min((this.caloriesBurnedToday / this.caloriesGoal) * 100, 100);
    } else {
      this.caloriesProgress = 0; // Reset to 0 if no goal is set
    }
  }
}
