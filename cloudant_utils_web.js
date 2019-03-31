/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// cloudant support
'use strict';
let cloudantAuth;
let cloudantCredentials;
let noSQLCreds;
let request = require('request');
let cfenv = require('cfenv');
let fs = require('fs');

exports.authenticate = authenticate;
exports.create = create;
exports.drop = drop;
exports.insert = insert;
exports.update = update;
exports.delete = deleteItem;
exports.listAllDatabases = listAllDatabases;
exports.listAllDocuments = listAllDocuments;
exports.capabilities = capabilities;
exports.getDocs = getDocs;
exports.getOne = getOne;
exports.select = select;
exports.select2 = select2;
exports.selectMulti = selectMulti;
exports.createBackup = createBackup;
exports.restoreTable = restoreTable;
exports.getBackups = getBackups;

function getCredsFromFile(_creds) { noSQLCreds = {}; return noSQLCreds; }
function getCredsFromJSON(_creds) { noSQLCreds = {}; return noSQLCreds; }

function getDBPath() {
  let url;
  if (cfenv.getAppEnv().isLocal) { //console.log("using local database");
    cloudantCredentials = noSQLCreds.couchdb;
    url = 'http://' + cloudantCredentials.username + ':' + cloudantCredentials.password + '@' + cloudantCredentials.urlBase;
  } else { //console.log("using host database");
    cloudantCredentials = noSQLCreds.cloudant;
    url = cloudantCredentials.url + '/';
  }
  return url;
}

function authenticate(req, res, next) {
  let params = 'name=' + cloudantCredentials.username + '&password=' + cloudantCredentials.password;
  let method = 'POST';
  let url = getDBPath() + '/_session';
  request(
    {url: url, method: method, headers: {'content-type': 'application/x-www-form-urlencoded'}, form: params},
    function(error, response, body) {
      if (error) { console.log('authenticate error: ' + error); res.send({error: error}); } else { cloudantAuth = response.headers['set-cookie']; console.log('authentication succeeded: ' + response); res.send(response); }
    }
  );
}

function create(req, res, next) {
  // create a new database
  let _name = req.body.name;
  let method = 'PUT';
  let url = getDBPath() + _name;
  console.log('create: db=', _name);
  request({
    url: url,
    headers: {'set-cookie': cloudantAuth, Accept: '/'},
    method: method
  }, function(error, response, body) {
    let _body = JSON.parse(body);
    if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error != null))) {
      if ((typeof (_body.error) !== 'undefined') && (_body.error != null)) { res.send({error: _body.error}); } else { res.send({error: error}); }
    } else { res.send({success: _body}); }
  });
}

function drop(req, res, next) {
  // drop a database
  let _name = req.body.name;
  let method = 'DELETE';
  let url = getDBPath() + _name;
  let _res = res;
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) { _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}

function insert(req, res, next) {
  // iCloudant automatically creates a unique index for each entry.
  let methodName = 'insert';
  let _name = req.body.name;
  let _object = req.body.content;
  delete _object._rev;
  let _res = res;
  let method = 'POST';
  let url = getDBPath() + _name;
  console.log(methodName + ' _name: ' + _name);
  console.log(methodName + ' _object: ', _object);
  delete _object._rev;
  // console.log("insert url is "+url);
  // console.log ("insert for: "+ _name+ " with content: "+JSON.stringify(_object));
  request(
    {url: url, json: _object, method: method},
    function(error, response, body) {
      if (error) {
        console.log('error: ' + error);
        _res.send({error: error});
      } else {
        console.log('success: ' + JSON.stringify(body));
        _res.send({success: body});
      }
    }
  );
}

function update(req, res, next) {
  // insert JSON _object into database _name
  let methodName = 'update';
  let updateContent = req.body.content;
  let _name = req.body.name;
  let method = 'POST';
  let object = {}; object.name = req.body.name; object.oid = req.body.oid;
  let _res = res;
  let url = protocolToUse + '://' + req.headers.host + '/db/getOne';
  request(
    {url: url, json: object, method: method},
    function(error, response, body) {
      if (error) { console.log(methodName + ' /db/getOne error: ' + error); _res.send({error: error}); } else {
        let orig = JSON.parse(body.success);
        for (let prop in updateContent) {
          (function(_idx, _array) {
            orig[_idx] = _array[_idx];
          })(prop, updateContent);
        }
        method = 'PUT';
        url = getDBPath() + _name + '/' + object.oid;
        console.log(methodName + ' target url: ' + url);
        // console.log("update path is: "+_name+"/"+object.oid);
        request(
          {url: url, json: orig, method: method},
          function(error, response, body) {
            if (error) { console.log(methodName + ' update error: ' + error); _res.send({error: error}); } else { /*console.log("success: "+ JSON.stringify(body));*/ _res.send({success: body}); }
          }
        );
      }
    }
  );
}

function getOne(req, res, next) {
  let methodName = 'getOne';
  // select objects from database _name specified by selection criteria _selector
  let _name = req.body.name;
  let _oid = req.body.oid;
  let method = 'GET';
  let _res = res;
  let url = getDBPath() + _name + '/' + _oid;
  console.log(methodName + ' req.body: ', req.body);
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) {
        console.log(methodName + ' oid: ' + _oid + ' error: ', error);
        _res.send({error: body});
      } else {
        _res.send({success: body});
      }
    }
  );
}

function select(req, res, next) {
  // select objects from database _name specified by selection criteria _selector
  // console.log("select entered");
  let _name = req.body.name;
  let key = req.body.key;
  let view = req.body.view;
  let method = 'GET';
  let object = {selector: {idRubric: key}};
  let _res = res;
  // console.log("name: "+_name+" key: "+key+" view: "+view);
  let keySelect = ((typeof (key) === 'undefined') || (key == '')) ? '/_design/views/_view/' + view : '/_design/views/_view/' + view + '?key="' + key + '"';
  // console.log("select is ", select);
  let url = getDBPath() + _name + keySelect;
  //console.log(url);
  request(
    {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
    function(error, response, body) {
      if (error) { _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}
function select2(req, res, next) {
  // select objects from database _name specified by selection criteria _selector
  let methodName = 'select2';
  let _name = req.body.name;
  let key = req.body.key;
  let view = req.body.view;
  let method = 'POST';
  let object = {selector: {_id: {$gt: 0}, type: {$in: key}}};
  let _res = res;

  switch (req.body.selectField) {
    case 'type':
      object = {selector: {_id: {$gt: 0}, type: {$in: key}}};
      break;
    case 'organization':
      object = {selector: {_id: {$gt: 0}, organization: {$in: key}}};
      break;
  }

  console.log(methodName + ' name: ' + _name + ' key: ' + key + ' view: ' + view + ' selectField: ' + req.body.selectField);
  console.log(methodName + ' object: ', object);
  let keySelect = '';
  keySelect = '/_find';
  let url = getDBPath() + _name + keySelect;
  request(
    {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
    function(error, response, body) {
      console.log(methodName + ' url: ' + url + ' error: ', error);
      console.log(methodName + ' url: ' + url + ' body: ', body);
      if (body.error) { _res.send({error: body.error}); } else { _res.send({success: body}); }
    }
  );
}

function selectMulti(req, res, next) {
  // select objects from database _name specified by selection criteria _selector
  // console.log("selectMulti entered");
  let _name = req.body.name;
  let keyArray = req.body.key;
  let keys = '';
  for (let each = 0; each < keyArray.length; each++) {
    (function(_idx, _array) {
      keys = keys + ((_idx == 0) ? '["' + _array[_idx] + '"' : ', "' + _array[_idx] + '"');
    })(each, keyArray);
  }
  keys = keys + ']';
  // console.log("keys is ", keys);
  let view = req.body.view;
  let method = 'GET';
  let object = {keys: keyArray};
  let _res = res;
  let keySelect = '/_design/views/_view/' + view + '?key=' + keys;
  let url = getDBPath() + _name + keySelect;
  request(
    {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
    function(error, response, body) {
      if (error) {
        console.log('selectMulti error: ', error);
        console.log('selectMulti error (body): ', body);
        _res.send({error: body});
      } else { _res.send({success: body}); }
    }
  );
}
function deleteItem(req, res, next) {
  // delete object specified by _oid in database _name /$DATABASE/$DOCUMENT_ID?rev=$REV
  //_name, _oid, _rev, cbfn
  let _name = req.body.name;
  let _oid = req.body.oid;
  let _rev = req.body.rev;
  let _res = res;
  let method = 'DELETE';
  let url = getDBPath() + _name + '/' + _oid + '?rev=' + _rev;
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) { _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}
function getDocs(req, res, next) {
  let method = 'GET';
  let url = getDBPath() + req.body.name + '/_all_docs?include_docs=true';
  // console.log("getDocs path: ", url);
  let _res = res;
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) { console.log('getDocs error: ', body); _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}
function listAllDocuments(req, res, next) {
  // list all documents in database _name
  let method = 'GET';
  let url = getDBPath() + '/_all_docs';
  let _res = res;
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) { _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}

function listAllDatabases(req, res, next) {
  // list all databases
  let method = 'GET';
  let url = getDBPath() + '/_all_dbs';
  let _res = res;
  request(
    {url: url, method: method},
    function(error, response, body) {
      if (error) { _res.send({error: body}); } else { _res.send({success: body}); }
    }
  );
}

function capabilities(req, res, next) {
  let _c = {};
  _c.authenticate = 'function (): uses credentials in env.json file to authenticate to cloudant server';
  _c.create = 'function (_name): create a new database';
  _c.drop = 'function (_name): drop a database';
  _c.insert = 'function (_name, _object): insert JSON _object into database _name';
  _c.update = 'function (_name, _oid, _object): update JSON object specified by object _oid in database _name with new object _object';
  _c.select = 'function (_name, _selector): select objects from database _name specified by selection criteria _selector';
  _c.delete = 'function (_name, _oid): delete object specified by _oid in database _name';
  _c.listAllDatabases = 'function (): list all databases I can access';
  _c.listAllDocuments = 'function (_name): list all documents in database _name';
  _c.capabilities = 'return this object with descriptors.';
  _c.getMetadata = 'return the jsonObjectsPretty.json file.';
  res.send(_c);
}

function createBackup(req, res, next) {
  let _object = {};
  _object.name = (typeof (req.body.name) === 'undefined') ? '' : req.body.name;
  let _res = res;
  let method = 'POST';
  let url = protocolToUse + '://' + req.headers.host + '/db/getDocs';
  // console.log("createBackup path: ", url);
  request(
    {url: url, json: _object, method: method},
    function(error, response, body) {
      console.log('request completed for table: ' + _object.name);
      if (error) { console.log('error: ' + error); _res.send({error: error}); } else {
        //       console.log("success: response ", response);
        let fileName = process.cwd() + '/HTML/backups/' + 'Backup_';
        fileName = fileName + ((_object.name == '') ? 'allFiles' : _object.name);
        fileName = fileName + ('_' + getTimeStamp() + '.json');
        console.log('creating backup at: ', fileName);
        let rows = JSON.parse(body.success).rows;
        let _views = '"views": ['; let viewNum = 0;
        let _str = '[';
        for (let each = 0; each < rows.length; each++) {
          (function(_idx, _array) {
            if (_array[_idx].doc._id != '_design/views') {
              if (_idx > 0) { _str = _str + ', '; }
              _str = _str + JSON.stringify(_array[_idx].doc);
            } else {
              if (viewNum > 0) { _views = _views + ', '; } _views = _views + ('{ "_id": "_design/views", "views":' + JSON.stringify(_array[_idx].doc.views) + '}');
            }
          })(each, rows);
        }
        _str = _str + ']'; _views = _views + ']';
        fs.writeFileSync(fileName, '{"table" : "' + _object.name + '", "date": "' + getTimeStamp() + '", "rows": ' + _str + ', ' + _views + '}', 'utf8');
        _res.send(JSON.parse(body.success).rows);
      }
    }
  );
}
function restoreTable(req, res, next) {
  console.log('restoreTable entered for ' + req.body.name);
  let fileName = process.cwd() + '/HTML/backups/' + req.body.name;
  let restoreObject = JSON.parse(fs.readFileSync(fileName));
  console.log('starting restore for table: ' + restoreObject.table + ' created on: ' + restoreObject.date);
  // console.log("restore data: "+JSON.stringify(restoreObject.rows));
  // drop existing table
  let object = {}; object.name = restoreObject.table;
  let _res = res;
  let method = 'POST';
  let url = protocolToUse + '://' + req.headers.host + '/db/dropTable';
  request(
    {url: url, json: object, method: method},
    function(error, response, body) {
      console.log('request to drop table: ' + object.name + ' completed');
      if (error) { console.log('error: ' + error); _res.send({error: error}); } else {
        console.log('drop table: result: ' + response);
        // create new table
        let url = protocolToUse + '://' + req.headers.host + '/db/createTable';
        request(
          {url: url, json: object, method: method},
          function(error, response, body) {
            console.log('request to create table: ' + object.name + ' completed');
            if (error) { console.log('error: ' + error); _res.send({error: error}); } else {
              console.log('create table: result: ' + response);
              let url = protocolToUse + '://' + req.headers.host + '/db/insert';
              for (let each = 0; each < restoreObject.rows.length; each++) {
                console.log('[' + each + '] restoring row: ' + JSON.stringify(restoreObject.rows[each]));
                let _object = object; _object.content = restoreObject.rows[each];
                console.log('Restoring with : ', JSON.stringify(_object, null, 4));
                request(
                  {url: url, json: _object, method: method},
                  function(error, response, body) { console.log('row restored: ' + response); }
                );
              }
              for (let each = 0; each < restoreObject.views.length; each++) {
                console.log('[' + each + '] restoring row: ' + JSON.stringify(restoreObject.views[each]));
                let _object = {}; _object.name = object.name; _object.content = restoreObject.views[each];
                console.log('Restoring with : ', JSON.stringify(_object, null, 4));
                request(
                  {url: url, json: _object, method: method},
                  function(error, response, body) { console.log('view restored: ' + response); }
                );
              }
            }
          }
        );
      }
    }
  );
}
function getBackups(req, res, next) {
  let loc = process.cwd() + '/HTML/backups/';
  let files = fs.readdirSync(loc);
  console.log(files);
  res.send(files);
}
function getTimeStamp() { return (new Date(Date.now()).toISOString().replace(/:/g, '.')); }
