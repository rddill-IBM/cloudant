# Cloudant.js

Common routines to allow SQL-like access to either CouchDB or Cloudant. Requests run identically in both environments. The service requires a json object with credentials for either or both Cloudant and CouchDB. 

 - V1.06 adds error processing for situations when the target DBM is not available. 
 - V1.07 updates test script to support change in select2 return
 - V1.08 adds support for IBM IAM authentication. This introduces additional elements to the cloudant object in the json input and also adds an additional element at the end of the sequence (useIAM) with is either true or not. Since IAM is only (currently) applicable to Cloudant, there is no attempt to support it for CouchDB. If useIAM === true, then any values for cloudant username and password are ignored. Likewise, if useIAM !=== true, then any values for the cloudant IAM section are ignored. 

## The format of the json object is: 
```JSON
{
  "cloudant": {
    "apikey": "your IAM api key",
    "host": "your IAM host name",
    "iam_apikey_description": "API Key description",
    "iam_apikey_name": "IAM APIKey name",
    "iam_role_crn": "IAM role",
    "iam_serviceid_crn": "IBM Service ID",
    "username": "your-cloudant-user-name",
    "password": "your-cloudant-password",
    "port": 443,
    "urlBase": "your-cloudant-url-without-http[s]://-prefix",
    "url": "your-cloudant-url"
  },
  "couchdb": {
    "url": "your-couchdb-local-url",
    "urlBase": "your-couchdb-local-url-without-http://-prefix",
    "username": "your-couchdb-username",
    "password": "your-couchdb-password"
  },
  "useCouchDB": true,
  "useIAM": true,
  "backupFolder": "/HTML/backups"
}
```
The item, useCouchDB requires either ```true``` or ```false``` as the supplied value. If useCouchDB is true then the cloudant credentials are ignored and valid credentials are required for your couchdb data base. if useCouchDB is false, then the couchdb credentials are ignored and valid credentials are required for your cloudant data base. 

If you choose to use the backup and restore option, it is recommended that you provide a valid value for the ```backupFolder``` option. This will ensure that your backups are sent to the correct location. 

## This service supports the following capabilities: 
  -  **getCredsFromFile** = 'function (_file): ingests credentials from file at provided absolute path.';
  -  **getCredsFromJSON** = 'function (JSON): ingest credentials from provided JSON object.';
  -  **authenticate** = 'function (): uses credentials ingested via one of the setCreds services to authenticate to couchdb or cloudant server';
  -  **create** = 'function (_name): create a new database';
  -  **drop** = 'function (_name): drop a database';
  -  **insert** = 'function (_name, _object): insert JSON _object into database _name';
  -  **update** = 'function (_name, _oid, _object): update JSON object specified by object _oid in database _name with new object _object';
  -  **select** = 'function (_name, _selector): select objects from database _name specified by selection criteria _selector';
  -  **select2** = 'function (_name, _keysw, _selector): select objects from database _name specified by selection criteria _selector using multiple keys as defined in keys';
  -  **_delete** = 'function (_name, _oid): delete object specified by _oid in database _name';
  -  **listAllDatabases** = 'function (): list all databases I can access';
  -  **getDocs** = 'function (_name): list all documents in database _name';
  -  **capabilities** = 'return this object with descriptors.';
  -  **createBackup** = 'function (_name): create a backup of database _name.';
  -  **getBackups** = 'function (): get a list of available time-stamped backups.';
  -  **restoreTable** = 'function (_file): restore database _name.';

Each service uses standard JSDOC documentation, [which is available here](./out/index.js.html)

Where authentication is required in the following examples, the complete authentication process is shown. When using these services in an on-going basis, providing credentials and then performing authentication is only required once; it does not have to be done each time a service request has been made. The cloudant module preserves the result of the last authentication action and uses that result in subsequent service execution. 

## Authentication Services:
### getCredsFromFile
```js
// in this example, credentials are held in a file called db.env.json which is in the root folder of the calling function.
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
// ingest the credentials
let _fRes = db.getCredsFromFile(envFile);
```
on Success, returns JSON object with credentials for selected data base
on Failure, returns JSON object with two elements:
 - errorMessage: text string
 - error: error object

### getCredsFromJSON
```js
// in this example, credentials are held in a file called db.env.json which is in the root folder of the calling function.
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
```
on Success, returns JSON object with credentials for selected data base
on Failure, returns JSON object with two elements:
 - errorMessage: text string
 - error: error object

### authenticate
```js
// in this example, credentials are held in a file called db.env.json which is in the root folder of the calling function.
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
let _auth = db.authenticate();
```
on Success, returns response object from database authenticate action
on Failure, returns JSON object with one of three error elements:
 - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
 - errorMessage: if body.error exists, then returns text string with body.error + body.reason
 - error: if body.error does not exist, then returns error object

## Database Management Services:
### create
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.create(db1)
      .then(_db => {
        console.log('create successful: ', _db_);
        // Your code to process once creation complete goes here
      })
      .catch(error => {
        console.log('create error: ', error.error);
      });
  });
```
on Success, returns JSON object with body object from create operation
 - {success: (complete response object)}
on create Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}
on JSON Parse Failure, returns JSON object with one element:
 - {error: JSON error object}

### drop
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
  return db.authenticate()
    .then(_auth => {
      return db.drop(db1)
        .then(_db => {
          // insert your code here for successful completion
        })
        .catch(error => {
          console.log('drop error: ', error.error);
        });
    });
```
on Success, returns JSON object with body object from drop operation:
 - {success: { success: { ok: true } }}
on create Failure, returns JSON object:
 - {errorMessage: text string}
on JSON Parse Failure, returns JSON object with one element:
 - {error: JSON error object}

### listAllDatabases
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.listAllDatabases()
      .then(_select => {
        // process the returned list of data bases
        // check the _select.success object for details
      })
      .catch(error => {
          console.log('listAllDatabases error: ', error.error);
        });

  )};
```
on Success, returns JSON object with following object from operation:
 - {success: {rows: [array of table names], total_rows: (# of rows in array)}
on create Failure, returns JSON object:
 - {errorMessage: text string}
on JSON Parse Failure, returns JSON object with one element:
 - {error: JSON error object}

## Backup and Restore Services: 
### createBackup
```js
// get the path node module
let path = require('path');
let db = require('rddill/cloudant');
let fs = require('fs');
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.createBackup(db1)
      .then(_select => {
        backupFile = _select.success.name;
        let _backup = _select.success
        // actually create the backup file on your local system...
        // the following example creates a backup in your defined backup folder location
        // separating the view content from the data content
        // This should be treated as a working EXAMPLE and modified accordingly for your own purposes.
        let fileName = authJSON.backupFolder + 'Backup_';
        fileName += (_backup.name == "") ? "allFiles" : backupFile;
        fileName +="_"+getTimeStamp()+".json";
        console.log("creating backup at: ", fileName);
        let rows = JSON.parse(_backup).row;
        let _views = '"views": ['; var viewNum = 0;
        let _str = "[";
        for (let each = 0; each < rows.length; each++)
        {(function(_idx, _array)
          {
            if(_array[_idx].doc._id != '_design/views')
            { if(_idx>0){_str+=", ";}
              _str+=JSON.stringify(_array[_idx].doc); 
            }
            else {
              if(viewNum>0){_views+=", ";} _views += '{ "_id": "_design/views", "views":' +JSON.stringify(_array[_idx].doc.views)+'}';
            }
          })(each, rows)}
        _str+="]"; _views += "]";
        fs.writeFileSync(fileName, '{"table" : "'+_backup.name+'", "date": "'+getTimeStamp()+'", "rows": '+_str+', '+_views+'}', 'utf8');
      })
      .catch(error => {
          console.log('create Backup File error: ', error.error);
        });
  getTimeStamp: function() { return (new Date(Date.now()).toISOString().replace(/:/g, '.')); }
```
### getBackups
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.getBackups()
      .then(_select => {
        // process the returned list of data bases
        // check the _select.success object for details
      })
      .catch(error => {
          console.log('getBackups error: ', error.error);
        });
```
on Success, returns JSON object with following object from operation:
 - {success: files }
on Failure, returns JSON object:
 - {error: error}

### restoreTable
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
let backupFileName = 'testBackupfile.json';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.restoreTable(backupFile)
      .then(_restore => {
        // perform appropriate post-processing and logging here
      })
      .catch(error => {
          console.log('restoreTable error: ', error.error);
        });
```
on Success, returns JSON object with following object from operation:
 - {success: {table: _table, records: records, views: views}}
 - The records object and the views object list each record and view inserted using either a success object (e.g. successfully inserted), or a failure object (unsuccessful insert):
   - {success: {id: _object._id, success: _res}}
   - {error: {id: _object.id, error: _err}}
on table create Failure, returns JSON object:
 - {error: error}

## Data Manipulation Services: 
### _delete
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    // delete processing requires that both the oid (object id) and current revision number of the record to be deleted be known before a record can be deleted. The best way to guarantee that this information is correct is to get the record prior to deleting it and then immediately deleting the record. 
    // This exercise is left up to the reader. 
    let oid = 'xyz';
    let rev = 'abc';
    return db._delete(db1, _ins1.success.id, _ins1.success.rev)
      .then(_del1 => {
        // perform appropriate post processing here
      })
      .catch(error => {
        console.log('db drop error: ', error);
      });
  });
```
on Success, returns JSON object with body object from operation:
 - {success: { ok: true,
     id: (text string with oid of deleted document),
     rev: (text string with rev of deleted document) }}
on delete Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}
on JSON Parse Failure, returns JSON object with one element:
 - {error: JSON error object}

### insert
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    let record1 = {field1: 'yada yada', field2 {subf1: 'sub field 1', subf2: 'sub field 2'}};
    return db.insert(db1, record1)
      .then(_ins1 => {
        // perform appropriate post insertion actions and logging here
      })
      .catch(error => {
        console.log('db insert error: ', error);
      });
  });
```
on Success, returns JSON object with body object from operation:
 - {success: { ok: true,
     id: (text string with oid of inserted document),
     rev: (text string with rev of inserted document) }}
on insert Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}

### update
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    // update processing requires that the oid (object id) be known before a record can be updated. 
    // This exercise is left up to the reader. 
    let oid = 'xyz';
    let rev = 'abc';
    let record1 = {field1: 'yada yada updated', field2 {subf1: 'sub field 1', subf2: 'sub field 2'}};
    return db.update(db1, oid, record1)
    .then(_update => {
      // perform appropriate update and logging post processing here
    })
    .catch(error => {
      console.log('db insert error: ', error);
    });
  });
```
on Success, returns JSON object with body object from operation:
 - {success: { ok: true,
     id: (text string with oid of inserted document),
     rev: (text string with rev of inserted document) }}
on insert Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}
on get Failure (e.g. record to update does not exist), returns JSON object:
 - {error: Error object}

### select
```js
// select processing is analogous to SQL SELECT WHERE FIELD1 = "SOME CONTENT"
// in a no-sql database like couchdb or cloudant, this requires that the field be specified
// and that a "view" has been created which allows selection on that field. 
// In this sample code, that view is located in the database named in the 'db1' variable
// the search criteria is held in the 'field2' variable. The name of these variables have no
// bearing on how the selection process actually works. 
// That is managed in the view created in the database. 
// an example of a view which will select and return information based on the contents of 
// a stored JSON variable called 'field2' follows: 
// {_id: '_design/views',
//   views: {
//     byField2: {
//       map: 'function(doc) {if(doc.field2){emit(doc.field2, doc);} }'
//     }
//   }}

// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    let field2 = 'some content on which to select';
    return db.select(db1, field2, 'byField2')
    .then(_dbRes => {
      // post select and logging processing goes here.
    })
    .catch(error => {
      console.log('db insert error: ', error);
    });
```
on Success, returns JSON object with body object from operation:
 - {success: { total_rows: (number of rows in response), offset: 0, rows: [ array of documents comprising result set ] }}
on select Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}

### select2
```js
// select2 processing is analogous to SQL SELECT WHERE FIELD1 = "A" OR "B" OR "C"
// in a no-sql database like couchdb or cloudant, this requires that the field be specified
// the following code will select documents if 'field3' contains either the word 'joy'
// or the word 'sorrow'

// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    let key = new Array('joy');
    key.push('sorrow');
    return db.select2(db1, key, 'field3')
    .then(_dbRes => {
      // post select and logging processing goes here.
    })
    .catch(error => {
      console.log('db select2 error: ', error);
    });
  });
```
on Success, returns JSON object with body object from operation:
 - {success: { rows: [ array of documents comprising result set ] }}
on insert Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}

### selectMulti
```js
// selectMulti processing is analogous to SQL SELECT WHERE FIELD1 = "A" AND FIELD2 = "B"
// in a no-sql database like couchdb or cloudant, this requires that both fields be specified
// and that an appropriate view has been specified to support multi-selection.
// The following view is used to support this kind of query
// {_id: '_design/views',
//   views: {
//     byDualCategory: {
//       map: 'function (doc) { if (doc.field2 && doc.field3) {emit([doc.field2, doc.field3], doc); } }'
//     }
//   }
// This view expects to be passed an array with the value for 'field2' in array position 0
// and the value for 'field3' in array position 1

// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    let key = new Array('joy');
    key.push('sorrow');
    return db.selectMulti(db1, key, 'byDualCategory')
    .then(_dbRes => {
      // post select and logging processing goes here.
    })
    .catch(error => {
      console.log('db selectMulti error: ', error);
    });
  });
```
on Success, returns JSON object with body object from operation:
 - {success: { total_rows: (number of rows in response), offset: 0, rows: [ array of documents comprising result set ] }} 
on select2 Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}

### getDocs
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant)
let db1 = 'test-table1';
// create a path to the local file (db.env.json)
let envFile = path.join(__dirname, 'db.env.json');
let authJSON = JSON.parse(fs.readFileSync(envFile));
authJSON.backupFolder = process.cwd() + authJSON.backups;
// ingest the credentials
let _fRes = db.getCredsFromJSON(authJSON);
return db.authenticate()
  .then(_auth => {
    return db.getDocs(db1)
    .then(_dbRes => {
      // post getDocs and logging processing goes here.
    })
    .catch(error => {
      console.log('db insert error: ', error);
    });
```
on Success, returns JSON object with body object from operation:
 - {success: {rows: [array of document objects], total_rows: (# of rows in array)}}
on getDocs Failure, returns JSON object:
 - {errorMessage: text string}
 - {error: Error object}

## About this service:
### capabilities
```js
// get the path node module
let path = require('path');
let db = require(rddill/cloudant);
let _capabilities = db.capabilities();
```
on Success, returns JSON object with each operation as a key and the value of each operation a short description of each service

## Test results (August, 2019)
```
npm test

> couch-cloudant@1.0.0 test /Users/rddill/Documents/github/cloudant
> nyc --reporter=html mocha --recursive

test-table1 was dropped prior to starting tests.
test-table2 was not present prior to starting tests.
  #dbSuite get Authentication object
    #getCredsFromJSON()
      ✓ should return same Object as supplied
    #getCredsFromFile()
      ✓ should return Object from provided file

  #getDBPath() checking Cloudant
    ✓ should equal the value provided for Cloudant in env.json file

  #authenticate() checking Cloudant
    ✓ should authenticate without error (187ms)
    ✓ should equal the value provided for Cloudant in env.json file (202ms)

  #create() checking Cloudant
    ✓ should create without error (352ms)

  #drop() checking Cloudant
    ✓ should drop without error (370ms)

  #insert() checking Cloudant
    ✓ should insert without error (824ms)

  #delete() checking Cloudant
    ✓ should delete without error (982ms)

  #getOne() checking Cloudant
    ✓ should retrieve a single record without error (1008ms)

  #update() checking Cloudant
    ✓ should update a single record without error (1175ms)

  #select() checking Cloudant
    ✓ should retrieve a single record without error (1317ms)

  #select2() checking Cloudant
    ✓ should retrieve a single and multiple records without error (1767ms)

  #selectMulti() checking Cloudant
    ✓ should retrieve all records without error (1514ms)

  #listAllDatabases() create a list of all databases on local
    ✓ should list all tables without error (1137ms)

  #getDocs() checking Cloudant
    ✓ should retrieve all records without error (1507ms)

  #createBackup() create a list of all databases on local
    ✓ should retrieve all records without error (1525ms)

  #restoreTable() should restore a single table on local
success!
    ✓ should restore all records without error (1058ms)

  #capabilities() should list all available capabilities
    ✓ should return a JSON object of functional capabilitieswithout error

  #getBackups() should list all available backups
    ✓ should return n array of files without error


  20 passing (16s)
```
