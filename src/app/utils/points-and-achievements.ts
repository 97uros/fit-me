import { setLogLevel } from "firebase/app";

export const pointsTreshold = {
  level_1: 0,
  level_2: 20000,
  level_3: 50000,
  level_4: 100000,
  level_5: 200000,
  level_6: 500000,
  level_7: 1000000,
  level_8: 2000000,
  level_9: 5000000,
  level_10: 10000000,
};

export const achievements = {
  level_1: { name:'Rookie', badgeUrl: 'https://firebasestorage.googleapis.com/v0/b/fit-me-a409a.appspot.com/o/achievements%2Frookie.png?alt=media&token=c0cda5e2-3c9c-4ed5-a21e-e6fa5d6a8585'},
  level_2: { name:'Adventurer', badgeUrl: 'https://firebasestorage.googleapis.com/v0/b/fit-me-a409a.appspot.com/o/achievements%2Fadventurer.png?alt=media&token=f6998f64-0db5-4a4f-af95-e97600bcdfc9'},
  level_3: { name:'Warrior', badgeUrl: 'https://firebasestorage.googleapis.com/v0/b/fit-me-a409a.appspot.com/o/achievements%2Fwarrior.png?alt=media&token=d63f8c29-6105-48c2-8792-d920e8c2256a'},
  level_4: { name:'Master', badgeUrl: ''},
  level_5: { name:'Hero', badgeUrl: ''},
  level_6: { name:'Legend', badgeUrl: ''},
  level_7: { name:'Champion', badgeUrl: ''},
  level_8: { name:'Titan', badgeUrl: ''},
  level_9: { name:'Ascendant', badgeUrl: ''},
  level_10: { name:'Supreme', badgeUrl: ''},
};

// Function to calculate points based on workout details
export function calculatePoints(workout: any): number {
  const durationPoints = (workout.timeSpent || 0) * 0.0001; // 0.1 point per second
  const exercisePoints = (workout.exercises?.length || 0) * 0.5; // 10 points per exercise
  const setPoints = (workout.exercises || []).reduce((sum: number, exercise: any) => {
    return sum + ((exercise.sets || 0) * 0.2); // 3 points per set
  }, 0);
  const repPoints = (workout.exercises || []).reduce((sum: number, exercise: any) => {
    return sum + ((exercise.reps || 0) * 0.1); // 0.2 points per rep
  }, 0);
  const caloriePoints = (workout.totalCalories || 0) * 0.1; // 0.2 points per calorie burned

  return durationPoints + exercisePoints + setPoints + repPoints + caloriePoints;
}

// Function to determine achievement based on points
export function getAchievement(points: number): { name: string, badgeUrl: string } | null {
  if (points >= pointsTreshold.level_10) return achievements.level_10;
  if (points >= pointsTreshold.level_9) return achievements.level_9;
  if (points >= pointsTreshold.level_8) return achievements.level_8;
  if (points >= pointsTreshold.level_7) return achievements.level_7;
  if (points >= pointsTreshold.level_6) return achievements.level_6;
  if (points >= pointsTreshold.level_5) return achievements.level_5;
  if (points >= pointsTreshold.level_4) return achievements.level_4;
  if (points >= pointsTreshold.level_3) return achievements.level_3;
  if (points >= pointsTreshold.level_2) return achievements.level_2;
  if (points >= pointsTreshold.level_1) return achievements.level_1;
  return null;
}
