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
      .mergeMap(message => this.verifyRequest$(message))
      .mergeMap(request => (request.failedValidations.length > 0)
        ? Rx.Observable.of(request.errorResponse)
        : Rx.Observable.of(request)
          //ROUTE MESSAGE TO RESOLVER
          .mergeMap(({ authToken, message }) =>
            handler.fn
              .call(handler.obj, message.data, authToken)
              .map(response => ({ response, correlationId: message.id, replyTo: message.attributes.replyTo }))
          )
      )
      .mergeMap(msg => this.sendResponseBack$(msg))
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

  /**
  * send response back if neccesary
  * @param {any} msg Object with data necessary  to send response
  */
  sendResponseBack$(msg) {
    return Rx.Observable.of(msg)
      .mergeMap(({ response, correlationId, replyTo }) =>
        replyTo
          ? broker.send$(replyTo, "gateway.graphql.Query.response", response, { correlationId })
          : Rx.Observable.of(undefined)
      );
  }

  /**
   * Verify the message if the request is valid.
   * @param {any} request request message
   * @returns { Rx.Observable< []{request: any, failedValidations: [] }>}  Observable object that containg the original request and the failed validations
   */
  verifyRequest$(request) {
    return Rx.Observable.of(request)
      //decode and verify the jwt token
      .mergeMap(message =>
        Rx.Observable.of(message)
          .map(message => ({ authToken: jsonwebtoken.verify(message.data.jwt, jwtPublicKey), message, failedValidations: [] }))
          .catch(err =>
            business.handleError$(err)
              .map(response => ({
                errorResponse: { response, correlationId: message.id, replyTo: message.attributes.replyTo },
                failedValidations: ['JWT']
              }
              ))
          )
      )
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
        messageType: "emigateway.graphql.mutation.persistBusiness",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.mutation.updateBusinessGeneralInfo",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.mutation.updateBusinessAttributes",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.mutation.updateBusinessState",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getBusinessCount",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getBusiness",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getBusinesses",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.getBusinessByFilterText",
        onErrorHandler,
        onCompleteHandler
      },
      {
        aggregateType: "Business",
        messageType: "emigateway.graphql.query.myBusiness",
        onErrorHandler,
        onCompleteHandler
      },
    ];
  }

  /**
   * returns a map that assocs GraphQL request with its processor
   */
  generateFunctionMap() {
    return {
      'emigateway.graphql.mutation.persistBusiness': {
        fn: business.createBusiness$,
        obj: business
      },
      'emigateway.graphql.mutation.updateBusinessGeneralInfo': {
        fn: business.updateBusinessGeneralInfo$,
        obj: business
      },
      'emigateway.graphql.mutation.updateBusinessAttributes': {
        fn: business.updateBusinessAttributes$,
        obj: business
      },
      'emigateway.graphql.mutation.updateBusinessState': {
        fn: business.changeBusinessState$,
        obj: business
      },
      'emigateway.graphql.query.getBusinessCount': {
        fn: business.getBusinessCount$,
        obj: business
      },
      'emigateway.graphql.query.getBusiness': {
        fn: business.getBusiness$,
        obj: business
      },
      'emigateway.graphql.query.getBusinesses': {
        fn: business.getBusinesses$,
        obj: business
      },
      "emigateway.graphql.query.getBusinessByFilterText": {
        fn: business.getBusinessByFilter$,
        obj: business
      },
      "emigateway.graphql.query.myBusiness": {
        fn: business.getMyBusiness$,
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
