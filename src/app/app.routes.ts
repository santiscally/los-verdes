import { Routes } from '@angular/router';
import { ProductAddComponent } from './views/product-add/product-add.component';
import { LayoutComponent } from './views/layout/layout.component';
import { ClientsComponent } from './views/clients/clients.component';
import { CreateOrderComponent } from './views/create-order/create-order.component';
import { OrdersComponent } from './views/orders/orders.component';
import { AuthGuard } from '@angular/fire/auth-guard';
import { LoginComponent } from './views/login/login.component';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'add-product', pathMatch: 'full' },
      { 
        path: 'add-product', 
        component: ProductAddComponent,
        data: { title: 'Agregar Producto', showBreadcrumb: true }
      },
      { 
        path: 'clients', 
        component: ClientsComponent,
        data: { title: 'Agregar Cliente', showBreadcrumb: true }
      },
      { 
        path: 'create-order', 
        component: CreateOrderComponent,
        data: { title: 'Crear Ordenes de Compra', showBreadcrumb: true }
      },
      {
        path: 'orders',
        component: OrdersComponent,
        data: { title: 'Órdenes de Compra', showBreadcrumb: true }
      },
    ]
  },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];