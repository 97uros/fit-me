import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ChartComponent,
  NgApexchartsModule,
  ApexOptions,
} from 'ng-apexcharts';
import { WorkoutService } from '../../../services/workout.service';

@Component({
  selector: 'app-charts',
  standalone: true,
  imports: [NgApexchartsModule],
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.scss']
})
export class ChartsComponent {

  @Input() userId: string | null = null;
  @Output() chartReady = new EventEmitter<void>();

  public mixedChartOptions: Partial<ApexOptions> = {};


  constructor(private workoutService: WorkoutService) {}

  async ngOnInit(): Promise<void> {
    await this.loadMixedChartData();
    this.chartReady.emit();
  }

  async loadMixedChartData(): Promise<void> {
    const currentWeek = this.getCurrentWeekDates();
    const finishedWorkouts = await this.workoutService.getFinishedWorkouts(this.userId!);
  
    const workoutData = currentWeek.map(date => {
      const workout = finishedWorkouts.find(w => w.completedAt.toDate().toDateString() === date.toDateString());
      return workout ? { timeSpent: Math.round(workout.timeSpent / 60), name: workout.name } : { timeSpent: 0, name: 'No Workout' };
    });
  
    const calorieData = currentWeek.map(date => {
      const workout = finishedWorkouts.find(w => w.completedAt.toDate().toDateString() === date.toDateString());
      return workout ? Math.round(workout.totalCalories) : 0;
    });
  
    this.mixedChartOptions = {
      chart: {
        height: 350,
        type: 'line',
        zoom: { enabled: false }
      },
      series: [
        {
          name: 'Time Spent (minutes)',
          type: 'area',
          data: workoutData.map(w => w.timeSpent),
        },
        {
          name: 'Calories Burned (kcal)',
          type: 'line',
          data: calorieData,
        },
      ],
      fill: {
        colors: ['#16a34a', '#ef4444']
      },
      xaxis: {
        categories: currentWeek.map(date => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })), // Format: DD.MM.YY
        labels: { style: { colors: 'white' } },
      },
      yaxis: [
        {
          title: {
            text: 'Time Spent (minutes)',
            style: { color: 'white' },
          },
          labels: { style: { colors: 'white' } },
        },
        {
          opposite: true,
          title: {
            text: 'Calories (kcal)',
            style: { color: 'white' },
          },
          labels: { style: { colors: 'white' } },
        },
      ],
      tooltip: {
        marker: {
          fillColors: ['#16a34a', '#ef4444'],
        },
        shared: true,
        x: {
          formatter: (val, { dataPointIndex }) => {
            const workout = workoutData[dataPointIndex];
            const dayName = currentWeek[dataPointIndex].toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon"
            return `${dayName}, ${val} - ${workout.name}`;
          }
        },
        y: {
          formatter: (value, { seriesIndex }) => {
            return seriesIndex === 0 ? `${Math.round(value)} minutes` : `${Math.round(value)} kcal`;
          },
        },
      },
      title: {
        text: 'Workout Activity This Week',
        align: 'center',
        style: { color: 'white' },
      },
      stroke: {
        curve: 'smooth',
        colors: ['#16a34a', '#ef4444'],
      },
      markers: {
        size: 4,
        colors: ['#16a34a', '#ef4444'],
        strokeColors: ['white'],
        hover: {
          size: 6,
        },
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: {
          colors: 'white',
        },
        markers: {
          fillColors: ['#16a34a', '#ef4444'],
        },
      },
    }
  }
  

  getCurrentWeekDates(): Date[] {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(startOfWeek));
      startOfWeek.setDate(startOfWeek.getDate() + 1);
    }
    return week;
  }
}
