import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-exercise-details',
  standalone: true,
  imports: [ CommonModule ],
  templateUrl: './exercise-details.component.html',
  styleUrls: ['./exercise-details.component.scss']
})
export class ExerciseDetailsComponent implements OnDestroy, OnChanges {
  @Input() selectedExercise: any;
  @Input() showModal: boolean = false;
  @Output() close = new EventEmitter<void>();
  modalImageIndex: number = 0;
  modalImageInterval: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['showModal'] && changes['showModal'].currentValue) {
      this.startModalImageSwitch();
    } else {
      this.stopModalImageSwitch();
    }
  }

  startModalImageSwitch(): void {
    this.modalImageInterval = setInterval(() => {
      this.modalImageIndex = this.modalImageIndex === 0 ? 1 : 0;
    }, 3000);
  }

  stopModalImageSwitch(): void {
    if (this.modalImageInterval) {
      clearInterval(this.modalImageInterval);
    }
  }

  ngOnDestroy(): void {
    this.stopModalImageSwitch();
  }

  closeModal(): void {
    this.close.emit(); // Emit the close event
    this.selectedExercise = null; // Reset selectedExercise
  }
}
