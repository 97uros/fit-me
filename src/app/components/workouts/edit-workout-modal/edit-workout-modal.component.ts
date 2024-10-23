import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WorkoutService } from '../../../services/workout.service';
import { Auth } from '@angular/fire/auth';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-workout-modal',
  standalone: true,
  imports: [ CommonModule, FormsModule ],
  templateUrl: './edit-workout-modal.component.html',
  styleUrl: './edit-workout-modal.component.scss'
})
export class EditWorkoutModalComponent {

  @Input() workouts: any[] = [];
  @Input() editingWorkout: any = null;
  @Output() onSave = new EventEmitter(); 

  constructor ( 
    private workoutService: WorkoutService,
    private auth: Auth,
    private toastr: ToastrService
  ) {}

  moveExerciseUp(index: number): void {
    if (index === 0) return;
    const exercises = this.editingWorkout.exercises;
    [exercises[index - 1], exercises[index]] = [exercises[index], exercises[index - 1]];
  }

  moveExerciseDown(index: number): void {
    if (index === this.editingWorkout.exercises.length - 1) return;
    const exercises = this.editingWorkout.exercises;
    [exercises[index + 1], exercises[index]] = [exercises[index], exercises[index + 1]];
  }

  removeExercise(index: number): void {
    this.editingWorkout.exercises.splice(index, 1);
    this.toastr.success('Exercise removed successfully!'); // Use Toastr notification
  }

  cancelEdit(): void {
    this.editingWorkout = null;
  }

  async saveWorkout(): Promise<void> {
    if (this.editingWorkout) {
      const user = this.auth.currentUser;
      if (user) {
        await this.workoutService.updateWorkout(user.uid, this.editingWorkout.id, this.editingWorkout);
        const index = this.workouts.findIndex(workout => workout.id === this.editingWorkout.id);
        if (index !== -1) {
          this.workouts[index] = { ...this.editingWorkout };
          this.toastr.success('Workout saved successfully!');
        }
        this.cancelEdit();
        this.onSave.emit();
      }
    }
  }
}
