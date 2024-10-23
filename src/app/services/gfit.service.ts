import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, map, of, switchMap, tap } from 'rxjs'; 
import { Auth } from '@angular/fire/auth';
import { doc, getDoc, Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class GFitService {
  private fitApiUrl = 'http://localhost:3000/api/google-fit'; 
  private peopleApiUrl = 'https://people.googleapis.com/v1/people/me?personFields=names,photos,birthdays,genders';

  constructor(
    private http: HttpClient,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  private getAccessToken(): Promise<string | null> { 
    return new Promise(async (resolve, reject) => {
      const userId = this.auth.currentUser?.uid;
      if (userId) {
        const userDocRef = doc(this.firestore, `users/${userId}`);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          resolve(userDoc.data()?.['googleFitAccessToken'] || null);
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
          gender: response.genders?.[0]?.value || null, // This might still be null if not set
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
      bucketByTime: { durationMillis: 86400000 }, // Aggregate data by day (24 hours)
      startTimeMillis: Date.now() - (30 * 24 * 60 * 60 * 1000), // Start time (30 days ago)
      endTimeMillis: Date.now() // End time (current time)
    };
  
    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        if (response.bucket && response.bucket.length > 0) {
          // Loop through the buckets and get the latest weight value
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
        return of(null); // Return null in case of error
      })
    );
  }

  getUserWeightForDate(date: Date): Observable<number | null> {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.weight',
        dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight'
      }],
      bucketByTime: { durationMillis: 86400000 }, // Aggregate data by day (24 hours)
      startTimeMillis: date.getTime(),
      endTimeMillis: date.getTime() + 86400000 // Add one day to include the whole day
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
        return of(null); // Return null in case of error
      })
    );
  }  
  
  getUserHeightFromGoogleFit(): Observable<number | null> {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.height',
        dataSourceId: 'derived:com.google.height:com.google.android.gms:merge_height'
      }],
      bucketByTime: { durationMillis: 86400000 }, // Aggregate data by day (24 hours)
      startTimeMillis: Date.now() - (30 * 24 * 60 * 60 * 1000), // Start time (30 days ago)
      endTimeMillis: Date.now() // End time (current time)
    };
  
    return this.fetchGoogleFitData('users/me/dataset:aggregate', body).pipe(
      map((response: any) => {
        if (response.bucket && response.bucket.length > 0) {
          // Loop through the buckets and get the latest height value
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
        return of(null); // Return null in case of error
      })
    );
  }

  // Example method to get steps
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

  // Fetch calories from Google Fit
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
