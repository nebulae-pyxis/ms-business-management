import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import * as Rx from 'rxjs';
import { map } from 'rxjs/operators';
import { GatewayService } from '../../../api/gateway.service';
import {
  getBusinesses,
  getBusinessCount,
  subscribeBusinessUpdatedSubscription
} from './gql/BusinessManagement';

@Injectable()
export class BusinessManagementService {


  constructor(private gateway: GatewayService) {

  }

  /**
   * Get the businesses filtered
   */
  getBusinesses$(pageValue, countValue, filterText, sortColumn, sortOrder): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: getBusinesses,
        variables: {
          page: pageValue,
          count: countValue,
          filterText: filterText,
          sortColumn: sortColumn,
          sortOrder: sortOrder
        },
        fetchPolicy: "network-only",
        errorPolicy: 'all'
      });
  }

  /**
   * Returns the amount of businesses registered on the system
   */
  getBusinessCount$(): Observable<any> {
    return this.gateway.apollo
    .query<any>({
      query: getBusinessCount,
      errorPolicy: 'all'
    });
  }


/**
 * Event triggered when a business is created, updated or deleted.
 */
  subscribeBusinessUpdatedSubscription$(): Observable<any> {
  return this.gateway.apollo
    .subscribe({
      query: subscribeBusinessUpdatedSubscription
    });
  }

}
