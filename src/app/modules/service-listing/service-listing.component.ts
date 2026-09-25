import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ListingItem, ListingService } from '../../services/listing.service';
import { LocationService } from '../../services/location.service';
import { NotifyService } from '../../services/notify.service';
import { CartRow, CartService } from '../../services/cart.service';
import { ServiceIconComponent } from '../service-icon/service-icon.component';
import { byLabel, groupImage, productImage, toTitleCase } from '../../constants/listing-display';

interface SiblingGroup {
  code: string;
  name: string;
  image?: string;
}

interface ServiceRow {
  id: string;
  title: string;
  note?: string;
  price: number;
  image?: string;
}

@Component({
  selector: 'app-service-listing',
  standalone: true,
  imports: [CommonModule, RouterLink, ServiceIconComponent],
  templateUrl: './service-listing.component.html',
  styleUrl: './service-listing.component.scss'
})
export class ServiceListingComponent implements OnInit, OnDestroy {
  isLoading = true;
  notFound = false;

  categoryCode = '';
  categoryName = '';
  groupCode = '';
  groupName = '';
  groupImage?: string;

  siblings: SiblingGroup[] = [];
  services: ServiceRow[] = [];

  highlightedId: string | null = null;
  private highlightTimer?: ReturnType<typeof setTimeout>;
  private scrollToServicesOnLoad = false;

  private listing: ListingItem[] = [];
  private sub = new Subscription();

  private canTransact = false;
  private isUnserviceable = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private listingService: ListingService,
    private locationService: LocationService,
    private notify: NotifyService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.sub.add(this.locationService.canTransact$.subscribe((can) => (this.canTransact = can)));
    this.sub.add(this.locationService.isUnserviceable$.subscribe((v) => (this.isUnserviceable = v)));
    this.sub.add(
      this.route.paramMap.subscribe(async (params) => {
        this.categoryCode = params.get('category') ?? '';
        this.groupCode = params.get('group') ?? '';

        if (!this.listing.length) {
          this.isLoading = true;
          const response = await this.listingService.getListing('product');
          this.listing = response?.data ?? [];
        }
        this.buildPage();
        this.isLoading = false;
        this.highlightFromQuery();
        if (this.scrollToServicesOnLoad) {
          this.scrollToServicesOnLoad = false;
          this.scrollToServices();
        }
      })
    );
    // Search results link to a specific service via ?service=<id>
    this.sub.add(this.route.queryParamMap.subscribe(() => this.highlightFromQuery()));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    clearTimeout(this.highlightTimer);
  }

  /** Scroll to and briefly highlight the service picked in search */
  private highlightFromQuery(): void {
    const id = this.route.snapshot.queryParamMap.get('service');
    if (!id || this.isLoading || !this.services.some((s) => s.id === id)) return;
    clearTimeout(this.highlightTimer);
    this.highlightedId = id;
    // Wait for the list to render (and the router's scroll-to-top) before scrolling
    setTimeout(() => document.getElementById(`svc-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
    this.highlightTimer = setTimeout(() => (this.highlightedId = null), 2600);
  }

  /** Mobile stacks banner + tiles above the list, so jump to the list after picking a tile */
  onSiblingPick(code: string): void {
    if (!this.isMobile()) return;
    if (code === this.groupCode) this.scrollToServices(); // same group: no navigation happens
    else this.scrollToServicesOnLoad = true;
  }

  private scrollToServices(): void {
    // Same delay as highlightFromQuery — let the list render and the router's scroll-to-top run first
    setTimeout(() => document.getElementById('sl-services')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
  }

  get cartRows(): CartRow[] {
    return this.cartService.rows;
  }

  get cartCount(): number {
    return this.cartService.count;
  }

  get cartTotal(): number {
    return this.cartService.total;
  }

  qty(id: string): number {
    return this.cartService.qty(id);
  }

  add(service: ServiceRow): void {
    // Adding to cart needs a serviceable location.
    if (!this.canTransact) {
      if (this.isUnserviceable) {
        // We know the city — it's just not served yet.
        this.notify.show("MyGenie isn't available in your area yet — we're expanding soon!");
      } else {
        // No location yet — invite the user to turn it on and reopen the location sheet.
        this.notify.show('Enable location to add services to your cart.');
        this.locationService.promptEnable();
      }
      return;
    }
    this.cartService.add({ ...service, groupName: this.groupName, categoryName: this.categoryName });
  }

  remove(service: ServiceRow): void {
    this.cartService.remove(service.id);
  }

  goToCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  formatPrice(value: number): string {
    return `₹${value.toLocaleString('en-IN')}`;
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  private buildPage(): void {
    const inCategory = this.listing.filter((item) => item.category?.code === this.categoryCode);
    const inGroup = inCategory.filter((item) => item.group?.code === this.groupCode);

    this.notFound = !inGroup.length;
    if (this.notFound) return;

    const { category, group } = inGroup[0];
    this.categoryName = toTitleCase(category.label);
    this.groupName = toTitleCase(group.label);
    this.groupImage = groupImage(inGroup, group.code);

    // Other groups in the same category for "Select a service"
    const unique = new Map<string, ListingItem['group']>();
    inCategory.forEach((item) => {
      if (item.group && !unique.has(item.group.code)) unique.set(item.group.code, item.group);
    });
    this.siblings = [...unique.values()].sort(byLabel).map((g) => ({
      code: g.code,
      name: toTitleCase(g.label),
      image: groupImage(inCategory, g.code),
    }));

    // Services / products in this group, keeping API order
    this.services = inGroup.map((item) => {
      const title = toTitleCase(item.name);
      const description = toTitleCase(item.description || '');
      // Descriptions are often just "GROUP - NAME"; only show one that adds information
      const isRedundant = !description || description === title || description === `${this.groupName} - ${title}`;
      return {
        id: item.id,
        title,
        note: isRedundant ? undefined : description,
        price: item.unitPrice,
        image: productImage(item),
      };
    });
  }
}
