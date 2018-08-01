const { CustomError, DefaultError } = require("../../tools/customError");
const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const broker = require("../../broker/BrokerFactory")();
const contextName = "Business-Management";
const Rx = require("rxjs");

//Every single error code
// please use the prefix assigned to this microservice
const BUSINESS_PERMISSION_DENIED_ERROR_CODE = 15002;

function getResponseFromBackEnd$(response) {
  return Rx.Observable.of(response).map(resp => {
    if (resp.result.code != 200) {
      const err = new Error();
      err.name = "Error";
      err.message = resp.result.error;
      Error.captureStackTrace(err, "Error");

      throw err;
    }
    return resp.data;
  });
}

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
function checkPermissions$(
  userRoles,
  contextName,
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
      if (!validRoles.includes(true)) {
        return Rx.Observable.throw(
          new CustomError(contextName, method, errorCode, errorMessage)
        );
      } else {
        return Rx.Observable.of(validRoles);
      }
    });
}

/**
 * Returns true if the user has at least one of the required roles
 * @param {*} userRoles Roles of the user
 * @param {*} requiredRoles Required roles
 */
function hasPermissions(
  userRoles,
  requiredRoles
) {
  if(!requiredRoles){
    return true;
  }

  if (userRoles == undefined || userRoles.length == 0) {
    return false;
  }

  let found = false;
  for (const requiredRole in requiredRoles) {
    
    if (userRoles.includes(requiredRoles[requiredRole])) {
      found = true;
      break;
    }
  }

  return found;
}

/**
 * Handles errors
 * @param {*} err
 * @param {*} operationName
 */
function handleError$(err) {
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

module.exports = {
  //// QUERY ///////

  Query: {
    getBusiness(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusiness",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.query.getBusiness",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinesses(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusinesses",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.query.getBusinesses",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinessCount(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusinessCount",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.query.getBusinessCount",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
  },

  //// MUTATIONS ///////
  Mutation: {
    persistBusiness(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "persistBusiness",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.mutation.persistBusiness",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessGeneralInfo(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessGeneralInfo",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.mutation.updateBusinessGeneralInfo",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessAttributes(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessAttributes",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.mutation.updateBusinessAttributes",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessState(root, args, context) {
      return checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessAttributes",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["business-manager"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "gateway.graphql.mutation.updateBusinessState",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
  },

  //// SUBSCRIPTIONS ///////
  Subscription: {
    BusinessUpdatedSubscription: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          return pubsub.asyncIterator("BusinessUpdatedSubscription");
        },
        (payload, variables, context, info) => {
          // This event can only be sent to users with business manager role.
          return hasPermissions(context.authToken.realm_access.roles,  ["business-manager"]);
        }
      )
    }
  }
};

//// SUBSCRIPTIONS SOURCES ////
const eventDescriptors = [
  {
    backendEventName: "BusinessUpdatedSubscription",
    gqlSubscriptionName: "BusinessUpdatedSubscription",
    dataExtractor: evt => evt.data, // OPTIONAL, only use if needed
    onError: (error, descriptor) =>
      console.log(`Error processing ${descriptor.backendEventName}`), // OPTIONAL, only use if needed
    onEvent: (evt, descriptor) =>
      console.log(`Event of type  ${descriptor.backendEventName} arraived`) // OPTIONAL, only use if needed
  }
];

/**
 * Connects every backend event to the right GQL subscription
 */
eventDescriptors.forEach(descriptor => {
  broker.getMaterializedViewsUpdates$([descriptor.backendEventName]).subscribe(
    evt => {
      if (descriptor.onEvent) {
        descriptor.onEvent(evt, descriptor);
      }
      const payload = {};
      payload[descriptor.gqlSubscriptionName] = descriptor.dataExtractor
        ? descriptor.dataExtractor(evt)
        : evt.data;
      pubsub.publish(descriptor.gqlSubscriptionName, payload);
    },

    error => {
      if (descriptor.onError) {
        descriptor.onError(error, descriptor);
      }
      console.error(`Error listening ${descriptor.gqlSubscriptionName}`, error);
    },

    () => console.log(`${descriptor.gqlSubscriptionName} listener STOPED`)
  );
});
