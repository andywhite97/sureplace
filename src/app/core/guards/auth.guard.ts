import {inject} from '@angular/core';import {CanActivateFn,Router} from '@angular/router';import {AuthService} from '../auth/auth.service';
export const authGuard:CanActivateFn=(_,state)=>{const auth=inject(AuthService);return auth.isAuthenticated()||inject(Router).createUrlTree(['/login'],{queryParams:{returnUrl:state.url}})};
export const guestGuard:CanActivateFn=()=>!inject(AuthService).isAuthenticated()||inject(Router).createUrlTree(['/account']);
