import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from "@angular/core";


//////////// ANGULAR MATERIAL ///////////
import {
  MatPaginator,
  MatSort,
  Sort,
  MatTableDataSource,
  MatDialog,
  MatSnackBar
} from "@angular/material";
import { fuseAnimations } from "../../../core/animations";
//////////// RXJS ////////////

import * as Rx from "rxjs/Rx";
import { of, fromEvent, Subject } from "rxjs";
import {
  first,
  filter,
  tap,
  mergeMap,
  debounceTime,
  distinctUntilChanged,
  takeUntil
} from "rxjs/operators";
import { Subscription } from "rxjs/Subscription";

//////////// i18n ////////////
import { FuseTranslationLoaderService } from "./../../../core/services/translation-loader.service";
import { locale as english } from "./i18n/en";
import { locale as spanish } from "./i18n/es";

////////// OTHERS ///////////
import { BusinessManagementService } from "./business-management.service";
import { TranslateService } from "@ngx-translate/core";

@Component({
  // tslint:disable-next-line:component-selector
  selector: "business-management",
  templateUrl: "./business-management.component.html",
  styleUrls: ["./business-management.component.scss"],
  animations: fuseAnimations
})
export class BusinessManagementComponent implements OnInit, OnDestroy {
  private ngUnsubscribe = new Subject();
  subscriptions = [];
  //Table data
  dataSource = new MatTableDataSource();
  //Columns to show in the table
  displayedColumns = ["ID", "name", "active", "type"];

  //Table values
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild("filter") filter: ElementRef;
  @ViewChild(MatSort) sort: MatSort;
  tableSize: number;
  page = 0;
  count = 10;
  filterText = "";
  sortColumn = null;
  sortOrder = null;
  itemPerPage = "";

  selectedBusiness: any;
  businessDetailAction = "";

  constructor(
    private businessManagementervice: BusinessManagementService,
    private translationLoader: FuseTranslationLoaderService,
    private translate: TranslateService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.translationLoader.loadTranslations(english, spanish);
  }

  ngOnInit() {
    //Refresh the business table
    this.refreshDataTable(
      this.page,
      this.count,
      this.filterText,
      this.sortColumn,
      this.sortOrder
    );

    //When a new business is created, updated or deleted is neccesary to add or refresh the element in the table.
      this.businessManagementervice
        .subscribeBusinessUpdatedSubscription$()
        .pipe(
          mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
          filter((resp: any) => !resp.errors || resp.errors.length === 0),
          takeUntil(this.ngUnsubscribe)
        )
        .subscribe(result => {
          this.addAndUpdateBusinessToTable(result.data.BusinessUpdatedSubscription, false);
        });

    //Creates an observable for the filter in the table
      fromEvent(this.filter.nativeElement, "keyup")
        .pipe(
          debounceTime(150),
          distinctUntilChanged(),
          takeUntil(this.ngUnsubscribe)
        )
        .subscribe(() => {
          if (this.filter.nativeElement) {
            let filterValue = this.filter.nativeElement.value;
            filterValue = filterValue.trim();
            this.filterText = filterValue;
            this.refreshDataTable(
              this.page,
              this.count,
              filterValue,
              this.sortColumn,
              this.sortOrder
            );
          }
        });

    // Creates an observable for listen the events when the paginator of the table is modified
      this.paginator.page
      .pipe(
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(pageChanged => {
        this.page = pageChanged.pageIndex;
        this.count = pageChanged.pageSize;
        this.refreshDataTable(
          pageChanged.pageIndex,
          pageChanged.pageSize,
          this.filterText,
          this.sortColumn,
          this.sortOrder
        );
      });

      this.businessManagementervice.getBusinessCount$()
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(result => {
        this.tableSize = result.data.getBusinessCount;
      });
  }

  /**
   * Cleans the selected business and indicates business operation (ADD, UPDATE, ...)
   */
  addNewBusiness() {
    this.businessDetailAction = "ADD";
    this.selectedBusiness = {
      generalInfo: {},
      active: false
    };
  }

  /**
   * Finds the businesses and updates the table data
   * @param page page number
   * @param count Limits the number of documents in the result set
   * @param filterText Filter text
   * @param sortColumn Orders the documents by the specified column
   * @param sortOrder Orders the documents in the result set
   */
  refreshDataTable(page, count, filterText, sortColumn, sortOrder) {
    this.businessManagementervice
      .getBusinesses$(page, count, filterText, sortColumn, sortOrder)
      .pipe(
        mergeMap(resp => this.graphQlAlarmsErrorHandler$(resp)),
        filter((resp: any) => !resp.errors || resp.errors.length === 0),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(model => {
        this.dataSource.data = model.data.getBusinesses;
      });
  }

  /**
   * Receives the selected business
   * @param business selected business of the table
   */
  selectRow(business) {
    this.businessDetailAction = "EDIT";
    this.selectedBusiness = business;
  }

  /**
   * Receives an event when a business had been created
   */
  onBusinessCreated(businesCreated) {
    const temporalBusiness = businesCreated;
    this.addAndUpdateBusinessToTable(temporalBusiness, true);
  }

  /**
   * adds or updates the business passed by parameters to the table.
   * @param business business to be added to the table
   * @param {boolean} temporal boolean that indicates if the business is temporal
   * (Temporal: Confirmation of the business creation has not yet been received from the server,
   * therefore it is added to the table temporally until that the server sends us the business event).
   */
  addAndUpdateBusinessToTable(business, temporal) {
    let newData = this.dataSource.data.map(item =>
      Object.assign({}, item, { selected: false })
    );

    if (temporal) {
      newData.unshift(business);
    } else {
      let businessFound = false;
      for (var i in newData) {
        if (
          ((newData[i] as any)._id &&
            (newData[i] as any)._id == business._id) ||
          (newData[i] as any).generalInfo.name == business.generalInfo.name
        ) {
          newData[i] = business;
          businessFound = true;
          break;
        }
      }

      if (!businessFound) {
        newData.push(business);
      }
    }

    this.dataSource.data = newData;
  }

  /**
   * Cleans the selected business
   * @param event
   */
  closeBusinessDetail(event) {
    this.selectedBusiness = undefined;
  }

  /**
   * Sort the table data according to the applied filter
   * @param sort
   */
  sortData(sort: Sort) {
    if (sort.direction !== "") {
      this.sortOrder = sort.direction;

      if (sort.active == "name") {
        this.sortColumn = "generalInfo.name";
      } else if (sort.active == "ID") {
        this.sortColumn = "generalInfo.documentId";
      }
    } else {
      this.sortOrder = null;
      this.sortColumn = null;
    }

    this.refreshDataTable(
      this.page,
      this.count,
      this.filterText,
      this.sortColumn,
      this.sortOrder
    );
  }

  /**
   * Handles the Graphql errors and show a message to the user
   * @param response 
   */
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
   * Destroys and remove all the used resources  (subscriptions, ...)
   */
  ngOnDestroy() {
    if (this.subscriptions) {
      this.subscriptions.forEach(sub => {
        sub.unsubscribe();
      });
    }
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}
