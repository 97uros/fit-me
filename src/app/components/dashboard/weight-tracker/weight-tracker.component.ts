import { Component, Input, OnInit } from '@angular/core';
import { UserService } from '../../../services/user.service';
import { GFitService } from '../../../services/gfit.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-weight-tracker',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './weight-tracker.component.html',
  styleUrl: './weight-tracker.component.scss'
})
export class WeightTrackerComponent implements OnInit {
  @Input() isMetric: boolean = true;
  profileData: any = { weight: null };
  userWeight: any;
  weightGoal: number | null = null;

  constructor(
    private userService: UserService, 
    private gfitService: GFitService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.fetchWeightAndHeight();
    this.loadWeightGoal();
    this.userService.loadUnitPreference().then(() => {
      this.isMetric = this.userService.isMetric;
    });
  }

  fetchWeightAndHeight() {
    this.userService.getUserWeight().then(weight => {
      this.profileData.weight = weight;
    }).catch(error => {
      console.error('Error fetching weight:', error);
      this.toastr.error('Could not fetch weight.');
    });
  }

  loadWeightGoal() {
    this.userService.getUserGoals().then((goals: { weightGoal: number | null; }) => {
      this.weightGoal = goals?.weightGoal || null;
    }).catch(error => {
      console.error('Error fetching weight goal:', error);
      this.toastr.error('Could not fetch weight goal.');
    });
  }  

  get displayWeight(): string {
    if (!this.profileData.weight) return 'N/A';
    return this.isMetric
      ? `${this.profileData.weight} kg`
      : `${Math.round(this.profileData.weight * 2.20462)} lbs`;
  }

  get displayWeightGoal(): string {
    if (!this.weightGoal) return 'N/A';
    return this.isMetric
      ? `${this.weightGoal} kg`
      : `${Math.round(this.weightGoal * 2.20462)} lbs`;
  }
}
