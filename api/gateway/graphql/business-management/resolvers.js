const withFilter = require("graphql-subscriptions").withFilter;
const PubSub = require("graphql-subscriptions").PubSub;
const pubsub = new PubSub();
const Rx = require("rxjs");
const broker = require("../../broker/BrokerFactory")();

function getReponseFromBackEnd$(response) {
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

module.exports = {
  //// QUERY ///////

  Query: {
    getBusiness(root, args, context) {
      return broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.query.getBusiness",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinesses(root, args, context) {
      return broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.query.getBusinesses",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    },
    getBusinessCount(root, args, context) {
      return broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.query.getBusinessCount",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    }
  },

  //// MUTATIONS ///////
  Mutation: {
    persistBusiness(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.mutation.persistBusiness",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessGeneralInfo(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.mutation.updateBusinessGeneralInfo",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessAttributes(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.mutation.updateBusinessAttributes",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
        .toPromise();
    },
    updateBusinessState(root, args, context) {
      return context.broker
        .forwardAndGetReply$(
          "Business",
          "gateway.graphql.mutation.updateBusinessState",
          { root, args, jwt: context.encodedToken },
          2000
        )
        .mergeMap(response => getReponseFromBackEnd$(response))
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
