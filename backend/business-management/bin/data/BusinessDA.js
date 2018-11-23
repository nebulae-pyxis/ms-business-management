"use strict";

let mongoDB = undefined;
const Rx = require("rxjs");
const CollectionName = "Business";
const { CustomError } = require("../tools/customError");

class BusinessDA {

  static start$(mongoDbInstance) {
    return Rx.Observable.create((observer) => {
      if (mongoDbInstance) {
        mongoDB = mongoDbInstance;
        observer.next('using given mongo instance ');
      } else {
        mongoDB = require('./MongoDB').singleton();
        observer.next('using singleton system-wide mongo instance');
      }
      observer.complete();
    });
  }

  /**
   * Gets business by id
   * @param {String} id business ID
   */
  static getBusiness$(id) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.findOne({ '_id': id }));
  }

  /**
   * Returns the amount of business that match with the given name
   * @param {String} id If the id is specified,  we dont count the business with this id
   * @param {String} businessName business name
   */
  static findBusinessName$(id, businessName) {
    const collection = mongoDB.db.collection(CollectionName);

    let filter = {};
    if (id) {
      filter = { _id: {$ne: id} }
    }
    filter['generalInfo.name'] = businessName;

    return Rx.Observable.defer(() => collection.find({ _id: {$ne: id}, 'generalInfo.name': businessName }).count());
  }

      /**
     * gets Business according to the filter
     * @param {string} type 
     */
    static getBusinessByFilter$(filterText, limit) {
      let filter = {};
      if(filterText){
          filter['$or'] = [ 
            { '_id': {$regex: filterText, $options: 'i'} }, 
            { 'generalInfo.documentId': {$regex: filterText, $options: 'i'} }, 
            { 'generalInfo.name': {$regex: filterText, $options: 'i'} } 
          ];
      }

      return Rx.Observable.create(async observer => {
          const collection = mongoDB.db.collection(CollectionName);
          const cursor = collection.find(filter);
          if (limit) {
              cursor.limit(limit);
          }

          let obj = await this.extractNextFromMongoCursor(cursor);
          while (obj) {
              observer.next(obj);
              obj = await this.extractNextFromMongoCursor(cursor);
          }

          observer.complete();
      });
    }

  /**
   * gets all the business registered on the system.
   *
   * @param {int} page Indicates the page number which will be returned
   * @param {int} count Indicates the amount of rows that will be returned
   * @param {filter} filter filter to apply to the query.
   * @param {sortColumn} sortColumn Indicates what column will be used to sort the data
   * @param {order} order Indicates if the info will be asc or desc
   */
  static getBusinesses$(page, count, filter, sortColumn, order) {
    let filterObject = {};
    const orderObject = {};
    if (filter && filter != "") {
      filterObject = {
        $or: [
          { 'generalInfo.name': { $regex: `${filter}.*`, $options: "i" } },
          { 'generalInfo.documentId': { $regex: `${filter}.*`, $options: "i" } }
        ]
      };
    }
    
    if (sortColumn && order) {
      let column = sortColumn;      
      orderObject[column] = order == 'asc' ? 1 : -1;
    }
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(()=>
      collection
        .find(filterObject)
        .sort(orderObject)
        .skip(count * page)
        .limit(count)
        .toArray()
    ).map(val => {
      return val;
    });
  }

  /**
   * Gets all businesses from the database using a iterator
   */
  getAllBusinesses$() {
    return Rx.Observable.create(async observer => {
      const collection = mongoDB.db.collection(CollectionName);
      const cursor = collection.find({});
      let obj = await this.extractNextFromMongoCursor(cursor);
      while (obj) {
        observer.next(obj);
        obj = await this.extractNextFromMongoCursor(cursor);
      }

      observer.complete();
    });
  }

  /**
   * Extracts the next value from a mongo cursor if available, returns undefined otherwise
   * @param {*} cursor
   */
  async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    if (hasNext) {
      const obj = await cursor.next();
      return obj;
    }
    return undefined;
  }

  /**
   * Gets the amount of businesses from DB
   *
   */
  static getBusinessCount$() {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.fromPromise(collection.count());
  }

  /**
   * Creates a new business
   * @param {*} business business to create
   */
  static persistBusiness$(business) {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.defer(() => collection.insertOne(business));
  }

  /**
   * modifies the general info of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessGeneralInfo  New general information of the business
   */
  static updateBusinessGeneralInfo$(id, businessGeneralInfo) {
    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: {generalInfo: businessGeneralInfo}
          },{
            returnOriginal: false
          }
        )
    ).map(result => result && result.value ? result.value : undefined);
  }

  /**
   * modifies the attributes of the indicated business 
   * @param {*} id  Business ID
   * @param {*} businessAttributes  New attributes of the business
   */
  static updateBusinessAttributes$(id, businessAttributes) {
    const collection = mongoDB.db.collection(CollectionName);

    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: id },
          {
            $set: businessAttributes
          },{
            returnOriginal: false
          }
        )
    ).map(result => result && result.value ? result.value : undefined);
  }

  /**
   * Updates the business state 
   * @param {string} id business ID
   * @param {boolean} newBusinessState boolean that indicates the new business state
   */
  static changeBusinessState$(id, newBusinessState) {
    const collection = mongoDB.db.collection(CollectionName);
    
    return Rx.Observable.defer(()=>
        collection.findOneAndUpdate(
          { _id: id},
          {
            $set: {state: newBusinessState}
          },{
            returnOriginal: false
          }
        )
    ).map(result => result && result.value ? result.value : undefined);
  }

   /**
   * Get the size of Business collection
   */
  static getBusinessCount$() {
    const collection = mongoDB.db.collection(CollectionName);
    return Rx.Observable.fromPromise(collection.count());
  }

      /**
   * Extracts the next value from a mongo cursor if available, returns undefined otherwise
   * @param {*} cursor
   */
  static async extractNextFromMongoCursor(cursor) {
    const hasNext = await cursor.hasNext();
    if (hasNext) {
      const obj = await cursor.next();
      return obj;
    }
    return undefined;
  }
}

module.exports = BusinessDA;
