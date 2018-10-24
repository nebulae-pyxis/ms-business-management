// TEST LIBS
const assert = require("assert");
const Rx = require("rxjs");
const uuid = require("uuid/v4");

//LIBS FOR TESTING
const BusinessDA = require("../../bin/data/BusinessDA");
const MongoDB = require("../../bin/data/MongoDB").MongoDB;

//GLOABAL VARS to use between tests
let mongoDB;
let businessUuid;

/*
NOTES:
before run please start docker-compose:
  cd deployment/compose/
  docker-compose up
*/

describe("Business Data Access", function() {
  describe("Prepare Environment", function() {
    it("instance MongoDB client", done => {
      const dbUuid = uuid();
      console.log('DB UUID ==> ', dbUuid);

      mongoDB = new MongoDB({
        url: "mongodb://localhost:27017",
        dbName: `TEST_${dbUuid}`
      });
      mongoDB
        .start$()
        .mergeMap(() => BusinessDA.start$(mongoDB))
        .subscribe(
          evt => console.log(`MongoDB start: ${evt}`),
          error => {
            console.error(`MongoDB start: ${error}`);
            return done(error);
          },
          () => {
            console.error(`MongoDB start completed`);
            return done();
          }
        );
    });
  });

  describe("Business creation", function() {
    it("create business and check", function(done) {

      businessUuid = uuid();
      console.log('Business UUID ==> ', businessUuid);

      const businessEvent = {
        et: "BusinessCreated",
        etv: 1,
        at: "Business",
        data: {
          id: businessUuid,
          generalInfo: { 
            documentId: "012345678", 
            name: "TestBusiness",
            type: "LEGAL",
            email: "esteban.zapata@nebulae.com.co",
            contactInfo: "Jaime Zapata - 3007716442"
          },
          attributes: [],
          active: false
        },
        user: "JOHNDOE",
        timestamp: 1531943220000
      };

      let respCount = 0;

      BusinessDA.persistBusiness$(businessEvent.data)
      .mergeMap(val => BusinessDA.getBusiness$(businessUuid))
      .subscribe((businessCreated) => {
          respCount++;
          assert.equal(businessCreated._id, businessUuid, "Business ID");

          assert.deepEqual(businessCreated.generalInfo, { 
            documentId: "012345678", 
            name: "TestBusiness",
            type: "LEGAL",
            email: "esteban.zapata@nebulae.com.co",
            contactInfo: "Jaime Zapata - 3007716442"
          }, "Business general info");

          assert.deepEqual(businessCreated.attributes, [], "Business attributes");

          assert.equal(businessCreated.active, false, "Business state");
        },
        error => {
          console.error(`Error creating business: ${error}`);
          return done(error);
        },
        () => {
          assert.equal(respCount, 1, "respCount missmatch");
          return done();
        }
      );
    });
  });

  describe("Business general info", function() {
    it("update business general info and check", function(done) {
      const businessEvent = {
        et: "BusinessGeneralInfoUpdated",
        etv: 1,
        at: "Business",
        data: {
          id: businessUuid,
          generalInfo: { 
            documentId: "876543210", 
            name: "businessNameUpdated",
            type: "NATURAL",
            email: "esteban@nebulae.com.co",
            contactInfo: "Esteban Gómez - 3003003030"
          },
          attributes: [],
          active: true
        },
        user: "JOHNDOE",
        timestamp: 1531943220000
      };

      let respCount = 0;

      BusinessDA.updateBusinessGeneralInfo$(businessEvent.data.id, businessEvent.data.generalInfo)
      .mergeMap(val => BusinessDA.getBusiness$(businessUuid))
      .subscribe(businessUpdated => {
          respCount++;
          //console.log('UPDATED => ', businessUpdated);
          assert.equal(businessUpdated._id, businessUuid, "Business ID");

          assert.deepEqual(businessUpdated.generalInfo, { 
            documentId: "876543210", 
            name: "businessNameUpdated",
            type: "NATURAL",
            email: "esteban@nebulae.com.co",
            contactInfo: "Esteban Gómez - 3003003030"
          }, "Business general info");

          assert.deepEqual(businessUpdated.attributes, [], "Business attributes");

          assert.equal(businessUpdated.active, false, "Business state");
        },
        error => {
          console.error(`Error updating business general info: ${error}`);
          return done(error);
        },
        () => {
          assert.equal(respCount, 1, "respCount missmatch");
          return done();
        }
      );
    });
  });

  describe("Business attributes", function() {
    it("update business attributes and check", function(done) {
      const businessEvent = {
        et: "BusinessAttributesUpdated",
        etv: 1,
        at: "Business",
        data: {
          id: businessUuid,
          attributes: [{key: 'TEST_PARAM', value: 'TEST_VALUE'}],
        },
        user: "JOHNDOE",
        timestamp: 1531943220000
      };

      let respCount = 0;

      BusinessDA.updateBusinessAttributes$(businessUuid, businessEvent.data.attributes)
      .mergeMap(val => BusinessDA.getBusiness$(businessUuid))
      .subscribe(businessUpdated => {
          respCount++;
          assert.equal(businessUpdated._id, businessUuid, "Business ID");

          assert.deepEqual(businessUpdated.generalInfo, { 
            documentId: "876543210", 
            name: "businessNameUpdated",
            type: "NATURAL",
            email: "esteban@nebulae.com.co",
            contactInfo: "Esteban Gómez - 3003003030"
          }, "Business general info");

          assert.deepEqual(businessUpdated.attributes, [{key: 'TEST_PARAM', value: 'TEST_VALUE'}], "Business attributes");
          assert.equal(businessUpdated.active, false, "Business state");
        },
        error => {
          console.error(`Error updating business attributes: ${error}`);
          return done(error);
        },
        () => {
          assert.equal(respCount, 1, "respCount missmatch");
          return done();
        }
      );
    });
  });

  describe("Business status and attributes", function() {
    it("update business status and attributes and check", function(done) {
      const businessEvent = {
        et: "BusinessAttributesUpdated",
        etv: 1,
        at: "Business",
        data: {
          id: businessUuid,
          attributes: [{key: 'TEST_PARAM1', value: 'TEST_VALUE1'}, {key: 'TEST_PARAM2', value: 'TEST_VALUE2'}],
          active: true
        },
        user: "JOHNDOE",
        timestamp: 1531943220000
      };

      let respCount = 0;

      BusinessDA.changeBusinessState$(businessUuid, businessEvent.data.active)      
      .mergeMap(val => BusinessDA.updateBusinessAttributes$(businessUuid, businessEvent.data.attributes))
      .mergeMap(val => BusinessDA.getBusiness$(businessUuid))
      .subscribe(businessUpdated => {
          respCount++;
          assert.equal(businessUpdated._id, businessUuid, "Business ID");

          assert.deepEqual(businessUpdated.generalInfo, { 
            documentId: "876543210", 
            name: "businessNameUpdated",
            type: "NATURAL",
            email: "esteban@nebulae.com.co",
            contactInfo: "Esteban Gómez - 3003003030"
          }, "Business general info");

          assert.deepEqual(businessUpdated.attributes, [{key: 'TEST_PARAM1', value: 'TEST_VALUE1'}, {key: 'TEST_PARAM2', value: 'TEST_VALUE2'}], "Business attributes");
          assert.equal(businessUpdated.active, true, "Business state");
        },
        error => {
          console.error(`Error updating business state and attributes: ${error}`);
          return done(error);
        },
        () => {
          assert.equal(respCount, 1, "respCount missmatch");
          return done();
        }
      );
    });
  });

  describe("de-prepare Envrionment", function() {
    it("stop Mongo", function(done) {
      mongoDB.stop$().subscribe(
        evt => console.log(`MongoDB stop: ${evt}`),
        error => {
          console.error(`MongoDB stop: ${error}`);
          return done(false);
        },
        () => {
          console.error(`MongoDB stop completed`);
          return done();
        }
      );
    });
  });
});
