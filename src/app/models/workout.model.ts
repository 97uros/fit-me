interface Exercise {
  name: string;
  sets: number;
  reps: number;
  done: boolean; 
}

interface Workout {
  id: number;
  name: string;
  exercises: Exercise[];
}