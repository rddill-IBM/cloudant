'use strict';
let assert = require('assert');
let path = require('path');
let fs = require('fs');
let db = require('../index.js');
let cfenv = require('cfenv');
let envFile = path.join(__dirname, 'env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
describe('#dbSuite get Authentication object', function() {
  describe('#getCredsFromJSON()', function() {
    it('should return same Object as supplied', function() {
      assert.equal(authJSON.cloudant.username, db.getCredsFromJSON(authJSON).cloudant.username);
    });
  });
  describe('#getCredsFromFile()', function() {
    it('should return Object from provided file', function() {
      assert.equal(authJSON.cloudant.username, db.getCredsFromFile(envFile).cloudant.username);
    });
  });
});
describe('#getDBPath() checking local', function() {
  if (cfenv.getAppEnv().isLocal) {
    //console.log("using local database");

    db.getCredsFromJSON(authJSON);
    let url = 'http://' + authJSON.couchdb.username + ':' + authJSON.couchdb.password + '@' + authJSON.couchdb.urlBase;

    it('should equal the value provided for CouchDB in env.json file', function() {
      assert.equal(url, db.getDBPath());
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#authenticate() checking local', function() {
// this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should equal the value provided for CouchDB in env.json file', function() {
      console.log(db.authenticate());
      assert.equal(true, (typeof (db.authenticate().success) !== 'undefined'));
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

