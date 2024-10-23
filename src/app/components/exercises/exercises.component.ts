import { Component, OnInit, HostListener } from '@angular/core';
import { ExerciseService } from '../../services/exercise.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { WorkoutService } from '../../services/workout.service';
import { MET_VALUES } from '../../utils/met-values';
import { Auth } from '@angular/fire/auth';
import { ExerciseDetailsComponent } from './exercise-details/exercise-details.component';
import { ExerciseAddComponent } from './exercise-add/exercise-add.component';
import { ExerciseFilterComponent } from './exercise-filter/exercise-filter.component';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [ RouterLink, CommonModule, FormsModule, NgxPaginationModule, ExerciseDetailsComponent, ExerciseAddComponent, ExerciseFilterComponent ],
  providers: [ExerciseService],
  templateUrl: './exercises.component.html',
  styleUrl: './exercises.component.scss'
})
export class ExercisesComponent implements OnInit {
  exercises: any[] = [];
  filteredExercises: any[] = [];
  displayedExercises: any[] = [];
  muscles: string[] = []; 
  equipments: string[] = []; 
  categories: string[]= [];
  currentImageIndex: { [key: string]: number } = {};
  intervalId: any;
  loading = true;
  loadingMore = false; // For tracking additional data loading
  limit = 12; // Initial number of exercises to load
  loadIncrement = 6;
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

  constructor(
    private exerciseService: ExerciseService, 
    private workoutService: WorkoutService,  
    private auth: Auth,
    private route: ActivatedRoute
  ) {}

  async ngOnInit(): Promise<void> {
    this.userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
    this.exerciseService.getExercises().subscribe({
      next: (data) => {
        this.exercises = data;
        this.filteredExercises = this.exercises;
        this.muscles = [...new Set(this.exercises.flatMap(ex => ex.primaryMuscles))];
        this.equipments = [...new Set(this.exercises.map(ex => ex.equipment))];
        this.categories = [...new Set(this.exercises.map(ex => ex.category))];
        this.loadMoreExercises();
        this.exercises.forEach((exercise) => {
          this.currentImageIndex[exercise.name] = 0;
        });
        this.loading = false;
         // Read the muscle parameter from the URL
        this.route.queryParams.subscribe(params => {
          const muscleFromUrl = params['muscle'];
          if (muscleFromUrl) {
            this.selectedMuscle = muscleFromUrl; // Set the selected muscle
            this.filterExercises(); // Apply filter
          }
        });
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

  viewExercise(exercise: any): void {
    this.selectedExercise = exercise; 
    this.showModal = true; 
  }

  closeDetailsModal(): void {
    this.showModal = false;
    this.selectedExercise = null; 
  }

  openWorkoutSelection(exercise: any) {
    this.selectedExercise = exercise;
    this.showWorkoutSelectionModal = true;

    if (this.userId) {
      this.workoutService.getUserWorkouts(this.userId)
        .then(workouts => {
          this.workouts = workouts;
        })
        .catch(error => {
          console.error('Error fetching workouts:', error);
        });
    }
  }

  closeWorkoutSelectionModal() {
    this.showWorkoutSelectionModal = false;
  }
  
  filterExercises(): void {
    const filtered = this.exercises.filter(exercise => {
      const matchesMuscle = this.selectedMuscle ? 
        (exercise.primaryMuscles.includes(this.selectedMuscle) || exercise.secondaryMuscles.includes(this.selectedMuscle)) : true;

      const matchesEquipment = this.selectedEquipment ? 
        exercise.equipment === this.selectedEquipment : true;

      const matchesCategory = this.selectedCategories.length > 0 ?
        this.selectedCategories.includes(exercise.category) : true;    

      const matchesSearch = this.searchQuery ? 
        exercise.name.toLowerCase().includes(this.searchQuery.toLowerCase()) : true;

      return matchesMuscle && matchesEquipment && matchesCategory && matchesSearch;
    });

    this.updateFilteredExercises(filtered); // Call the update method
  }

  updateFilteredExercises(filtered: any[]): void {
    this.filteredExercises = filtered;
    this.displayedExercises = []; // Reset displayed exercises
    this.loadMoreExercises(); // Load initial set of exercises based on filtered results
  }

  // Load more 

  loadMoreExercises(): void {
    const newExercises = this.filteredExercises.slice(this.displayedExercises.length, this.displayedExercises.length + this.limit);
    this.displayedExercises = [...this.displayedExercises, ...newExercises];
    this.loadingMore = false;
  }

  // Listen for scroll event on the exercise list container
  onScroll(event: any): void {
    const container = event.target;

    // Check if user has scrolled near the bottom of the exercise list container
    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 50 && !this.loadingMore && this.displayedExercises.length < this.filteredExercises.length) {
      this.loadingMore = true;
      setTimeout(() => {
        this.loadMoreExercises();
      }, 1000); // Simulate delay for data fetching
    }
  }
}
