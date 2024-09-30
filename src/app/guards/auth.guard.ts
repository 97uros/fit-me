import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    return authState(this.auth).pipe(
      take(1),
      map(user => {
        if (user) {
          console.log('User is authenticated');
          return true;
        } else {
          console.log('User is not authenticated, redirecting to /login');
          this.router.navigate(['/login']);
          return false;
        }
      })
    );
  }
}
