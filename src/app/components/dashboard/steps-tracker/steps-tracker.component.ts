import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { GFitService } from '../../../services/gfit.service';

@Component({
  selector: 'app-steps-tracker',
  standalone: true,
  imports: [],
  templateUrl: './steps-tracker.component.html',
  styleUrl: './steps-tracker.component.scss'
})
export class StepsTrackerComponent implements OnInit {
  @Input() isMetric: boolean = true;
  @Input () steps: number = 0;
  @Input() stepGoal: number | null = null;
  stepProgress: number = 0;

  constructor(private gfitService: GFitService) {}

  ngOnInit(): void {
    this.loadSteps();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['stepGoal'] || changes['steps']) {
      this.calculateProgress();
    }
  }

  loadSteps() {
    this.gfitService.getSteps().subscribe(steps => {
      this.steps = steps;
      this.calculateProgress();
    });
  }

  calculateProgress() {
    if (this.stepGoal && this.steps) {
      this.stepProgress = Math.min((this.steps / this.stepGoal) * 100, 100);
    } else {
      this.stepProgress = 0; // Reset to 0 if no goal is set
    }
  }
}