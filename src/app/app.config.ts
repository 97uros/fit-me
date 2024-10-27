import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideMessaging, getMessaging } from '@angular/fire/messaging';
import { provideDatabase, getDatabase } from '@angular/fire/database'; 
import { environment } from '../environments/environment';
import { ToastrModule } from 'ngx-toastr';

// Import FullCalendar modules
import { FullCalendarModule } from '@fullcalendar/angular'; // for Angular
import dayGridPlugin from '@fullcalendar/daygrid'; // day grid plugin
import timeGridPlugin from '@fullcalendar/timegrid'; // time grid plugin

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideHttpClient(), 
    importProvidersFrom(
      ToastrModule.forRoot({
        timeOut: 5000,
        closeButton: true,
        positionClass: 'toast-bottom-right',
        preventDuplicates: true,
      }),
      FullCalendarModule // Add FullCalendarModule here
    ),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage()),
    provideMessaging(() => getMessaging()),
    provideDatabase(() => getDatabase()) // Add this line
  ]
};
