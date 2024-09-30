import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, updateDoc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(private firestore: Firestore, private auth: Auth) {}

  async addNotification(notification: any): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const notificationRef = collection(this.firestore, `users/${user.uid}/notifications`);
      await addDoc(notificationRef, notification);
    }
  }

  async getUserNotifications(): Promise<any[]> {
    const user = this.auth.currentUser;
    if (user) {
      const notifications: any[] = [];
      const notificationsCollection = collection(this.firestore, `users/${user.uid}/notifications`);
      const notificationSnapshot = await getDocs(notificationsCollection);
      notificationSnapshot.forEach(doc => {
        notifications.push({ id: doc.id, ...doc.data() });
      });
      return notifications;
    }
    return [];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const notificationDoc = doc(this.firestore, `users/${user.uid}/notifications/${notificationId}`);
      await updateDoc(notificationDoc, { read: true });
    }
  }

  async markAllAsRead(): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      const notificationsCollection = collection(this.firestore, `users/${user.uid}/notifications`);
      const notificationSnapshot = await getDocs(notificationsCollection);
      notificationSnapshot.forEach(async (doc) => {
        await updateDoc(doc.ref, { read: true });
      });
    }
  }
}
