import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  
  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  }

  calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  getDaysAgo(targetDate: Date): string {
    const today = new Date();
    const timeDiff = today.getTime() - targetDate.getTime(); // Difference between today and the target date
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
  
    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''} ago`;
    } else {
      return 'Invalid date';
    }
  }
  
  getInDays(dateString: string): string {
    const today = new Date();
    const date = new Date(dateString); // Convert string to Date object
    const timeDiff = date.getTime() - today.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  
    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff > 0) {
      return `${daysDiff} day${daysDiff > 1 ? 's' : ''} from now`;
    } else {
      return 'Invalid date';
    }
  }
}