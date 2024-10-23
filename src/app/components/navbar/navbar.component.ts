import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  
  profileData: any = {
    name: '',
    dob: '',
    profilePicture: null
  };
  errorMessage: string | null = null;
  isProfileMenuOpen = false;

  constructor (
    private auth: Auth, 
    private router: Router, 
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.fetchProfileData();
  }

  fetchProfileData() {
    this.userService.getGoogleFitProfileData().subscribe({
      next: (profileData) => {
        if (profileData) {
          this.profileData = profileData;
        } else {
          this.errorMessage = 'No profile data found.';
        }
      },
      error: (error) => this.errorMessage = 'Error fetching profile data'
    });    
  }

  get age(): number | null {
    return this.userService.calculateAge(this.profileData.dob);
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
