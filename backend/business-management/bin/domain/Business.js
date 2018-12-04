"use strict";

const Rx = require("rxjs");
const BusinessDA = require("../data/BusinessDA");
const broker = require("../tools/broker/BrokerFactory")();
const eventSourcing = require("../tools/EventSourcing")();
const RoleValidator = require("../tools/RoleValidator");
const Event = require("@nebulae/event-store").Event;
const uuidv4 = require("uuid/v4");
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const {
  CustomError,
  DefaultError,
} = require("../tools/customError");
const {
  BUSINESS_MISSING_DATA_ERROR_CODE,
  BUSINESS_NAME_EXISTS_ERROR_CODE,
  BUSINESS_PERMISSION_DENIED_ERROR_CODE
} = require("../tools/ErrorCodes");

/**
 * Singleton instance
 */
let instance;

class Business {
  constructor() {}

 /**
   * Gets the business where the user that is performing the request belong
   *
   * @param {*} args args
   * @param {*} args.businessId business ID
   */
  getBusinessByFilter$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "getBusinessByFilter$",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
      )
      .mergeMap(roles => BusinessDA.getBusinessByFilter$(args.filterText, args.limit))          
      .toArray()
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

    /**
   * Gets the business where the user that is performing the request belong
   *
   * @param {*} args args
   * @param {*} args.businessId business ID
   */
  getMyBusiness$({ args }, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "getMyBusiness$",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["BUSINESS-OWNER", "POS", "PLATFORM-ADMIN"]
      )
      .mergeMap(roles => {
        const businessId = authToken.businessId || '';
        return BusinessDA.getBusiness$(businessId);
       })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Gets the business according to the ID passed by args.
   *
   * @param {*} args args that contain the business ID
   * @param {string} jwt JWT token
   * @param {string} fieldASTs indicates the business attributes that will be returned
   */
  getBusiness$({ args, jwt, fieldASTs }, authToken) {
    // const requestedFields = this.getProjection(fieldASTs);

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return BusinessDA.getBusiness$(args.id);
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Gets the businesses filtered by page, count, textFilter, order and column
   *
   * @param {*} args args that contain the business filters
   */
  getBusinesses$({ args }, authToken) {
    // const requestedFields = this.getProjection(fieldASTs);
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "getBusinesses$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return BusinessDA.getBusinesses$(
          args.page,
          args.count,
          args.filter,
          args.sortColumn,
          args.sortOrder
        );
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => {
        return this.handleError$(err);
      });
  }

  /**
   * Get the amount of rows from the business collection
   */
  getBusinessCount$(data, authToken) {
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "getBusinessCount$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return BusinessDA.getBusinessCount$();
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Creates a new business
   *
   * @param {*} data args that contain the business ID
   * @param {string} authToken JWT token
   */
  createBusiness$(data, authToken) {
    const business = !data.args ? undefined : data.args.input;
    if (
      !business ||
      !business.generalInfo ||
      !business.generalInfo.documentType ||
      !business.generalInfo.documentId ||
      !business.generalInfo.name ||
      !business.generalInfo.type
    ) {
      return Rx.Observable.throw(
        new CustomError(
          "BusinessManagement",
          "createBusiness$()",
          BUSINESS_MISSING_DATA_ERROR_CODE,
          "Business missing data"
        )
      );
    }

    business.generalInfo.name = business.generalInfo.name.trim();
    business._id = uuidv4();
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "createBusiness$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return BusinessDA.findBusinessName$(
          null,
          business.generalInfo.name
        ).mergeMap(count => {
          if (count > 0) {
            return Rx.Observable.throw(
              new CustomError(
                "BusinessManagement",
                "createBusiness$()",
                BUSINESS_NAME_EXISTS_ERROR_CODE,
                "Business name exists"
              )
            );
          }

          return eventSourcing.eventStore.emitEvent$(
            new Event({
              eventType: "BusinessCreated",
              eventTypeVersion: 1,
              aggregateType: "Business",
              aggregateId: business._id,
              data: business,
              user: authToken.preferred_username
            })
          );
        });
      })
      .map(result => {
        return {
          code: 200,
          message: `Business with id: ${business._id} has been created`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Updates the business general info
   *
   * @param {*} data args that contain the business ID
   * @param {string} jwt JWT token
   */
  updateBusinessGeneralInfo$(data, authToken) {

    //console.log(` ========= updateBusinessGeneralInfo$ ========= `);
    //console.log(`data=${JSON.stringify(data)}  ;;; authToken=${JSON.stringify(authToken)} `);
    

    const id = !data.args ? undefined : data.args.id;
    const generalInfo = !data.args ? undefined : data.args.input;

    if (
      !id ||
      !generalInfo ||
      !generalInfo.documentType ||
      !generalInfo.documentId ||
      !generalInfo.name ||
      !generalInfo.type
    ) {
      return Rx.Observable.throw(
        new CustomError(
          "BusinessManagement",
          "updateBusinessGeneralInfo$()",
          BUSINESS_MISSING_DATA_ERROR_CODE,
          "Business missing data"
        )
      );
    }

    //Checks if the user that is performing this actions has the needed role to execute the operation.
    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "updateBusinessGeneralInfo$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return BusinessDA.findBusinessName$(id, generalInfo.name).mergeMap(
          count => {
            if (count > 0) {
              return Rx.Observable.throw(
                new CustomError(
                  "BusinessManagement",
                  "updateBusinessGeneralInfo$()",
                  BUSINESS_NAME_EXISTS_ERROR_CODE,
                  "Business name exists"
                )
              );
            }

            return eventSourcing.eventStore.emitEvent$(
              new Event({
                eventType: "BusinessGeneralInfoUpdated",
                eventTypeVersion: 1,
                aggregateType: "Business",
                aggregateId: id,
                data: generalInfo,
                user: authToken.preferred_username
              })
            );
          }
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `Business general info with id: ${id} has been updated`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  /**
   * Updates the business attributes
   *
   * @param {*} data value that contains the business attributes to be updated
   * @param {*} authToken JWT token
   */
  updateBusinessAttributes$(data, authToken) {
    const id = !data.args ? undefined : data.args.id;
    const attributes = !data.args ? undefined : data.args.input;

    if (!id || !attributes) {
      return Rx.Observable.throw(
        new CustomError(
          "BusinessManagement",
          "updateBusinessAttributes$()",
          BUSINESS_MISSING_DATA_ERROR_CODE,
          "Business missing data"
        )
      );
    }

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "updateBusinessAttributes$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: "BusinessAttributesUpdated",
            eventTypeVersion: 1,
            aggregateType: "Business",
            aggregateId: id,
            data: attributes,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `Business attributes with id: ${id} has been updated`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  
  /**
   * Updates the business state
   *
   * @param {*} data args that contain the business ID and the new state
   * @param {string} authToken JWT token
   */
  changeBusinessState$(data, authToken) {
    const id = !data.args ? undefined : data.args.id;
    const newState = !data.args ? undefined : data.args.state;
    if (!id || newState == null) {
      return Rx.Observable.throw(
        new CustomError(
          "BusinessManagement",
          "changeBusinessState$()",
          BUSINESS_MISSING_DATA_ERROR_CODE,
          "Business missing data"
        )
      );
    }

    return RoleValidator.checkPermissions$(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["PLATFORM-ADMIN"]
    )
      .mergeMap(val => {
        return eventSourcing.eventStore.emitEvent$(
          new Event({
            eventType: newState ? "BusinessActivated" : "BusinessDeactivated",
            eventTypeVersion: 1,
            aggregateType: "Business",
            aggregateId: id,
            data: newState,
            user: authToken.preferred_username
          })
        );
      })
      .map(result => {
        return {
          code: 200,
          message: `Business status with id: ${id} has been updated`
        };
      })
      .mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse))
      .catch(err => this.handleError$(err));
  }

  //#region  mappers for API responses

  handleError$(err) {
    return Rx.Observable.of(err).map(err => {
      const exception = { data: null, result: {} };
      const isCustomError = err instanceof CustomError;
      if (!isCustomError) {
        err = new DefaultError(err);
      }
      exception.result = {
        code: err.code,
        error: { ...err.getContent() }
      };
      return exception;
    });
  }

  buildSuccessResponse$(rawRespponse) {
    return Rx.Observable.of(rawRespponse).map(resp => {
      return {
        data: resp,
        result: {
          code: 200
        }
      };
    });
  }

  //#endregion
}

/**
 * @returns {Business}
 */
module.exports = () => {
  if (!instance) {
    instance = new Business();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
