import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideToastr } from 'ngx-toastr';
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes), 
    provideFirebaseApp(() => initializeApp({"projectId":"los-verdes-ab4ad","appId":"1:487765646559:web:10ad810c003ee31e42dd6a","storageBucket":"los-verdes-ab4ad.appspot.com","apiKey":"AIzaSyARDrgr-cCQe_g0gVqAOEwJRsS3Ik9u-mk","authDomain":"los-verdes-ab4ad.firebaseapp.com","messagingSenderId":"487765646559"})), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()), provideFirebaseApp(() => initializeApp({"projectId":"los-verdes-ab4ad","appId":"1:487765646559:web:10ad810c003ee31e42dd6a","storageBucket":"los-verdes-ab4ad.appspot.com","apiKey":"AIzaSyARDrgr-cCQe_g0gVqAOEwJRsS3Ik9u-mk","authDomain":"los-verdes-ab4ad.firebaseapp.com","messagingSenderId":"487765646559"})), 
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore()),
    provideAnimations(), // required animations providers
    provideToastr({
      timeOut: 3000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }), // Toastr providers with some basic config
  ]
};


