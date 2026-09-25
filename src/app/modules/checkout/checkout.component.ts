import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CartRow, CartService } from '../../services/cart.service';
import { AuthService, UserProfile } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { NotifyService } from '../../services/notify.service';
import { ASSET_URLS } from '../../constants/urls';
import { BookingSummary } from '../booking-success/booking-success.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss'
})
export class CheckoutComponent implements OnInit, OnDestroy {
  logoUrl = ASSET_URLS.LOGO;

  user: UserProfile | null = null;
  rows: CartRow[] = [];

  avoidCalling = false;
  tip = 0;
  tipOptions = [50, 75, 100];

  private area: string | null = null;
  private sub = new Subscription();

  constructor(
    private cart: CartService,
    private auth: AuthService,
    private location: LocationService,
    private notify: NotifyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub.add(this.cart.rows$.subscribe((rows) => (this.rows = rows)));
    this.sub.add(this.auth.currentUser$.subscribe((user) => (this.user = user)));
    this.sub.add(this.location.area$.subscribe((area) => (this.area = area?.label ?? null)));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ── Totals (no separate taxes/fees — everything is included in the price) ──
  get itemTotal(): number {
    return this.cart.total;
  }

  get amountToPay(): number {
    return this.itemTotal + (this.user ? this.tip : 0);
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  get cardTitle(): string {
    const first = this.rows[0]?.service;
    return first?.categoryName || first?.groupName || 'Your booking';
  }

  get addressLine(): string {
    return this.area ? `Home · ${this.area}` : 'Home · 33, Ghodasar, Ahmedabad, Gujarat';
  }

  // ── Cart ──
  inc(row: CartRow): void {
    this.cart.add(row.service);
  }

  dec(row: CartRow): void {
    this.cart.remove(row.service.id);
  }

  editPackage(): void {
    this.router.navigate(['/']);
  }

  // ── Auth ──
  login(): void {
    this.auth.openLoginModal();
  }

  // ── Tip ──
  setTip(value: number): void {
    this.tip = this.tip === value ? 0 : value;
  }

  customTip(): void {
    const input = typeof window !== 'undefined' ? window.prompt('Enter tip amount (₹)') : null;
    const amount = input ? parseInt(input, 10) : NaN;
    if (!isNaN(amount) && amount >= 0) this.tip = amount;
  }

  // ── Pay ──
  pay(): void {
    if (!this.user) {
      this.login();
      return;
    }
    // No real gateway yet — treat pay as instant success.
    // Summary goes through router state (not the URL) so a refresh of the success page can't replay it.
    const booking: BookingSummary = {
      title: this.cardTitle,
      items: this.cart.count,
      amount: this.amountToPay,
      address: this.addressLine,
    };
    // Clear after navigating, otherwise this page flashes its empty-cart state first
    this.router.navigate(['/booking-success'], { state: { booking } }).then(() => this.cart.clear());
  }

  // ── Stubs for the remaining booking steps ──
  editAddress(): void {
    this.notify.show('Address editing is coming soon.');
  }

  viewOffers(): void {
    this.notify.show(this.user ? 'Offers are coming soon.' : 'Login or sign up to view offers.');
  }

  viewBreakup(): void {
    this.notify.show('Amount to pay is inclusive of all taxes & charges.');
  }

  readPolicy(): void {
    this.notify.show('Full cancellation policy is coming soon.');
  }
}
