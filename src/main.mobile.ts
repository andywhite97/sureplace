import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { createAppConfig } from './app/app.config';

// Native assets are a client-rendered SPA, without web prerender/hydration.
bootstrapApplication(App, createAppConfig(false)).catch((error) => console.error(error));
