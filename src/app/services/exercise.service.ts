// exercise.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Exercise {
  name: string; 
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  category: string;
  videoUrl?: string; // Optional property for the video URL
}

@Injectable({
  providedIn: 'root',
})
export class ExerciseService {
  private apiUrl = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';  // API URL

  // Example video data mapping
  private videoData: { [key: string]: string } = {
    'Ab Crunch Machine': 'https://app.fitnessai.com/exercises/18571201-Lever-Total-Abdominal-Crunch-Waist.mp4',
    'Air Bike': 'https://app.fitnessai.com/exercises/00031201-air-bike-m-waist.mp4',
    'Barbell Curl': 'https://app.fitnessai.com/exercises/00311201-Barbell-Curl-Upper-Arms.mp4',
    'Bent Over Barbell Row': 'https://app.fitnessai.com/exercises/00271201-Barbell-Bent-Over-Row-Back.mp4',
    'Barbell Shoulder Press':'https://app.fitnessai.com/exercises/11651201-Barbell-Standing-Military-Press-without-rack-Shoulders.mp4',
    'Standing Military Press': 'https://app.fitnessai.com/exercises/11651201-Barbell-Standing-Military-Press-without-rack-Shoulders.mp4',
    'Reverse Barbell Curl': 'https://app.fitnessai.com/exercises/00801201-Barbell-Reverse-Curl-Forearm.mp4',
    'Cable Seated Crunch': 'https://app.fitnessai.com/exercises/02121201-Cable-Seated-Crunch-Waist.mp4',
    'Plank': 'https://app.fitnessai.com/exercises/04631201-Front-Plank-m-waist.mp4',
    'Pushups': 'https://app.fitnessai.com/exercises/06621201-Push-up-m-Chest.mp4',
    'Sit-Up': 'https://app.fitnessai.com/exercises/24761201-3-4-Sit-up-female-Waist.mp4'

  };

  constructor(private http: HttpClient) {}

  getExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(this.apiUrl).pipe(
      map(exercises => this.addVideosToExercises(exercises))
    );
  }

  private addVideosToExercises(exercises: Exercise[]): Exercise[] {
    return exercises.map(exercise => {
      exercise.videoUrl = this.videoData[exercise.name] || undefined; // Use undefined if not found
      return exercise;
    });
  }
}
