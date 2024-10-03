import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth, signOut } from '@angular/fire/auth';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  
  userProfile: any = null;
  unreadNotificationsCount: number = 0;
  isProfileMenuOpen = false;

  constructor (
    private userService: UserService, 
    private auth: Auth, 
    private router: Router, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.getUserProfile().subscribe(
      profile => {
        this.userProfile = profile;
      },
      error => {
        console.error('Error loading user profile:', error);
      }
    );
  }
 

  toggleProfileMenu() {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
  }
  
  logout() {
    return signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }
}
