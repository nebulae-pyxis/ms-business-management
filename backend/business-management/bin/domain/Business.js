"use strict";

const Rx = require("rxjs");
const BusinessDA = require("../data/BusinessDA");
const broker = require("../tools/broker/BrokerFactory")();
const eventSourcing = require("../tools/EventSourcing")();
const Event = require("@nebulae/event-store").Event;
const uuidv4 = require("uuid/v4");
const MATERIALIZED_VIEW_TOPIC = "materialized-view-updates";
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
   * Gets the business according to the ID passed by args.
   *
   * @param {*} args args that contain the business ID
   * @param {string} jwt JWT token
   * @param {string} fieldASTs indicates the business attributes that will be returned
   */
  getBusiness$({ args, jwt, fieldASTs }, authToken) {
    // const requestedFields = this.getProjection(fieldASTs);

    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
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

    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
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
    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
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
      !business.generalInfo.businessId ||
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
    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "createBusiness$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied"
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
                "Business name exists",
                ["business-manager"]
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
    const id = !data.args ? undefined : data.args.id;
    const generalInfo = !data.args ? undefined : data.args.input;

    if (
      !id ||
      !generalInfo ||
      !generalInfo.businessId ||
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
    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "updateBusinessGeneralInfo$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
    )
      .mergeMap(val => {
        return BusinessDA.findBusinessName$(id, generalInfo.name).mergeMap(
          count => {
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

    return this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "updateBusinessAttributes$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
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

    this.checkPermissions(
      authToken.realm_access.roles,
      "BusinessManagement",
      "changeBusinessState$()",
      BUSINESS_PERMISSION_DENIED_ERROR_CODE,
      "Permission denied",
      ["business-manager"]
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

  /**
   * Checks if the user has the permissions needed, otherwise throws an error according to the passed parameters.
   *
   * @param {*} UserRoles Roles of the authenticated user
   * @param {*} name Context name
   * @param {*} method method name
   * @param {*} errorCode  This is the error code that will be thrown if the user do not have the required roles
   * @param {*} errorMessage This is the error message that will be used if the user do not have the required roles
   * @param {*} requiredRoles Array with required roles (The authenticated user must have at least one of the required roles,
   *  otherwise the operation that the user is trying to do will be rejected.
   */
  checkPermissions(
    userRoles,
    name,
    method,
    errorCode,
    errorMessage,
    requiredRoles
  ) {
    return Rx.Observable.from(requiredRoles)
      .map(requiredRole => {
        if (
          userRoles == undefined ||
          userRoles.length == 0 ||
          !userRoles.includes(requiredRole)
        ) {
          return false;
        }
        return true;
      })
      .toArray()
      .mergeMap(validRoles => {
        //Evaluates if the user has at least one of the required roles assigned
        if (!validRoles.includes(true)) {
          return Rx.Observable.throw(
            new CustomError(name, method, errorCode, errorMessage)
          );
        } else {
          return Rx.Observable.of(validRoles);
        }
      });
  }

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

module.exports = () => {
  if (!instance) {
    instance = new Business();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
