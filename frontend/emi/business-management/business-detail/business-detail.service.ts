import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot
} from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import { GatewayService } from '../../../../api/gateway.service';
import {
  getBusinesses
} from '../gql/BusinessManagement';
import {
  getBusiness,
  updateBusinessGeneralInfo,
  updateBusinessAttributes,
  updateBusinessState,
  persistBusiness
} from '../gql/BusinessDetail';
import { Subscription, Subject } from 'rxjs';
// tslint:disable-next-line:import-blacklist
import * as Rx from "rxjs/Rx";
import {mergeMap, map} from 'rxjs/operators';

@Injectable()
export class BusinessDetailService {
  constructor(private http: HttpClient, private gateway: GatewayService) {}

  /**
   * gets the business detailt by its Id
   * @param id business ID
   */
  getBusinessDetail$(id): Observable<any> {
    return this.gateway.apollo
      .query<any>({
        query: getBusiness,
        variables: {
          id
        },
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      });
  }

  /**
   * Creates a new business
   * @param business business to be created
   */
  createBusinessDetail$(business): Observable<any> {
    const businessPersistInput = {
      generalInfo: {
        documentType: business.generalInfo.documentType,
        documentId: business.generalInfo.documentId,
        name: business.generalInfo.name,
        type: business.generalInfo.type,
        email: business.generalInfo.email,
        contactInfo: business.generalInfo.contactInfo
      },
      attributes: business.attributes,
      state: business.state
    };
    return this.gateway.apollo
      .mutate<any>({
        mutation: persistBusiness,
        variables: {
          input: businessPersistInput
        },
        errorPolicy: 'all'
      });
  }


  /**
   * Updates the business info
   * @param business business to be updated
   * @param generalInfoChanged value that indicates if the business general info was updated
   * @param attributesChanged value that indicates if the business attrubutes were updated
   * @param stateChanged value that indicates if the business state was changed
   */
  updateBusiness$(business, generalInfoChanged, attributesChanged, stateChanged): Observable<any> {
    const observableArray$ = [];

    if (generalInfoChanged != null) {
      observableArray$.push(this.updateBusinessGeneralInfo$(business._id, generalInfoChanged));
    }

    if (attributesChanged != null){
      observableArray$.push(this.updateBusinessAttributes$(business._id, attributesChanged));
    }

    if (stateChanged != null){
      observableArray$.push(this.updateBusinessState$(business._id, stateChanged));
    }

    return Rx.Observable.of(business)
    .pipe(
      mergeMap(val => {
        return Rx.Observable.forkJoin(...observableArray$);
      }),
      map(values => {
        const resp = {data: [], errors: []};
        let i;
        for (i = 0; i < values.length; i++) {
          if (values[i].data){
            resp.data.push(values[i].data);
          }

          if (values[i].errors){
            resp.errors.push(values[i].errors);
          }
        }
        return resp;
      })
    );
  }

  /**
   * Updates the business general info
   * @param id ID
   * @param businessGeneralInfoInput business general info to be updated
   */
  updateBusinessGeneralInfo$(id, businessGeneralInfoInput){
    return this.gateway.apollo
      .mutate<any>({
        mutation: updateBusinessGeneralInfo,
        variables: {
          id: id,
          input: businessGeneralInfoInput
        },
        errorPolicy: 'all'
      });
  }

  /**
   * Updates the business attributes
   * @param id ID
   * @param businessAttributes business attributes to be updated
   */
  updateBusinessAttributes$(id, businessAttributes){
    return this.gateway.apollo
      .mutate<any>({
        mutation: updateBusinessAttributes,
        variables: {
          id: id,
          input: businessAttributes
        },
        errorPolicy: 'all'
      });
  }

  /**
   * Updates the business status
   * @param {string} id ID
   * @param {boolean} state new state
   */
  updateBusinessState$(id, state){
    return this.gateway.apollo
      .mutate<any>({
        mutation: updateBusinessState,
        variables: {
          id: id,
          state: state
        },
        errorPolicy: 'all'
      });
  }

}
