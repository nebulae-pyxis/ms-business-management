const { CustomError } = require("../../tools/customError");
const RoleValidator  = require("../../tools/RoleValidator");
const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const broker = require("../../broker/BrokerFactory")();
const contextName = "Business-Management";
const Rx = require("rxjs");

//Every single error code
// please use the prefix assigned to this microservice
const INTERNAL_SERVER_ERROR_CODE = 15001;
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
 * Handles errors
 * @param {*} err
 * @param {*} operationName
 */
function handleError$(err, methodName) {
  return Rx.Observable.of(err).map(err => {
    const exception = { data: null, result: {} };
    const isCustomError = err instanceof CustomError;
    if (!isCustomError) {
      err = new CustomError(err.name, methodName, INTERNAL_SERVER_ERROR_CODE, err.message);
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
    getBusinessByFilterText(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusinessByFilterText",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.query.getBusinessByFilterText",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "getBusinessByFilterText"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    myBusiness(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "myBusiness",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["BUSINESS-OWNER", "PLATFORM-ADMIN", "POS"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.query.myBusiness",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "myBusiness"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
  },
    getBusiness(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusiness",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.query.getBusiness",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "getBusiness"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinesses(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusinesses",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.query.getBusinesses",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "getBusinesses"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinessCount(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "getBusinessCount",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.query.getBusinessCount",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "getBusinessCount"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
  },

  //// MUTATIONS ///////
  Mutation: {
    persistBusiness(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "persistBusiness",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.mutation.persistBusiness",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "persistBusiness"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessGeneralInfo(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessGeneralInfo",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.mutation.updateBusinessGeneralInfo",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "updateBusinessGeneralInfo"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessAttributes(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessAttributes",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.mutation.updateBusinessAttributes",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "updateBusinessAttributes"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessState(root, args, context) {
      return RoleValidator.checkPermissions$(
        context.authToken.realm_access.roles,
        contextName,
        "updateBusinessAttributes",
        BUSINESS_PERMISSION_DENIED_ERROR_CODE,
        "Permission denied",
        ["PLATFORM-ADMIN"]
      )
        .mergeMap(response => {
          return context.broker.forwardAndGetReply$(
            "Business",
            "emigateway.graphql.mutation.updateBusinessState",
            { root, args, jwt: context.encodedToken },
            2000
          );
        })
        .catch(err => handleError$(err, "updateBusinessState"))
        .mergeMap(response => getResponseFromBackEnd$(response))
        .toPromise();
    }
    
  },

  //// SUBSCRIPTIONS ///////
  Subscription: {
    BusinessUpdatedSubscription: {
      subscribe: withFilter(
        (payload, variables, context, info) => {
          //Checks the roles of the user, if the user does not have at least one of the required roles, an error will be thrown
          RoleValidator.checkAndThrowError(
            context.authToken.realm_access.roles, 
            ["PLATFORM-ADMIN"], 
            contextName, 
            "BusinessUpdatedSubscription", 
            BUSINESS_PERMISSION_DENIED_ERROR_CODE, 
            "Permission denied");

          return pubsub.asyncIterator("BusinessUpdatedSubscription");  
        },
        (payload, variables, context, info) => {          
          return true;
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
