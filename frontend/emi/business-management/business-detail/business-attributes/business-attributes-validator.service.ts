import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ValidatorService } from 'angular4-material-table';

@Injectable()
export class BusinessAttributesValidatorService implements ValidatorService {
  getRowValidator(): FormGroup {
    return new FormGroup({
      'key': new FormControl(null, Validators.required),
      'value': new FormControl(null, Validators.required), 
      });
  }
}