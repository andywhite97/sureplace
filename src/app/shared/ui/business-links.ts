import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export interface BusinessLinks {
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  website?: string;
  whatsapp_number?: string;
}
export function businessUrl(platform = ''): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string;
    if (!value) return null;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        /[\s\\]/.test(value)
      )
        throw 0;
      if (platform) {
        if (
          ![platform + '.com', 'www.' + platform + '.com', 'm.' + platform + '.com'].includes(
            host,
          ) ||
          !url.pathname.replaceAll('/', '') ||
          /^\/(l.php|redirect|share|login)/i.test(url.pathname)
        )
          throw 0;
      } else if (
        !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(host) ||
        /\.(local|localhost|internal|test|invalid|example|home|lan)$/.test(host)
      )
        throw 0;
      return null;
    } catch {
      return { businessUrl: true };
    }
  };
}
export const businessPhone: ValidatorFn = (control) =>
  !control.value || /^\+[1-9]\d{7,14}$/.test(control.value) ? null : { businessPhone: true };
