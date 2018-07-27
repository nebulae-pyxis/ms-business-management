import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from '../../../core/modules/shared.module';
import { DatePipe } from '@angular/common';
import { FuseWidgetModule } from '../../../core/components/widget/widget.module';

import { BusinessManagementService } from './business-management.service';
import { BusinessDetailService } from './business-detail/business-detail.service';
import { BusinessManagementComponent } from './business-management.component';
import { BusinessDetailComponent } from './business-detail/business-detail.component';
import { BusinessDialogComponent } from './business-detail/business-dialog/business-dialog.component';
import { BusinessAttributesComponent } from './business-detail/business-attributes/business-attributes.component';
import { BusinessAttributesValidatorService } from './business-detail/business-attributes/business-attributes-validator.service';

const routes: Routes = [
  {
    path: '',
    component: BusinessManagementComponent,
  }
];

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild(routes),
    FuseWidgetModule
  ],
  declarations: [
    BusinessManagementComponent,
    BusinessDetailComponent,
    BusinessDialogComponent,
    BusinessAttributesComponent
  ],
  entryComponents: [BusinessDialogComponent],
  providers: [ BusinessManagementService, BusinessDetailService, DatePipe, BusinessAttributesValidatorService]
})

export class BusinessManagementModule {}