/* eslint-disable no-unused-vars */

/**
  * 1Q 2020 planned updates
  * Required updates (focus on architectural quality of maintainability)
  * Improve test coverage:
  *  - update tests to address both IAM and uid/pw approach
  *  - update tests to test both cloudant and couchdb in same run
  *  - update tests to test failure modes
  *   - db.env.json not present
  *   - json content invalid format
  *   - missing uid/pw credential
  *   - missing iam credential
  *   - retrieve invalid key
  *   - update invalid key/rev combo
  *   - crud without successful authentication
  *   - db create/delete without successful authentication
*/

'use strict';
let assert = require('assert');
let path = require('path');
let fs = require('fs');
let db = require('../index.js');
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backupFolder;
console.log('authJSON.backupFolder: ', authJSON.backupFolder);
let targetDB = (authJSON.useCouchDB === true ? 'CouchDB' : 'Cloudant');
let targetURL = (authJSON.useCouchDB === true ? authJSON.couchdb.url.slice(0, 7) + authJSON.couchdb.username + ':' + authJSON.couchdb.password + '@' + authJSON.couchdb.url.slice(7) : authJSON.cloudant.url);
let targetUser = (authJSON.useCouchDB === true ? authJSON.couchdb.username : authJSON.cloudant.username);
let db1 = 'test-table1';
let db2 = 'test-table2';
let record1 = {field1: {field1a: 'field1a-1 content'}, field2: 'field2 content', field3: 'joy'};
let record2 = {field1: {field1a: 'field1a-2 content'}, field2: 'field2 content', field3: 'sorrow'};
let record3 = {field1: {field1a: 'field1a-3 content'}, field2: 'field2 content', field3: 'anger'};
let rec1F2 = 'field 2 updated content';
let view1 = {_id: '_design/views',
  views: {
    byField2: {
      map: 'function(doc) {if(doc.field2){emit(doc.field2, doc);} }'
    }
  }};
let view2 = {_id: '_design/views',
  views: {
    byDualCategory: {
      map: 'function (doc) { if (doc.field2 && doc.field3) {emit([doc.field2, doc.field3], doc); } }'
    }
  }};
let backupFile = '';
let _c = {};
_c.authenticate = 'function (): uses credentials in env.json file to authenticate to couchdb or cloudant server';
before(() => {
  let _res = db.getCredsFromJSON(authJSON);
  return db.authenticate()
    .then(_auth => db.drop(db1)
      .then(_db => {
        console.log(db1 + ' was dropped prior to starting tests.');
      })
      .catch(error => {
        console.log(db1 + ' was not present prior to starting tests.');
        console.log(db1 + ' drop error: ', error);
      }))
    .then(_auth => db.drop(db2)
      .then(_db => {
        console.log(db2 + ' was dropped prior to starting tests.');
      })
      .catch(error => {
        console.log(db2 + ' was not present prior to starting tests.');
        console.log(db2 + ' drop error: ', error);
      }));
});

describe('#dbSuite get Authentication object', function() {
  describe('#getCredsFromJSON()', function() {
    it('should return same Object as supplied', function() {
      let _res = db.getCredsFromJSON(authJSON);
      let userName = (authJSON.useCouchDB === true ? _res.success.couchdb.username : _res.success.cloudant.username);
      assert.equal(targetUser, userName);
    });
  });
  describe('#getCredsFromFile()', function() {
    it('should return Object from provided file', function() {
      let _fRes = db.getCredsFromFile(envFile);
      let resUser = (authJSON.useCouchDB === true ? _fRes.success.couchdb.username : _fRes.success.cloudant.username);
      assert.equal(targetUser, resUser);
    });
  });
});

describe('#getDBPath() checking ' + targetDB + '', function() {
  //console.log('using local database');
  it('should equal the value provided for ' + targetDB + ' in env.json file', function() {
    let url = targetURL + '/';
    db.getCredsFromJSON(authJSON);
    if (authJSON.useIAM === true) {
      assert.equal('https://' + authJSON.cloudant.host + '/', db.getDBPath());
    } else {
      assert.equal(url, db.getDBPath());
    }
  });
});

describe('#authenticate() checking ' + targetDB + '', function() {
// this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should authenticate without error', function() {
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.error) === 'undefined'));
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
  it('should equal the value provided for ' + targetDB + ' in env.json file', function() {
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});
describe('#create() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should create without error', function() {
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            console.log('create response: ', _db);
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            assert.equal(true, (typeof (_db.success) !== 'undefined'));
            assert.equal(true, _db.success.ok);
          })
          .catch(error => {
            console.log('create error: ', error.error);
            assert.equal(true, (typeof (error) === 'undefined'));
          });
      });
  });
});

describe('#drop() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should drop without error', function() {
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.drop(db1)
          .then(_db => {
            console.log(db1 + ' drop response: ', _db);
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            assert.equal(true, (typeof (_db.success) !== 'undefined'));
            assert.equal(true, _db.success.ok);
          })
          .catch(error => {
            console.log(db1 + ' drop error: ', error);
            assert.equal(true, (typeof (error) === 'undefined'));
          });
      });
  });
});

describe('#insert() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
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
});

describe('#delete() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
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
                return db.deleteItem(db1, _ins1.success.id, _ins1.success.rev)
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
                  .catch(error2 => {
                    console.log('delete error: ', error2);
                    assert.equal(true, (typeof (error2) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('delete error: ', error3);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          });
      });
  });
});

describe('#getOne() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
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
});

describe('#update() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should update a single record without error', function() {
    this.timeout(15000);
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
});

describe('#select() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should retrieve a single record without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.insert(db1, record1)
              .then(_ins0 => {
                assert.equal(true, _ins0.success.ok);
                return db.insert(db1, record1)
                  .then(_ins1 => {
                    assert.equal(true, (typeof (_ins1.error) === 'undefined'));
                    assert.equal(true, (typeof (_ins1.success) !== 'undefined'));
                    assert.equal(true, _ins1.success.ok);
                    return db.insert(db1, view1)
                      .then(_view1 => {
                        assert.equal(true, _view1.success.ok);
                        return db.select(db1, record1.field2, 'byField2')
                          .then(_select => {
                            assert.equal(2, _select.success.total_rows);
                            return db.drop(db1)
                              .then(_dbd => {
                              })
                              .catch(error => {
                              });
                          })
                          .catch(error => {
                            console.log('select error: ', error);
                            assert.equal(true, (typeof (error) === 'undefined'));
                          });
                      })
                      .catch(error => {
                        console.log('insert view error: ', error);
                        assert.equal(true, (typeof (error) === 'undefined'));
                      });
                  })
                  .catch(error => {
                    console.log('insert view error: ', error);
                    assert.equal(true, (typeof (error) === 'undefined'));
                  });
              })
              .catch(error => {
                console.log('insert record error: ', error.error);
                assert.equal(true, (typeof (error) === 'undefined'));
              });
          })
          .catch(error => {
            console.log('db create error: ', error.error);
            assert.equal(true, (typeof (error) === 'undefined'));
          });
      });
  });
});

describe('#select2() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should retrieve a single and multiple records without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.insert(db1, record1)
              .then(_ins1 => {
                assert.equal(true, _ins1.success.ok);
                return db.insert(db1, record2)
                  .then(_ins2 => {
                    assert.equal(true, _ins2.success.ok);
                    return db.insert(db1, record3)
                      .then(_ins3 => {
                        assert.equal(true, _ins3.success.ok);
                        return db.insert(db1, view1)
                          .then(_view1 => {
                            assert.equal(true, _view1.success.ok);
                            let key = new Array('joy');
                            return db.select2(db1, key, 'field3')
                              .then(_select => {
                                assert.equal(1, _select.success.docs.length);
                                assert.equal(key[0], _select.success.docs[0].field3);
                                key.push('sorrow');
                                return db.select2(db1, key, 'field3')
                                  .then(_select2 => {
                                    assert.equal(2, _select2.success.docs.length);
                                    return db.drop(db1)
                                      .then(_dbd => {
                                      })
                                      .catch(error => {
                                      });
                                  })
                                  .catch(error8 => {
                                    console.log('select2 error multiple keys: ', error8);
                                    assert.equal(true, (typeof (error8) === 'undefined'));
                                  });
                              })
                              .catch(error7 => {
                                console.log('select2 error single key: ', error7);
                                assert.equal(true, (typeof (error7) === 'undefined'));
                              });
                          })
                          .catch(error6 => {
                            console.log('insert view error: ', error6);
                            assert.equal(true, (typeof (error6) === 'undefined'));
                          });
                      })
                      .catch(error5 => {
                        console.log('insert record error: ', error5);
                        assert.equal(true, (typeof (error5) === 'undefined'));
                      });
                  })
                  .catch(error4 => {
                    console.log('insert record error: ', error4);
                    assert.equal(true, (typeof (error4) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('insert record error: ', error3.error);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db create error: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#selectMulti() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should retrieve all records without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.insert(db1, record1)
              .then(_ins1 => {
                assert.equal(true, _ins1.success.ok);
                return db.insert(db1, record2)
                  .then(_ins2 => {
                    assert.equal(true, _ins2.success.ok);
                    return db.insert(db1, record3)
                      .then(_ins3 => {
                        assert.equal(true, _ins3.success.ok);
                        return db.insert(db1, view2)
                          .then(_view2 => {
                            assert.equal(true, _view2.success.ok);
                            let key = new Array();
                            key.push(record1.field2);
                            key.push(record1.field3);
                            return db.selectMulti(db1, key, 'byDualCategory')
                              .then(_select => {
                                assert.equal(1, _select.success.total_rows);
                                assert.equal(key[1], _select.success.rows[0].value.field3);
                                return db.drop(db1)
                                  .then(_dbd => {
                                  })
                                  .catch(error => {
                                  });
                              })
                              .catch(error7 => {
                                console.log('selectMulti() error: ', error7);
                                assert.equal(true, (typeof (error7) === 'undefined'));
                              });
                          })
                          .catch(error6 => {
                            console.log('insert view error: ', error6);
                            assert.equal(true, (typeof (error6) === 'undefined'));
                          });
                      })
                      .catch(error5 => {
                        console.log('insert record error: ', error5);
                        assert.equal(true, (typeof (error5) === 'undefined'));
                      });
                  })
                  .catch(error4 => {
                    console.log('insert record error: ', error4);
                    assert.equal(true, (typeof (error4) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('insert record error: ', error3.error);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db create error: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#listAllDatabases() create a list of all databases on local', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should list all tables without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.create(db2)
              .then(_db2 => {
                assert.equal(true, _db2.success.ok);
                return db.listAllDatabases()
                  .then(_select => {
                    assert.equal(2, _select.success.length);
                    // assert.equal(db1, _select.success.rows[0]);
                    return db.drop(db1)
                      .then(_dbd => {
                      })
                      .catch(error => {
                      })
                      .then(() => db.drop(db2)
                        .then(_dbd => {
                        })
                        .catch(error => {
                        }));
                  })
                  .catch(error7 => {
                    console.log('listAllDatabases error: ', error7);
                    assert.equal(true, (typeof (error7) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('db # 2 create error: ', error3.error);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db create error: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#getDocs() checking ' + targetDB + '', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should retrieve all records without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.insert(db1, record1)
              .then(_ins1 => {
                assert.equal(true, _ins1.success.ok);
                return db.insert(db1, record2)
                  .then(_ins2 => {
                    assert.equal(true, _ins2.success.ok);
                    return db.insert(db1, record3)
                      .then(_ins3 => {
                        assert.equal(true, _ins3.success.ok);
                        return db.insert(db1, view1)
                          .then(_view1 => {
                            assert.equal(true, _view1.success.ok);
                            let key = new Array('joy');
                            return db.getDocs(db1)
                              .then(_select => {
                                assert.equal(4, _select.success.total_rows);
                                return db.drop(db1)
                                  .then(_dbd => {
                                  })
                                  .catch(error => {
                                  });
                              })
                              .catch(error7 => {
                                console.log('getDocs error: ', error7);
                                assert.equal(true, (typeof (error7) === 'undefined'));
                              });
                          })
                          .catch(error6 => {
                            console.log('insert view error: ', error6);
                            assert.equal(true, (typeof (error6) === 'undefined'));
                          });
                      })
                      .catch(error5 => {
                        console.log('insert record error: ', error5);
                        assert.equal(true, (typeof (error5) === 'undefined'));
                      });
                  })
                  .catch(error4 => {
                    console.log('insert record error: ', error4);
                    assert.equal(true, (typeof (error4) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('insert record error: ', error3.error);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db create error: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#createBackup() create a list of all databases on local', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should retrieve all records without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.create(db1)
          .then(_db => {
            assert.equal(true, (typeof (_db.error) === 'undefined'));
            return db.insert(db1, record1)
              .then(_ins1 => {
                assert.equal(true, _ins1.success.ok);
                return db.insert(db1, record2)
                  .then(_ins2 => {
                    assert.equal(true, _ins2.success.ok);
                    return db.insert(db1, record3)
                      .then(_ins3 => {
                        assert.equal(true, _ins3.success.ok);
                        return db.insert(db1, view1)
                          .then(_view1 => {
                            assert.equal(true, _view1.success.ok);
                            let key = new Array('joy');
                            return db.createBackup(db1)
                              .then(_select => {
                                backupFile = _select.success.name;
                                assert.equal(3, _select.success.records);
                                assert.equal(1, _select.success.views);
                                return db.drop(db1)
                                  .then(_dbd => {
                                  })
                                  .catch(error => {
                                  });
                              })
                              .catch(error7 => {
                                console.log('getDocs error: ', error7);
                                assert.equal(true, (typeof (error7) === 'undefined'));
                              });
                          })
                          .catch(error6 => {
                            console.log('insert view error: ', error6);
                            assert.equal(true, (typeof (error6) === 'undefined'));
                          });
                      })
                      .catch(error5 => {
                        console.log('insert record error: ', error5);
                        assert.equal(true, (typeof (error5) === 'undefined'));
                      });
                  })
                  .catch(error4 => {
                    console.log('insert record error: ', error4);
                    assert.equal(true, (typeof (error4) === 'undefined'));
                  });
              })
              .catch(error3 => {
                console.log('insert record error: ', error3.error);
                assert.equal(true, (typeof (error3) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db create error: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#restoreTable() should restore a single table on local', function() {
  // this is an asynch function. need to include 'done' as part of test
  db.getCredsFromJSON(authJSON);
  it('should restore all records without error', function() {
    this.timeout(15000);
    return db.authenticate()
      .then(_auth => {
        assert.equal(true, (typeof (_auth.success) !== 'undefined'));
        return db.restoreTable(backupFile)
          .then(_restore => {
            assert.equal(db1, _restore.success.table);
            return db.restoreTable(backupFile)
              .then(_restore2 => {
                assert.equal(db1, _restore2.success.table);
                return db.drop(db1)
                  .then(_dbd => {
                  })
                  .catch(error => {
                  });
              })
              .catch(error3 => {
                console.log('db restore error with existing table: ', error3.error);
                assert.equal(true, (typeof (error2) === 'undefined'));
              });
          })
          .catch(error2 => {
            console.log('db restore error with no previous table: ', error2.error);
            assert.equal(true, (typeof (error2) === 'undefined'));
          });
      })
      .catch(error => {
        console.log('authenticate error: ', error.error);
        assert.equal(true, (typeof (error) === 'undefined'));
      });
  });
});

describe('#capabilities() should list all available capabilities', function() {
  // this is an asynch function. need to include 'done' as part of test
  it('should return a JSON object of functional capabilitieswithout error', function() {
    let _capabilities = db.capabilities();
    assert.equal(_c.authenticate, _capabilities.authenticate);
  });
});

describe('#getBackups() should list all available backups', function() {
  // this is an asynch function. need to include 'done' as part of test
  it('should return n array of files without error', function() {
    let _files = db.getBackups();
    assert.equal(typeof _files, 'object');
  });
});

// getTimeStamp
