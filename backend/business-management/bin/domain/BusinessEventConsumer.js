const Rx = require('rxjs');
const broker = require('../tools/broker/BrokerFactory')();
const MATERIALIZED_VIEW_TOPIC = "emi-gateway-materialized-view-updates";
const BusinessDA = require('../data/BusinessDA');

let instance;

class BusinessEventConsumer {

    constructor() {

    }

    /**
     * Persists the business on the materialized view according to the received data from the event store.
     * @param {*} businessCreatedEvent business created event
     */
    handleBusinessCreated$(businessCreatedEvent) {  
        const business = businessCreatedEvent.data;
        return BusinessDA.persistBusiness$(business)
        .mergeMap(result => {
            return broker.send$(MATERIALIZED_VIEW_TOPIC, `BusinessUpdatedSubscription`, result.ops[0])        
        });
    }

    /**
     * updates the business general info on the materialized view according to the received data from the event store.
     * @param {*} businessGeneralInfoUpdatedEvent business general info updated event
     */
    handleBusinessGeneralInfoUpdated$(businessGeneralInfoUpdatedEvent) {  
        const businessGeneralInfo = businessGeneralInfoUpdatedEvent.data;
        return BusinessDA.updateBusinessGeneralInfo$(businessGeneralInfoUpdatedEvent.aid, businessGeneralInfo)
        .mergeMap(result => {
            return broker.send$(MATERIALIZED_VIEW_TOPIC, `BusinessUpdatedSubscription`, result)        
        });
    }

    /**
     * updates the business attributes on the materialized view according to the received data from the event store.
     * @param {*} businessAttributesUpdatedEvent business attributes updated event
     */
    handleBusinessAttributesUpdated$(businessAttributesUpdatedEvent) {  
        const businessAttributes = businessAttributesUpdatedEvent.data;
        return BusinessDA.updateBusinessAttributes$(businessAttributesUpdatedEvent.aid, businessAttributes)
        .mergeMap(result => {
            return broker.send$(MATERIALIZED_VIEW_TOPIC, `BusinessUpdatedSubscription`, result)        
        });
    }

    /**
     * updates the business state on the materialized view according to the received data from the event store.
     * @param {*} businessState events that indicates the new state of the business
     */
    handleBusinessState$(businessStateEvent) {          
        return BusinessDA.changeBusinessState$(businessStateEvent.aid, businessStateEvent.data)
        .mergeMap(result => {
            return broker.send$(MATERIALIZED_VIEW_TOPIC, `BusinessUpdatedSubscription`, result)        
        });
    }

}

module.exports = () => {
    if (!instance) {
        instance = new BusinessEventConsumer();
        console.log('BusinessEventConsumer Singleton created');
    }
    return instance;
};