////////// ANGULAR //////////
import { Component, OnInit, Input, EventEmitter, Output, } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

//////////// ANGULAR MATERIAL
import { MatDialog, MatSnackBar } from "@angular/material";
import { TableDataSource, ValidatorService } from 'angular4-material-table';

////////// RXJS ///////////
import { first, filter, map } from "rxjs/operators";

////////// COMPONENTS AND SERVICES //////////
import { BusinessAttributesValidatorService } from './business-attributes-validator.service';
import { BusinessDetailService } from "../business-detail.service";

export class Attribute {
  key: string;
  value: string;
}

@Component({
  selector: "app-business-attributes",
  providers: [{provide: ValidatorService, useClass: BusinessAttributesValidatorService }],
  templateUrl: "./business-attributes.component.html",
  styleUrls: ["./business-attributes.component.scss"]
})
export class BusinessAttributesComponent implements OnInit {

  ////////////// TABLE //////////////
  dataSource: TableDataSource<Attribute>;
  displayedColumns = ['key', 'value', 'actionsColumn'];

  ////////////// BUSINESS ATTRIBUTES //////////////
  @Input() businessAttributeList = [] ;
  @Output() businessAttributesListChange = new EventEmitter<Attribute[]>();


  businessForm: FormGroup;  
  _businessId: String;
  _businessDetailAction: String;
  selectedBusiness: any;
  addNewBusiness: Boolean;

  constructor(
    private formBuilder: FormBuilder,
    private businessDetailService: BusinessDetailService,
    private businessAttributesValidatorService: BusinessAttributesValidatorService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}


  ngOnInit() {

  }

  get businessId(): any {
    return this._businessId;
  }

  @Input()
  set businessId(businessIdValue: any) {
    this._businessId = businessIdValue;
    if (businessIdValue) {
      this.businessDetailService
        .getBusinessDetail$(businessIdValue)
        .pipe(
          first(),
          map(res => {
            return res.data.getBusiness;
          })
        )
        .subscribe(model => {         
          this.selectedBusiness = JSON.parse(JSON.stringify(model));
          this.businessAttributeList = this.selectedBusiness.attributes ? this.selectedBusiness.attributes: [];
          this.dataSource = new TableDataSource<any>(this.businessAttributeList, Attribute, this.businessAttributesValidatorService);
          this.dataSource.datasourceSubject.subscribe(businessAttributesList => this.businessAttributesListChange.emit(businessAttributesList));
        });
    }
  }

  get businessDetailAction(): any {
    return this._businessDetailAction;
  }

  @Input()
  set businessDetailAction(businessDetailAction: any) {
    this._businessDetailAction = businessDetailAction;
    this.addNewBusiness = businessDetailAction == "ADD";
    this.selectedBusiness = {
      generalInfo: {},
      active: false
    };
  }
}
