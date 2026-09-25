import { Routes } from '@angular/router';
import { HomeComponent } from './modules/home/home.component';
import { ServiceListingComponent } from './modules/service-listing/service-listing.component';
import { CheckoutComponent } from './modules/checkout/checkout.component';
import { BookingSuccessComponent } from './modules/booking-success/booking-success.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'services/:category/:group', component: ServiceListingComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'booking-success', component: BookingSuccessComponent },
  { path: '**', redirectTo: '' }
];

