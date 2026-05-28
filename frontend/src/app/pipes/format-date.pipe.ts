import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatDate',
  pure: false
})
export class FormatDatePipe implements PipeTransform {
  transform(value: Date): string {
    const now = new Date();

    const years = Math.floor(now.getFullYear() - value.getFullYear());
    const months = Math.floor(now.getMonth() - value.getMonth());
    const days = Math.floor(now.getDay() - value.getDay());
    const minutes = Math.floor(now.getMinutes() - value.getMinutes());
    const seconds = Math.floor(now.getSeconds() - value.getSeconds());

    if (years === 1) {
      return 'a year ago';
    } else if (years > 1) {
      return `${years} years ago`;
    }

    if (months === 1) {
      return 'a month ago';
    } else if (months > 1) {
      return `${months} months ago`;
    }

    if (days === 1) {
      return 'a day ago';
    } else if (days > 1) {
      return `${days} days ago`;
    }

    if (minutes === 1) {
      return 'a minute ago';
    } else if (minutes > 1) {
      return `${minutes} minutes ago`;
    }

    if (seconds === 1) {
      return 'just now';
    } else if (seconds > 1) {
      return `${seconds} seconds ago`;
    }

    return 'just now';
  }
}
