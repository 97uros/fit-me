import { Injectable } from '@angular/core';
import { CalendarDateFormatter, DateFormatterParams } from 'angular-calendar';
import { DatePipe } from '@angular/common';
import { DateAdapter } from 'angular-calendar';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Injectable()
export class CustomDateFormatter extends CalendarDateFormatter {
  isMobile: boolean = false;

  constructor(
    private datePipe: DatePipe,
    public override dateAdapter: DateAdapter,
    private breakpointObserver: BreakpointObserver
  ) {
    super(dateAdapter);
    
    // Detect mobile device using BreakpointObserver
    this.breakpointObserver.observe([Breakpoints.Handset])
      .subscribe(result => {
        this.isMobile = result.matches;
      });
  }

  // Override for month view column headers (day names)
  public override monthViewColumnHeader({ date, locale }: DateFormatterParams): string {
    if (this.isMobile) {
      // Return single-letter day names for mobile (M, T, W, etc.)
      return this.datePipe.transform(date, 'EEE', undefined, locale)?.charAt(0) || '';
    } else {
      // Return full short day names (Mon, Tue, etc.) for larger screens
      return this.datePipe.transform(date, 'EEE', undefined, locale) || '';
    }
  }

  // You can also override other views if needed, like below:

  // Override for the month view title (e.g., September 2024)
  public override monthViewTitle({ date, locale }: DateFormatterParams): string {
    if (this.isMobile) {
      // Format for mobile (e.g., "SEP 2024")
      return this.datePipe.transform(date, 'MMM yyyy', undefined, locale)?.toUpperCase() || '';
    } else {
      // Default format (e.g., "September 2024")
      return this.datePipe.transform(date, 'MMMM yyyy', undefined, locale) || '';
    }
  }
}
