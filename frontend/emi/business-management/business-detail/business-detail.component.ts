////////// ANGULAR //////////
import { Component, OnInit, Input, EventEmitter, Output } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators
} from "@angular/forms";

////////// COMPONENTS AND SERVICES /////////
import { BusinessDialogComponent } from "./business-dialog/business-dialog.component";
import { BusinessDetailService } from "./business-detail.service";
import { TranslateService } from "@ngx-translate/core";
import { FuseTranslationLoaderService } from './../../../../core/services/translation-loader.service';

////////// ANGULAR MATERIAL //////////
import { MatDialog, MatSnackBar } from "@angular/material";

////////// RXJS ///////////
// tslint:disable-next-line:import-blacklist
import * as Rx from "rxjs/Rx";
import { first, filter, tap, mergeMap } from "rxjs/operators";

@Component({
  selector: "app-business-detail",
  templateUrl: "./business-detail.component.html",
  styleUrls: ["./business-detail.component.scss"]
})
export class BusinessDetailComponent implements OnInit {
  businessForm: FormGroup;
  selectedBusiness: any;
  selectedBusinessAttributesChanges: any;
  selectedBusinessWithoutChanges: any;
  _businessId: String;
  _businessDetailAction: String;
  addNewBusiness: Boolean;
  selectedTab = new FormControl(0);
  @Output() businessCreated = new EventEmitter<any>();
  @Output() closeBusinessDetail = new EventEmitter<Boolean>();

  constructor(
    private formBuilder: FormBuilder,
    private businessDetailService: BusinessDetailService,
    private translationLoader: FuseTranslationLoaderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
  ) {}

  get businessId(): any {
    return this._businessId;
  }

  @Input()
  set businessId(businessIdValue: any) {
    this._businessId = businessIdValue;
    if (businessIdValue) {
      this.findBusinessById(businessIdValue);
      this.selectedTab.setValue(0);
    }
  }

  get businessDetailAction(): any {
    return this._businessDetailAction;
  }

  @Input()
  set businessDetailAction(businessDetailAction: any) {
    this._businessDetailAction = businessDetailAction;
    this.addNewBusiness = businessDetailAction == "ADD";
    // console.log('addNewBusiness => ', this.addNewBusiness);
    this.selectedBusiness = {
      generalInfo: {},
      active: false
    };
  }

  ngOnInit() {
    this.businessForm = this.createBusinessForm();
  }

  /**
   * Creates the business detail form and its validations
   */
  createBusinessForm() {
    return this.formBuilder.group({
      idSystem: new FormControl({value: '', disabled: true}),
      name: new FormControl(),
      documentType: new FormControl(),
      documentId: new FormControl(),
      type: new FormControl(),
      email: new FormControl("", Validators.email),
      active: new FormControl(),
      contactInfo: new FormControl()
    });
  }

  /**
   * Finds the business by the ID
   * @param businessId ID
   */
  findBusinessById(businessId) {
    this.businessDetailService
      .getBusinessDetail$(businessId)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
      )      
      .subscribe(business => {
        //Keeps two references of the business variable to check if it was changed or not.
        this.selectedBusiness = JSON.parse(JSON.stringify(business.data.getBusiness));
        this.selectedBusinessWithoutChanges = JSON.parse(
          JSON.stringify(business.data.getBusiness)
        );
      });
  }

  /**
   * Creates a new business according to the info entered in the form
   */
  createBusiness() {
    this.dialog
      //Opens confirm dialog
      .open(BusinessDialogComponent, {
        data: {
          dialogMessage: "BUSINESS.CREATE_BUSINESS_MESSAGE",
          dialogTitle: "BUSINESS.CREATE_BUSINESS_TITLE"
        }
      })
      .afterClosed()
      .pipe(filter(createBusiness => createBusiness))
      .subscribe(createBusiness => {
        //If the OK option was selected on the confirm dialog, we have to send the command to create the new business.
        if (createBusiness) {
          this.selectedBusiness.state =  this.selectedBusiness.state? this.selectedBusiness.state: false
          this.selectedBusiness.generalInfo.name = this.selectedBusiness.generalInfo.name.trim();
          this.businessDetailService
            .createBusinessDetail$(this.selectedBusiness)
            .pipe(
              mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
              filter((resp: any) => !resp.errors || resp.errors.length === 0),
            )
            .subscribe(model => {
              this.snackBar.open(this.translationLoader.getTranslate().instant('BUSINESS.BUSINESS_CREATED'), 
              this.translationLoader.getTranslate().instant('BUSINESS.CLOSE'), {
                duration: 2000
              });
              this.businessCreated.emit(this.selectedBusiness);
              this.closeDetail();
            },
          error => {
            console.log('Error creando agente ==> ', error);
          });
        }
      });
  }

  /**
   * Updates the selected business according to the info entered in the form
   */
  updateBusiness() {
    this.dialog
      //Opens confirm dialog
      .open(BusinessDialogComponent, {
        data: {
          dialogTitle: "BUSINESS.UPDATE_BUSINESS_TITLE",
          dialogMessage: "BUSINESS.UPDATE_BUSINESS_MESSAGE"
        }
      })
      .afterClosed()
      .pipe(filter(updateBusiness => updateBusiness))
      .subscribe(updateBusiness => {
        //If the OK option was selected on the confirm dialog, we have to send the command to updated the business.
        if (updateBusiness) {
          let businessGeneralInfoInput = null;
          let businessStateListInput = null;

          //Checks the business info that was changed to send the commands need
          const stateChanged =
            this.selectedBusinessWithoutChanges.state !=
            this.selectedBusiness.state;

          const generalInfoChanged = !this.isEquivalent(
            this.selectedBusinessWithoutChanges.generalInfo,
            this.selectedBusiness.generalInfo
          );

          if (generalInfoChanged) {
            businessGeneralInfoInput = {
              documentType: this.selectedBusiness.generalInfo.documentType,
              documentId: this.selectedBusiness.generalInfo.documentId,
              name: this.selectedBusiness.generalInfo.name,
              type: this.selectedBusiness.generalInfo.type,
              email: this.selectedBusiness.generalInfo.email,
              contactInfo: this.selectedBusiness.generalInfo.contactInfo
            };
          }

          if (stateChanged) {
            businessStateListInput = this.selectedBusiness.state;
          }

          this.businessDetailService
            .updateBusiness$(
              this.selectedBusiness,
              businessGeneralInfoInput,
              null,
              businessStateListInput
            ).pipe(
              mergeMap(resp => {
                return this.graphQlAlarmsErrorHandler$(resp);
              }),
              filter((resp: any) => !resp.errors || resp.errors.length === 0),
            ).subscribe(
              model => {
                this.snackBar.open(this.translationLoader.getTranslate().instant('BUSINESS.BUSINESS_UPDATED'), 
                this.translationLoader.getTranslate().instant('BUSINESS.CLOSE'), 
                {
                  duration: 2000
                });
                this.selectedBusinessWithoutChanges = JSON.parse(
                  JSON.stringify(this.selectedBusiness)
                );
              },
              error => {
                this.findBusinessById(this.selectedBusiness._id);
              },
              () => {}
            );
        }
      });
  }

  removeBusiness() {
  }

  /**
   * Receives the new business attributes of the selected business
   * @param attributes new attributes of the selected business
   */
  handleBusinessAttributesChangedEvent(attributes) {
    this.selectedBusiness.attributes = attributes;

    //Removes unnecessary values of the attributes array
    const attributesList = this.selectedBusiness.attributes.map(attribute => {
      return { key: attribute.key, value: attribute.value };
    });

    const businessAttributeListInput = {
      attributes: attributesList
    };

    this.businessDetailService
      .updateBusiness$(
        this.selectedBusiness,
        null,
        businessAttributeListInput,
        null
      ).pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
      ).subscribe(
        model => {
          this.snackBar.open(
            this.translationLoader.getTranslate().instant('BUSINESS.ATTRIBUTES_UPDATED'), 
            this.translationLoader.getTranslate().instant('BUSINESS.CLOSE'), 
            {
              duration: 2000
            });
          this.selectedBusiness.attributes = attributesList;
          this.selectedBusinessWithoutChanges = JSON.parse(
            JSON.stringify(this.selectedBusiness)
          );
        },
        error => {
          this.findBusinessById(this.selectedBusiness._id);
        },
        () => {}
      );
  }


  graphQlAlarmsErrorHandler$(response){
    return Rx.Observable.of(JSON.parse(JSON.stringify(response)))
    .pipe(
      tap((resp: any) => {
        this.showSnackBarError(resp);

        return resp;
      })
    );
  }

  /**
   * Shows an error snackbar
   * @param response
   */
  showSnackBarError(response){
    if (response.errors){

      if (Array.isArray(response.errors)) {
        response.errors.forEach(error => {
          if (Array.isArray(error)) {
            error.forEach(errorDetail => {
              this.showMessageSnackbar('ERRORS.' + errorDetail.message.code);
            });
          }else{
            response.errors.forEach(error => {
              this.showMessageSnackbar('ERRORS.' + error.message.code);
            });
          }
        });
      }
    }
  }

  /**
   * Shows a message snackbar on the bottom of the page
   * @param messageKey Key of the message to i18n
   * @param detailMessageKey Key of the detail message to i18n
   */
  showMessageSnackbar(messageKey, detailMessageKey?){
    let translationData = [];
    if(messageKey){
      translationData.push(messageKey);
    }

    if(detailMessageKey){
      translationData.push(detailMessageKey);
    }

    this.translate.get(translationData)
    .subscribe(data => {
      this.snackBar.open(
        messageKey ? data[messageKey]: '',
        detailMessageKey ? data[detailMessageKey]: '',
        {
          duration: 2000
        }
      );
    });
  }

  /**
   * Checks if two objects are equal
   * @param a First object
   * @param b Second object
   */
  isEquivalent(a, b) {
    if (a == undefined && b == undefined) {
      return true;
    }

    if (
      (a == undefined && b != undefined) ||
      (a != undefined && b == undefined)
    ) {
      return false;
    }

    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
      return false;
    }

    for (var i = 0; i < aProps.length; i++) {
      var propName = aProps[i];

      // If values of same property are not equal,
      // objects are not equivalent
      if (a[propName] !== b[propName]) {
        return false;
      }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
  }

  /**
   * Closes the business detail widget
   */
  closeDetail() {
    this.closeBusinessDetail.emit(true);
  }
}
