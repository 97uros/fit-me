import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, tap } from 'rxjs'; 
import { Auth } from '@angular/fire/auth';
import { Database, ref, get, set } from '@angular/fire/database';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GFitService {
  private fitApiUrl = environment.googleFitApiUrl; 
  private peopleApiUrl = 'https://people.googleapis.com/v1/people/me?personFields=names,photos,birthdays,genders';

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private db: Database
  ) {}

  private getAccessToken(): Promise<string | null> { 
    return new Promise(async (resolve, reject) => {
      const userId = this.auth.currentUser?.uid;
      if (userId) {
        const userTokenRef = ref(this.db, `users/${userId}/googleFitAccessToken`);
        const snapshot = await get(userTokenRef);
        if (snapshot.exists()) {
          resolve(snapshot.val() || null);
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  }

  private getGooglePeopleProfile(): Observable<any> {
    return from(this.getAccessToken()).pipe(
      switchMap(accessToken => {
        if (!accessToken) {
          throw new Error('Access token not available');
        }
        const headers = { Authorization: `Bearer ${accessToken}` };
        return this.http.get(this.peopleApiUrl, { headers });
      }),
      map((response: any) => {
        const profile = {
          name: response.names?.[0]?.displayName || null,
          gender: response.genders?.[0]?.value || null,
          profilePicture: response.photos?.[0]?.url || null,
          birthday: response.birthdays?.[0]?.date ? 
          `${response.birthdays[0].date.year}-${response.birthdays[0].date.month}-${response.birthdays[0].date.day}` 
          : null
        };
        return profile;
      })
    );
  }

  fetchGoogleFitData(path: string, body: any): Observable<any> {
    return from(this.getAccessToken()).pipe(
      switchMap(accessToken => {
        if (!accessToken) {
          throw new Error('Access token not available');
        }
        return this.http.post(this.fitApiUrl, { accessToken, path, body }).pipe(
          tap({
            error: (err) => console.error('API Error:', err)
          })
        );
      })
    );
  }

  // Fetch Google Fit profile data (like height and weight)
  getGoogleFitProfile(): Observable<any> {
    return this.getGooglePeopleProfile(); // Fetch profile from Google People API
  }

  getUserWeightFromGoogleFit(): Observable<number | null> {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.weight',
        dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: Date.now() - (30 * 24 * 60 * 60 * 1000),
      endTimeMillis: Date.now()
    };
  
    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        if (response.bucket && response.bucket.length > 0) {
          for (let i = response.bucket.length - 1; i >= 0; i--) {
            const dataset = response.bucket[i].dataset;
            if (dataset && dataset.length > 0 && dataset[0].point.length > 0) {
              const weightValue = dataset[0].point[0].value[0]?.fpVal || null;
              return weightValue;
            }
          }
        }
        console.warn('No weight data found.');
        return null;
      }),
      catchError(err => {
        console.error('Error fetching weight data:', err);
        return of(null);
      })
    );
  }

  getUserWeightForDate(date: Date): Observable<number | null> {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.weight',
        dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: date.getTime(),
      endTimeMillis: date.getTime() + 86400000
    };
  
    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        if (response.bucket && response.bucket.length > 0) {
          const dataset = response.bucket[0].dataset;
          if (dataset && dataset.length > 0 && dataset[0].point.length > 0) {
            return dataset[0].point[0].value[0]?.fpVal || null;
          }
        }
        console.warn('No weight data found for the specified date.');
        return null;
      }),
      catchError(err => {
        console.error('Error fetching weight data:', err);
        return of(null);
      })
    );
  }  
  
  getUserHeightFromGoogleFit(): Observable<number | null> {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.height',
        dataSourceId: 'derived:com.google.height:com.google.android.gms:merge_height'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: Date.now() - (30 * 24 * 60 * 60 * 1000),
      endTimeMillis: Date.now()
    };
  
    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        if (response.bucket && response.bucket.length > 0) {
          for (let i = response.bucket.length - 1; i >= 0; i--) {
            const dataset = response.bucket[i].dataset;
            if (dataset && dataset.length > 0 && dataset[0].point.length > 0) {
              const heightValue = dataset[0].point[0].value[0]?.fpVal || null;
              return heightValue;
            }
          }
        }
        console.warn('No height data found.');
        return null;
      }),
      catchError(err => {
        console.error('Error fetching height data:', err);
        return of(null);
      })
    );
  }

  getSteps(): Observable<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const body = {
      aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfToday.getTime(),
      endTimeMillis: endOfToday.getTime()
    };

    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        let totalSteps = 0;
        if (response.bucket && response.bucket.length > 0) {
          response.bucket.forEach((bucket: any) => {
            bucket.dataset.forEach((dataset: any) => {
              dataset.point.forEach((point: any) => {
                totalSteps += point.value[0]?.intVal || 0;
              });
            });
          });
        }
        return totalSteps;
      })
    );
  }

  getCalories(): Observable<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0); 
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999); 

    const body = {
      aggregateBy: [{ dataTypeName: 'com.google.calories.expended' }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startOfToday.getTime(),
      endTimeMillis: endOfToday.getTime()
    };

    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        let totalCalories = 0;

        if (response.bucket && response.bucket.length > 0) {
          response.bucket.forEach((bucket: any) => {
            bucket.dataset.forEach((dataset: any) => {
              dataset.point.forEach((point: any) => {
                totalCalories += point.value[0]?.floatVal || 0;
              });
            });
          });
        }
        return totalCalories; 
      })
    );
  }  
}
