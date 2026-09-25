import { Component, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './modules/header/header.component';
import { FooterComponent } from './modules/footer/footer.component';
import { LoginComponent } from './modules/login/login.component';
import { LocationGateComponent } from './modules/location-gate/location-gate.component';
import { LocationService } from './services/location.service';
import { NotifyService } from './services/notify.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, NgIf, HeaderComponent, FooterComponent, LoginComponent, LocationGateComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'MyGenie';
  area$ = this.locationService.area$;
  // Location is optional — the app is always interactive. These only drive soft banners/prompts.
  isUnserviceable$ = this.locationService.isUnserviceable$;
  needsLocation$ = this.locationService.needsLocation$;
  toast$ = this.notify.message$;
  // Checkout + booking success use their own minimal chrome, so hide the site header/footer there.
  hideChrome = false;

  private sub = new Subscription();

  constructor(
    private locationService: LocationService,
    private notify: NotifyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Drive the global browse-only styles (hide prices, disable purchase) from the body.
    this.sub.add(
      this.locationService.isUnserviceable$.subscribe((unserviceable) => {
        document.body.classList.toggle('browse-only', unserviceable);
      })
    );

    this.hideChrome = this.isCheckout(this.router.url);
    this.sub.add(
      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => (this.hideChrome = this.isCheckout(e.urlAfterRedirects)))
    );
  }

  private isCheckout(url: string): boolean {
    const path = url.split('?')[0];
    return path.startsWith('/checkout') || path.startsWith('/booking-success');
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    document.body.classList.remove('browse-only');
  }

  checkAgain(): void {
    // Fresh position; the banner clears automatically if the new area is serviceable.
    this.locationService.requestLocation(false, true);
  }

  enableLocation(): void {
    // Reopen the location sheet (and re-ask the browser) so the user can turn it on.
    this.locationService.promptEnable();
  }
}
