import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkoutService } from '../../../services/workout.service'; // Ensure you import your workout service
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exercise-add',
  standalone: true,
  imports: [ CommonModule, FormsModule ],
  templateUrl: './exercise-add.component.html',
  styleUrls: ['./exercise-add.component.scss']
})
export class ExerciseAddComponent {
  @Input() selectedExercise: any; 
  @Input() showWorkoutSelectionModal: boolean = false;
  @Input() newWorkoutName: string = '';
  @Input() workouts: any[] = [];
  @Input() userId: string | null = null;

  @Output() close = new EventEmitter<void>();

  constructor(private workoutService: WorkoutService) {}

  ngOnInit() {
    if (this.userId) {
      this.fetchUserWorkouts();
    }
  }

  private async fetchUserWorkouts() {
    try {
      this.workouts = await this.workoutService.getUserWorkouts(this.userId!);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }
  }

  sanitizeExerciseData<T extends object>(data: T): Partial<T> {
    return (Object.keys(data) as Array<keyof T>).reduce((acc: Partial<T>, key: keyof T) => {
      if (data[key] !== undefined) {
        acc[key] = data[key];
      }
      return acc;
    }, {} as Partial<T>);
  }
  
  async addExerciseToWorkout(workout: any) {
    if (!workout) {
      console.error('No workout provided');
      return;
    }
    const sanitizedExercise = this.sanitizeExerciseData(this.selectedExercise);
    const exerciseToAdd: any = { 
      ...sanitizedExercise, 
      sets: 0, 
      reps: 0 
    };
    if (this.selectedExercise.videoUrl) {
      exerciseToAdd.videoUrl = this.selectedExercise.videoUrl;
    }
    workout.exercises.push(exerciseToAdd);
    try {
      await this.workoutService.updateWorkout(this.userId!, workout.id, {
        name: workout.name, // Include the name here
        exercises: workout.exercises 
      });
  
      this.close.emit();
    } catch (error) {
      console.error('Error adding exercise to workout:', error);
    }
  }  

  async createAndAddWorkout() {
    const sanitizedExercise = this.sanitizeExerciseData(this.selectedExercise);
    const exerciseToAdd: any = { ...sanitizedExercise, sets: 0, reps: 0 };
    if (this.selectedExercise.videoUrl) {
      exerciseToAdd.videoUrl = this.selectedExercise.videoUrl;
    }
    const newWorkout = {
      name: this.newWorkoutName,
      exercises: [exerciseToAdd],
    };
    try {
      await this.workoutService.addWorkout(this.userId!, newWorkout);
      this.newWorkoutName = '';
      this.close.emit();
    } catch (error) {
      console.error('Error creating new workout:', error);
    }
  }

  closeWorkoutSelectionModal() {
    this.close.emit();
  }
}
