# Cloudant.js

Common routines to allow SQL-like access to either CouchDB or Cloudant. Requests run identically in both environments. The service requires a json object with credentials for either or both Cloudant and CouchDB. The format of the json object is: 
```JSON
{
  "cloudant": {
    "username": "your-cloudant-user-name",
    "password": "your-cloudant-password",
    "host": "cloudant-host-id",
    "port": 443,
    "url": "your-cloudant-url"
  },
  "couchdb": {
    "url": "your-couchdb-local-url",
    "urlBase": "your-couchdb-loca-url-without-http://-prefix",
    "username": "your-couchdb-username",
    "password": "your-couchdb-password"
  },
  "useCouchDB": true
}
```
The final item, useCouchDB requires either ```true``` or ```false``` as the supplied value. If useCouchDB is true then the cloudant credentials are ignored and valid credentials are required for your couchdb data base. if useCouchDB is false, then the couchdb credentials are ignored and valid credentials are required for your cloudant data base. 

This service supports the following capabilities: 
 -  authenticate = 'function (): uses credentials in env.json file to authenticate to couchdb or cloudant server';
 -  create = 'function (_name): create a new database';
-  drop = 'function (_name): drop a database';
-  insert = 'function (_name, _object): insert JSON _object into database _name';
-  update = 'function (_name, _oid, _object): update JSON object specified by object _oid in database _name with new object _object';
-  select = 'function (_name, _selector): select objects from database _name specified by selection criteria _selector';
-  select2 = 'function (_name, _keysw, _selector): select objects from database _name specified by selection criteria _selector using multiple keys as defined in keys';
-  delete = 'function (_name, _oid): delete object specified by _oid in database _name';
-  listAllDatabases = 'function (): list all databases I can access';
-  getDocs = 'function (_name): list all documents in database _name';
-  capabilities = 'return this object with descriptors.';
-  createBackup = 'function (_name): create a backup of database _name.';
-  getBackups = 'function (): get a list of available time-stamped backups.';
-  restoreTable = 'function (_file): restore database _name.';

Each service uses standard JSDOC documentation, [which is available here](./out/index.js.html)


Test results (August, 2019)
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
