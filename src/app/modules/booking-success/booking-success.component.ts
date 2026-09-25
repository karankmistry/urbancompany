import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ASSET_URLS } from '../../constants/urls';

export interface BookingSummary {
  title: string;
  items: number;
  amount: number;
  address: string;
}

const REDIRECT_SECONDS = 10;

@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-success.component.html',
  styleUrl: './booking-success.component.scss'
})
export class BookingSuccessComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  booking: BookingSummary | null = null;
  secondsLeft = REDIRECT_SECONDS;

  private timer?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Set by CheckoutComponent.pay(); missing on a direct visit or refresh — nothing to confirm, so go home
    this.booking = (typeof history !== 'undefined' && history.state?.booking) || null;
    if (!this.booking) {
      this.goHome();
      return;
    }

    this.timer = setInterval(() => {
      this.secondsLeft--;
      if (this.secondsLeft <= 0) this.goHome();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  goHome(): void {
    clearInterval(this.timer);
    // replaceUrl so Back from home doesn't return to this confirmation
    this.router.navigate(['/'], { replaceUrl: true });
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }
}
