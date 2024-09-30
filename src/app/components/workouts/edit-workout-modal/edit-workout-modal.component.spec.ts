import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditWorkoutModalComponent } from './edit-workout-modal.component';

describe('EditWorkoutModalComponent', () => {
  let component: EditWorkoutModalComponent;
  let fixture: ComponentFixture<EditWorkoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditWorkoutModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditWorkoutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
