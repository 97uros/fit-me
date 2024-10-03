import { Component, OnInit } from '@angular/core';
import { ExerciseService } from '../../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { Router, RouterLink } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { MET_VALUES } from '../../utils/met-values';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NgxPaginationModule],
  providers: [ExerciseService],
  templateUrl: './exercises.component.html',
  styleUrl: './exercises.component.scss'
})
export class ExercisesComponent implements OnInit {
  exercises: any[] = [];
  filteredExercises: any[] = [];
  muscles: string[] = []; 
  equipments: string[] = []; 
  categories: string[]= [];
  currentImageIndex: { [key: string]: number } = {};
  intervalId: any;
  loading = true;

  // Filters
  selectedMuscle = '';
  selectedEquipment = '';
  selectedCategories: string[] = [];
  searchQuery = '';

  // Pagination
  page: number = 1;

  // Exercise Modal
  showModal: boolean = false;
  selectedExercise: any = null;
  modalImageIndex: number = 0;
  modalImageInterval: any;

  // Workouts

  workouts: any[] = [];
  showWorkoutSelectionModal = false;
  newWorkoutName = '';
  userId: string | null = null; 

  constructor(private exerciseService: ExerciseService, private workoutService: WorkoutService,  private auth: Auth) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null; // Get the user ID

    this.exerciseService.getExercises().subscribe({
      next: (data) => {
        this.exercises = data;
        this.filteredExercises = this.exercises;

        this.muscles = [...new Set(this.exercises.flatMap(ex => ex.primaryMuscles))];
        this.equipments = [...new Set(this.exercises.map(ex => ex.equipment))];
        this.categories = [...new Set(this.exercises.map(ex => ex.category))];

        this.exercises.forEach((exercise) => {
          this.currentImageIndex[exercise.name] = 0;
        });

        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching exercises:', err);
      }
    });
  }

  startImageSwitch(exercise: any): void {
    this.intervalId = setInterval(() => {
      this.currentImageIndex[exercise.name] = this.currentImageIndex[exercise.name] === 0 ? 1 : 0;
    }, 1000);
  }

  stopImageSwitch(exercise: any): void {
    clearInterval(this.intervalId);
  }

  currentImage(exercise: any): string {
    return exercise.images[this.currentImageIndex[exercise.name]];
  }

  // Image switching function for modal
  startModalImageSwitch(): void {
    this.modalImageInterval = setInterval(() => {
      this.modalImageIndex = this.modalImageIndex === 0 ? 1 : 0; // Switch between two images
    }, 3000); // Switch every 3 seconds
  }

  stopModalImageSwitch(): void {
    if (this.modalImageInterval) {
      clearInterval(this.modalImageInterval);
    }
  }

  viewExercise(exercise: any): void {
    this.selectedExercise = exercise;
    this.showModal = true;
    this.modalImageIndex = 0; // Start from the first image
    this.startModalImageSwitch();
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedExercise = null;
  }

  // Filters exercises by selected criteria
  filterExercises(): void {
    this.filteredExercises = this.exercises.filter(exercise => {
      const matchesMuscle = this.selectedMuscle ? exercise.primaryMuscles && exercise.secondaryMuscles.includes(this.selectedMuscle) : true;
      const matchesEquipment = this.selectedEquipment ? exercise.equipment === this.selectedEquipment : true;
      
      // Check if exercise category matches any of the selected categories
      const matchesCategory = this.selectedCategories.length > 0
        ? this.selectedCategories.includes(exercise.category)
        : true;
        
      const matchesSearch = this.searchQuery ? exercise.name.toLowerCase().includes(this.searchQuery.toLowerCase()) : true;

      return matchesMuscle && matchesEquipment && matchesCategory && matchesSearch;
    });
  } 

  // Toggle a category (add or remove from selectedCategories)
  toggleCategory(category: string): void {
    if (this.isCategorySelected(category)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== category); // Remove category
    } else {
      this.selectedCategories.push(category); // Add category
    }
    this.filterExercises();
  }

  // Check if a category is currently selected
  isCategorySelected(category: string): boolean {
    return this.selectedCategories.includes(category);
  }

  // Clear all selected categories
  clearCategoryFilter(): void {
    this.selectedCategories = [];
    this.filterExercises();
  }

  // Add to workout 

  openWorkoutSelection(exercise: any) {
    this.selectedExercise = exercise;
    this.showWorkoutSelectionModal = true;

    // Fetch workouts from Firestore
    if (this.userId) {
      this.workoutService.getUserWorkouts(this.userId).then(workouts => this.workouts = workouts);
    }
  }

  sanitizeExerciseData<T extends object>(data: T): Partial<T> {
    return (Object.keys(data) as Array<keyof T>).reduce((acc: Partial<T>, key: keyof T) => {
      if (data[key] !== undefined) {
        acc[key] = data[key]; // This will now work as acc and data are properly typed
      }
      return acc;
    }, {} as Partial<T>);
  }
  
  async addExerciseToWorkout(workout: any) {
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
    
    // Save the workout instance
    await this.workoutService.scheduleWorkout(this.userId!, workout.id, new Date()); // Schedule workout with current date
    this.closeWorkoutSelectionModal();
  }
  
  async createAndAddWorkout() {
    const sanitizedExercise = this.sanitizeExerciseData(this.selectedExercise);
    const exerciseToAdd: any = {
      ...sanitizedExercise,
      sets: 0,
      reps: 0
    };

    if (this.selectedExercise.videoUrl) {
      exerciseToAdd.videoUrl = this.selectedExercise.videoUrl;
    }

    const newWorkout = {
      name: this.newWorkoutName,
      exercises: [exerciseToAdd]
    };

    await this.workoutService.addWorkout(this.userId!, newWorkout); // Pass userId here
    this.newWorkoutName = '';
    this.closeWorkoutSelectionModal();
  }
  
  closeWorkoutSelectionModal() {
    this.showWorkoutSelectionModal = false;
  }
  
  saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }
}
