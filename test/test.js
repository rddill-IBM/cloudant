'use strict';
let assert = require('assert');
let path = require('path');
let fs = require('fs');
let db = require('../index.js');
let cfenv = require('cfenv');
let envFile = path.join(__dirname, 'env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
let db1 = 'test-table1';
let record1 = {field1: {field1a: 'field1a content'}, field2: 'field2 content'};
let record2 = {field1: {field1a: 'field1a content'}, field2: 'field2 content'};
let rec1F2 = 'field 2 updated content';
before(() => {
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    return db.authenticate()
      .then(_auth => db.drop(db1)
        .then(_db => {
          console.log(db1 + ' was dropped prior to starting tests.');
        })
        .catch(error => {
          console.log(db1 + ' was not present prior to starting tests.');
        }));
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#dbSuite get Authentication object', function() {
  describe('#getCredsFromJSON()', function() {
    it('should return same Object as supplied', function() {
      let userName = db.getCredsFromJSON(authJSON).cloudant.username;
      assert.equal(authJSON.cloudant.username, userName);
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
    it('should authenticate without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.error) === 'undefined'));
        })
        .catch(error => {
          assert.equal(true, (typeof (error) === 'undefined'));
          console.log('authenticate error: ', error.error);
        });
    });
    it('should equal the value provided for CouchDB in env.json file', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        })
        .catch(error => {
          assert.equal(true, (typeof (error) === 'undefined'));
          console.log('authenticate error: ', error.error);
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});
describe('#create() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should create without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.create(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              assert.equal(true, (typeof (_db.success) !== 'undefined'));
              assert.equal(true, _db.success.ok);
            })
            .catch(error => {
              assert.equal(true, (typeof (error) === 'undefined'));
              console.log('create error: ', error.error);
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#drop() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should drop without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.drop(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              assert.equal(true, (typeof (_db.success) !== 'undefined'));
              assert.equal(true, _db.success.ok);
            })
            .catch(error => {
              assert.equal(true, (typeof (error) === 'undefined'));
              console.log('drop error: ', error.error);
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#insert() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should insert without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.create(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              return db.insert(db1, record1)
                .then(_ins1 => {
                  assert.equal(true, (typeof (_ins1.error) === 'undefined'));
                  assert.equal(true, (typeof (_ins1.success) !== 'undefined'));
                  assert.equal(true, _ins1.success.ok);
                  return db.drop(db1)
                    .then(_dbd => {
                    })
                    .catch(error => {
                    });
                })
                .catch(error => {
                  assert.equal(true, (typeof (error) === 'undefined'));
                  console.log('insert error: ', error.error);
                });
            })
            .catch(error => {
              assert.equal(true, (typeof (error) === 'undefined'));
              console.log('create error: ', error.error);
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#delete() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should delete without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.create(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              return db.insert(db1, record2)
                .then(_ins1 => {
                  assert.equal(true, (typeof (_ins1.error) === 'undefined'));
                  assert.equal(true, (typeof (_ins1.success) !== 'undefined'));
                  assert.equal(true, _ins1.success.ok);
                  return db._delete(db1, _ins1.success.id, _ins1.success.rev)
                    .then(_del1 => {
                      assert.equal(true, (typeof (_del1.error) === 'undefined'));
                      assert.equal(true, (typeof (_del1.success) !== 'undefined'));
                      assert.equal(true, _del1.success.ok);
                      return db.drop(db1)
                        .then(_dbd => {
                        })
                        .catch(error => {
                          console.log('db drop error during delete tests: ', error);
                        });
                    })
                    .catch(error => {
                      assert.equal(true, (typeof (error) === 'undefined'));
                      console.log('delete error: ', error.error);
                    });
                })
                .catch(error => {
                  assert.equal(true, (typeof (error) === 'undefined'));
                  console.log('delete error: ', error.error);
                });
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#getOne() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should retrieve a single record without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.create(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              return db.insert(db1, record1)
                .then(_ins1 => {
                  assert.equal(true, (typeof (_ins1.error) === 'undefined'));
                  assert.equal(true, (typeof (_ins1.success) !== 'undefined'));
                  assert.equal(true, _ins1.success.ok);
                  return db.getOne(db1, _ins1.success.id)
                    .then(dbGet1 => {
                      assert.equal(_ins1.success.id, dbGet1.success._id);
                      assert.equal(record1.field2, dbGet1.success.field2);
                      return db.drop(db1)
                        .then(_dbd => {
                        })
                        .catch(error => {
                        });
                    })
                    .catch(error => {
                      console.log('getOne error: ', error);
                      assert.equal(true, (typeof (error) === 'undefined'));
                    });
                })
                .catch(error => {
                  console.log('insert error: ', error.error);
                  assert.equal(true, (typeof (error) === 'undefined'));
                });
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

describe('#update() checking local', function() {
  // this is an asynch function. need to include 'done' as part of test
  if (cfenv.getAppEnv().isLocal) {
    db.getCredsFromJSON(authJSON);
    it('should update a single record without error', function() {
      return db.authenticate()
        .then(_auth => {
          assert.equal(true, (typeof (_auth.success) !== 'undefined'));
          return db.create(db1)
            .then(_db => {
              assert.equal(true, (typeof (_db.error) === 'undefined'));
              return db.insert(db1, record1)
                .then(_ins1 => {
                  assert.equal(true, (typeof (_ins1.error) === 'undefined'));
                  assert.equal(true, (typeof (_ins1.success) !== 'undefined'));
                  assert.equal(true, _ins1.success.ok);
                  record1.field2 = rec1F2;
                  return db.update(db1, _ins1.success.id, record1)
                    .then(dbGet1 => {
                      assert.equal(true, dbGet1.success.ok);
                      assert.equal(_ins1.success.id, dbGet1.success.id);
                      return db.drop(db1)
                        .then(_dbd => {
                        })
                        .catch(error => {
                        });
                    })
                    .catch(error => {
                      console.log('getOne error: ', error);
                      assert.equal(true, (typeof (error) === 'undefined'));
                    });
                })
                .catch(error => {
                  console.log('insert error: ', error.error);
                  assert.equal(true, (typeof (error) === 'undefined'));
                });
            });
        });
    });
  } else { assert.equal('local test not run', 'local test not run'); }
});

// select

// select2

// selectMulti

// getDocs

// listAllDocs

// listAllDatabases

// capabilities

// createBackup

// restoreTable

// getBackups

// getTimeStamp
