"use strict";

const business = require("../../domain/Business")();
const broker = require("../../tools/broker/BrokerFactory")();
const Rx = require("rxjs");
const jsonwebtoken = require("jsonwebtoken");
const jwtPublicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, "\n");

let instance;

class GraphQlService {


  constructor() {
    this.functionMap = this.generateFunctionMap();
    this.subscriptions = [];
  }

  /**
   * Starts GraphQL actions listener
   */
  start$() {
    return Rx.Observable.from(this.getSubscriptionDescriptors())
      .map(params => this.subscribeEventHandler(params));
  }

  /**
   * build a Broker listener to handle GraphQL requests procesor
   * @param {*} descriptor 
   */
  subscribeEventHandler({
    aggregateType,
    messageType,
    onErrorHandler,
    onCompleteHandler
  }) {
    const handler = this.functionMap[messageType];
    const subscription = broker
      .getMessageListener$([aggregateType], [messageType])
      //decode and verify the jwt token
      .map(message => {
        return {
          authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey),
          message
        };
      })
      //ROUTE MESSAGE TO RESOLVER
      .mergeMap(({ authToken, message }) =>
        handler.fn
          .call(handler.obj, message.data, authToken)
          .map(response => {
            return {
              response,
              correlationId: message.id,
              replyTo: message.attributes.replyTo
            };
          })
      )
      //send response back if neccesary
      .mergeMap(({ response, correlationId, replyTo }) => {        
        if (replyTo) {
          return broker.send$(
            replyTo,
            "gateway.graphql.Query.response",
            response,
            { correlationId }
          );
        } else {
          return Rx.Observable.of(undefined);
        }
      })
      .subscribe(
        msg => {
          // console.log(`GraphQlService: ${messageType} process: ${msg}`);
        },
        onErrorHandler,
        onCompleteHandler
      );
    this.subscriptions.push({
      aggregateType,
      messageType,
      handlerName: handler.fn.name,
      subscription
    });
    return {
      aggregateType,
      messageType,
      handlerName: `${handler.obj.name}.${handler.fn.name}`
    };
  }

  stop$() {
    Rx.Observable.from(this.subscriptions).map(subscription => {
      subscription.subscription.unsubscribe();
      return `Unsubscribed: aggregateType=${aggregateType}, eventType=${eventType}, handlerName=${handlerName}`;
    });
  }

  ////////////////////////////////////////////////////////////////////////////////////////
  /////////////////// CONFIG SECTION, ASSOC EVENTS AND PROCESSORS BELOW  /////////////////
  ////////////////////////////////////////////////////////////////////////////////////////


  /**
   * returns an array of broker subscriptions for listening to GraphQL requests
   */
  getSubscriptionDescriptors() {
    //default on error handler
    const onErrorHandler = error => {
      console.error("Error handling  GraphQl incoming event", error);
      process.exit(1);
    };

    //default onComplete handler
    const onCompleteHandler = () => {
      () => console.log("GraphQlService incoming event subscription completed");
    };
    console.log("GraphQl Service starting ...");

    return [
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.mutation.persistBusiness",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.mutation.updateBusinessGeneralInfo",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.mutation.updateBusinessAttributes",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.mutation.updateBusinessState",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.query.getBusinessCount",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.query.getBusiness",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "gateway.graphql.query.getBusinesses",
        onErrorHandler,
        onCompleteHandler
      }
    ];
  }

  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {    
    return {
      'gateway.graphql.mutation.persistBusiness': {
        fn: business.createBusiness$,
        obj: business
      },
      'gateway.graphql.mutation.updateBusinessGeneralInfo': {
        fn: business.updateBusinessGeneralInfo$,
        obj: business
      },
      'gateway.graphql.mutation.updateBusinessAttributes': {
        fn: business.updateBusinessAttributes$,
        obj: business
      },
      'gateway.graphql.mutation.updateBusinessState': {
        fn: business.changeBusinessState$,
        obj: business
      },
      'gateway.graphql.query.getBusinessCount': {
        fn: business.getBusinessCount$,
        obj: business
      },
      'gateway.graphql.query.getBusiness': {
        fn: business.getBusiness$,
        obj: business
      },
      'gateway.graphql.query.getBusinesses': {
        fn: business.getBusinesses$,
        obj: business
      },

      
    };
  }

}


module.exports = () => {
  if (!instance) {
    instance = new GraphQlService();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
