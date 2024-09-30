import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartWorkoutModalComponent } from './start-workout-modal.component';

describe('StartWorkoutModalComponent', () => {
  let component: StartWorkoutModalComponent;
  let fixture: ComponentFixture<StartWorkoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartWorkoutModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartWorkoutModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
