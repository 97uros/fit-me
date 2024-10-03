// notification.service.ts
import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { environment } from '../../environments/environment';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  public vapidKey = 'BDLyQe4ojidb-qwZkYWs46ZnCjFw7Rwf0iil3O35GLBv6KbG_MIqXBdJmbh-nlY-_JQWRM_MkW57Tj_fcHOh_eA'; // Get this from Firebase Console

  constructor(
    private toastr: ToastrService
  ) {
    if ('serviceWorker' in navigator) {
    this.requestPermission();
    this.listenForMessages();
    } else {
      console.warn('Service Workers are not supported in this environment');
      
    }
  } 

  async requestPermission() {
    try {
      const messaging = getMessaging();
      const serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getToken(messaging, { vapidKey: this.vapidKey, serviceWorkerRegistration });
      console.log('FCM Token:', token);
      // Optionally, send this token to your server for push notifications
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }

  listenForMessages() {
    const messaging = getMessaging();
    onMessage(messaging, (payload) => {
      console.log('Message received: ', payload);
      if (payload.data) {
        const notificationTitle = payload.data['title'] || 'Workout Reminder';  // Provide a default title
        const notificationOptions = {
          body: payload.data['body'] || 'You have an upcoming workout.',  // Provide a default body
          icon: payload.data['icon'] || 'path-to-default-icon.png'  // Provide a default icon
        };

        new Notification(notificationTitle, notificationOptions);
      } else {
        console.warn('Received payload without data:', payload);
      }
    });
  }

  showReminder(title: string, body: string) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'path-to-icon.png'
      });
    }
  }
}
