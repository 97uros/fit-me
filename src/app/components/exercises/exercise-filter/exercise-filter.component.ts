import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exercise-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exercise-filter.component.html',
  styleUrls: ['./exercise-filter.component.scss']
})
export class ExerciseFilterComponent {
  @Input() muscles: string[] = [];
  @Input() equipments: string[] = [];
  @Input() categories: string[] = [];
  @Input() exercises: any[] = [];
  @Output() filteredExercises = new EventEmitter<any[]>();

  selectedMuscle = '';
  selectedEquipment = '';
  selectedCategories: string[] = [];
  searchQuery = '';

  onFilterChange(): void {
    this.filterExercises();
  }

  toggleCategory(category: string): void {
    if (this.isCategorySelected(category)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== category);
    } else {
      this.selectedCategories.push(category);
    }
    this.filterExercises();
  }

  isCategorySelected(category: string): boolean {
    return this.selectedCategories.includes(category);
  }

  clearCategoryFilter(): void {
    this.selectedCategories = [];
    this.filterExercises();
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
  
    this.filteredExercises.emit(filtered);
  }
  
}
