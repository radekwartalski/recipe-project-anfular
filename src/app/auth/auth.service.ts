import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthResponseData } from './AuthResponseDataModel';
import { catchError, tap } from 'rxjs/operators';
import { throwError, Subject, BehaviorSubject } from 'rxjs';
import { User } from './user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

// Mamy dostep do user rowniez w momencie po jego logowaniu
user = new BehaviorSubject<User>(null);
private tokenExpirationTimer: any;


constructor(private http: HttpClient, private router: Router) { }

signUpUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyBz0NdxBIR3CFg-ZVuunPnXUPCGic0spsI';
loginUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBz0NdxBIR3CFg-ZVuunPnXUPCGic0spsI';

signup(email: string, password: string) {
  return this.http.post<AuthResponseData>(
    this.signUpUrl,
    {
      email: email,
      password: password,
      returnSecureToken: true
    }).pipe(
      catchError(this.handleError),
      tap(resData => {
        this.handleAuthentication(
          resData.email,
          resData.localId,
          resData.idToken,
          +resData.expiresIn);
      }));
}

login(email: string, password: string){
  return this.http.post<AuthResponseData>(this.loginUrl, {
    email: email,
    password: password,
    returnSecureToken: true
  }).pipe(
    catchError(this.handleError),
    tap(resData => {
      this.handleAuthentication(
        resData.email,
        resData.localId,
        resData.idToken,
        +resData.expiresIn);
    }));
}

autoLogin() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  if (!userData) {
    return;
  }

  const loadedUser = new User(userData.email, userData.id, userData._token, new Date(userData._tokenExpirationDate));

  if (loadedUser.token) {
    this.user.next(loadedUser);
    const expDuration = new Date(userData._tokenExpirationDate).getTime() -
    new Date().getTime();
    this.autoLogout(expDuration * 1000);
  }

}

logout() {
  this.user.next(null);
  this.router.navigate(['/auth']);
  localStorage.removeItem('userData');
  if (this.tokenExpirationTimer) {
    clearTimeout(this.tokenExpirationTimer)
  }
  this.tokenExpirationTimer = null;
}

// uzywany tego zawsze jak emitujemy usera
autoLogout(expirationDuration: number) {
  this.tokenExpirationTimer = setTimeout(() => {
    this.logout();
  }, expirationDuration);
}

private handleError(errorRes: HttpErrorResponse) {
  let errorMessage = 'An uknown error occured';
  if (!errorRes.error || !errorRes.error.error) {
    return throwError(errorMessage);
  }
  switch(errorRes.error.error.message) {
    case 'EMAIL_EXISTS':
        errorMessage = 'This email exists already';
        break;
    case 'EMAIL_NOT_FOUND':
        errorMessage = 'This email does not exists ';
        break;
    case 'INVALID_PASSWORD':
        errorMessage = 'This password is invalid';
  }
  return throwError(errorMessage);
}


private handleAuthentication(email: string, userId: string, token: string, expirationIn: number) {
    const expirationDate = new Date(new Date().getTime() + expirationIn * 1000);
    const user = new User(
      email,
      userId,
      token,
      expirationDate
    );
    this.user.next(user);
    this.autoLogout(expirationIn * 1000);
    localStorage.setItem('userData', JSON.stringify(user));
  }

}
