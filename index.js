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

let request = require('request');
let cfenv = require('cfenv');
let fs = require('fs');
let path = require('path');

let RDDnoSQL = {
  cloudantAuth: {},
  noSQLCreds: {},
  cloudantCredentials: {},

  setCreds: function() {
    if (cfenv.getAppEnv().isLocal) { //console.log("using local database");
      this.cloudantCredentials = this.noSQLCreds.couchdb;
    } else { //console.log("using host database");
      this.cloudantCredentials = this.noSQLCreds.cloudant;
    }
  },

  getCredsFromFile: function(_file) {
    this.noSQLCreds = JSON.parse(fs.readFileSync(_file));
    this.setCreds();
    return this.noSQLCreds;
  },

  getCredsFromJSON: function(_creds) {
    this.noSQLCreds = _creds;
    this.setCreds();
    return this.noSQLCreds;
  },

  /**
  * function generate correct url to db instance.
  * url varies based on local/remote
  * @returns {String} the correct db access url
  */
  getDBPath: function() {
    let url;
    if (cfenv.getAppEnv().isLocal) { //console.log("using local database");
      url = 'http://' + this.cloudantCredentials.username + ':' + this.cloudantCredentials.password + '@' + this.cloudantCredentials.urlBase;
    } else { //console.log("using host database");
      url = this.cloudantCredentials.url + '/';
    }
    return url;
  },

  authenticate: function() {
    let params = 'name=' + this.cloudantCredentials.username + '&password=' + this.cloudantCredentials.password;
    let method = 'POST';
    let url = this.getDBPath() + '/_session';
    request(
      {url: url, method: method, headers: {'content-type': 'application/x-www-form-urlencoded'}, form: params},
      function(error, response, body) {
        if (error) {
          return ({error: error});
        } else {
          this.cloudantAuth = response.headers['set-cookie'];
          return ({success: response});
        }
      }
    );
  },

  create: function(_name) {
    // create a new database
    let method = 'PUT';
    let url = this.getDBPath() + _name;
    request({
      url: url,
      headers: {'set-cookie': this.cloudantAuth, Accept: '/'},
      method: method
    }, function(error, response, body) {
      let _body = JSON.parse(body);
      if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
        if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
      } else { return ({success: _body}); }
    });
  },

  drop: function(_name) {
    // drop a database
    let method = 'DELETE';
    let url = this.getDBPath() + _name;
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  insert: function(_name, _object) {
    // iCloudant automatically creates a unique index for each entry.
    // let methodName = 'insert';
    delete _object._rev;
    let method = 'POST';
    let url = this.getDBPath() + _name;
    delete _object._rev;
    request(
      {url: url, json: _object, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  update: function(req, res, next) {
    // insert JSON _object into database _name
    // let methodName = 'update';
    let updateContent = req.body.content;
    let _name = req.body.name;
    let method = 'POST';
    let object = {}; object.name = req.body.name; object.oid = req.body.oid;
    let url = this.getDBPath() + '/db/getOne';
    request(
      {url: url, json: object, method: method},
      function(error, response, body) {
        if (error) { return ({error: error}); } else {
          let orig = JSON.parse(body.success);
          for (let prop in updateContent) {
            (function(_idx, _array) {
              orig[_idx] = _array[_idx];
            })(prop, updateContent);
          }
          method = 'PUT';
          url = this.getDBPath() + _name + '/' + object.oid;
          request(
            {url: url, json: orig, method: method},
            function(error2, response2, body2) {
              let _body = JSON.parse(body2);
              if ((error2) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
                if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error2}); }
              } else { return ({success: _body}); }
            }
          );
        }
      }
    );
  },

  getOne: function(_name, _oid) {
    // let methodName = 'getOne';
    // select objects from database _name specified by selection criteria _selector
    let method = 'GET';
    let url = this.getDBPath() + _name + '/' + _oid;
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  select: function(_name, key, view) {
    // select objects from database _name specified by selection criteria _selector
    // console.log("select entered");
    let method = 'GET';
    let object = {selector: {idRubric: key}};
    // console.log("name: "+_name+" key: "+key+" view: "+view);
    let keySelect = ((typeof (key) === 'undefined') || (key === '')) ? '/_design/views/_view/' + view : '/_design/views/_view/' + view + '?key="' + key + '"';
    // console.log("select is ", select);
    let url = this.getDBPath() + _name + keySelect;
    //console.log(url);
    request(
      {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  select2: function(_name, key, view, selectField) {
    // select objects from database _name specified by selection criteria _selector
    // let methodName = 'select2';
    let method = 'POST';
    let object = {selector: {_id: {$gt: 0}, type: {$in: key}}};

    switch (selectField) {
      case 'type':
        object = {selector: {_id: {$gt: 0}, type: {$in: key}}};
        break;
      case 'organization':
        object = {selector: {_id: {$gt: 0}, organization: {$in: key}}};
        break;
    }
    let keySelect = '';
    keySelect = '/_find';
    let url = this.getDBPath() + _name + keySelect;
    request(
      {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  selectMulti: function(_name, keyArray, view) {
    // select objects from database _name specified by selection criteria _selector
    // console.log("selectMulti entered");
    let keys = '';
    for (let each = 0; each < keyArray.length; each++) {
      (function(_idx, _array) {
        keys = keys + ((_idx === 0) ? '["' + _array[_idx] + '"' : ', "' + _array[_idx] + '"');
      })(each, keyArray);
    }
    keys = keys + ']';
    // console.log("keys is ", keys);
    let method = 'GET';
    let object = {keys: keyArray};
    let keySelect = '/_design/views/_view/' + view + '?key=' + keys;
    let url = this.getDBPath() + _name + keySelect;
    request(
      {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  deleteItem: function(_name, _oid, _rev) {
    // delete object specified by _oid in database _name /$DATABASE/$DOCUMENT_ID?rev=$REV
    //_name, _oid, _rev, cbfn
    let method = 'DELETE';
    let url = this.getDBPath() + _name + '/' + _oid + '?rev=' + _rev;
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  getDocs: function(_name) {
    let method = 'GET';
    let url = this.getDBPath() + _name + '/_all_docs?include_docs=true';
    // console.log("getDocs path: ", url);
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  listAllDocuments: function() {
    // list all documents in database _name
    let method = 'GET';
    let url = this.getDBPath() + '/_all_docs';
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  listAllDatabases: function() {
    // list all databases
    let method = 'GET';
    let url = this.getDBPath() + '/_all_dbs';
    request(
      {url: url, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else { return ({success: _body}); }
      }
    );
  },

  capabilities: function(req, res, next) {
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
    return (_c);
  },

  createBackup: function(_name) {
    let _object = {};
    _object.name = _name;
    let method = 'POST';
    let url = this.getDBPath() + '/db/getDocs';
    // console.log("createBackup path: ", url);
    request(
      {url: url, json: _object, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else {
          let fileName = path.join(__dirname, 'HTML/backups', 'Backup_');
          fileName = fileName + ((_object.name === '') ? 'allFiles' : _object.name);
          fileName = fileName + '_' + this.getTimeStamp() + '.json';
          let rows = _body.success.rows;
          let _views = '"views": ['; let viewNum = 0;
          let _str = '[';
          for (let each = 0; each < rows.length; each++) {
            (function(_idx, _array) {
              if (_array[_idx].doc._id !== '_design/views') {
                if (_idx > 0) { _str = _str + ', '; }
                _str = _str + JSON.stringify(_array[_idx].doc);
              } else {
                if (viewNum > 0) { _views = _views + ', '; } _views = _views + ('{ "_id": "_design/views", "views":' + JSON.stringify(_array[_idx].doc.views) + '}');
              }
            })(each, rows);
          }
          _str = _str + ']'; _views = _views + ']';
          fs.writeFileSync(fileName, '{"table" : "' + _object.name + '", "date": "' + this.getTimeStamp() + '", "rows": ' + _str + ', ' + _views + '}', 'utf8');
          return (_body.success.rows);
        }
      }
    );
  },

  restoreTable: function(_name) {
    let fileName = process.cwd() + '/HTML/backups/' + _name;
    let restoreObject = JSON.parse(fs.readFileSync(fileName));
    // console.log("restore data: "+JSON.stringify(restoreObject.rows));
    // drop existing table
    let object = {}; object.name = restoreObject.table;
    let method = 'POST';
    let url = this.getDBPath() + '/db/dropTable';
    request(
      {url: url, json: object, method: method},
      function(error, response, body) {
        let _body = JSON.parse(body);
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error}); }
        } else {
          // create new table
          url = this.getDBPath() + '/db/createTable';
          request(
            {url: url, json: object, method: method},
            function(error2, response2, body2) {
              _body = JSON.parse(body2);
              if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
                if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { return ({error: _body.error}); } else { return ({error: error2}); }
              } else {
                url = this.getDBPath() + '/db/insert';
                for (let each = 0; each < restoreObject.rows.length; each++) {
                  let _object = object; _object.content = restoreObject.rows[each];
                  request(
                    {url: url, json: _object, method: method},
                    function(error3, response3, body3) { console.log('data row restored: ' + response); }
                  );
                }
                for (let each = 0; each < restoreObject.views.length; each++) {
                  console.log('[' + each + '] restoring view row: ' + JSON.stringify(restoreObject.views[each]));
                  let _object = {}; _object.name = object.name; _object.content = restoreObject.views[each];
                  console.log('Restoring view with : ', JSON.stringify(_object, null, 4));
                  request(
                    {url: url, json: _object, method: method},
                    function(error4, response4, body4) { console.log('view row restored: ' + response); }
                  );
                }
              }
            }
          );
        }
      }
    );
  },

  getBackups: function(req, res, next) {
    let loc = process.cwd() + '/HTML/backups/';
    let files = fs.readdirSync(loc);
    console.log(files);
    return (files);
  },

  getTimeStamp: function() { return (new Date(Date.now()).toISOString().replace(/:/g, '.')); }
};

exports.authenticate = RDDnoSQL.authenticate;
exports.create = RDDnoSQL.create;
exports.drop = RDDnoSQL.drop;
exports.insert = RDDnoSQL.insert;
exports.update = RDDnoSQL.update;
exports._delete = RDDnoSQL.deleteItem;
exports.listAllDatabases = RDDnoSQL.listAllDatabases;
exports.listAllDocuments = RDDnoSQL.listAllDocuments;
exports.capabilities = RDDnoSQL.capabilities;
exports.getDocs = RDDnoSQL.getDocs;
exports.getDBPath = RDDnoSQL.getDBPath;
exports.getOne = RDDnoSQL.getOne;
exports.select = RDDnoSQL.select;
exports.select2 = RDDnoSQL.select2;
exports.selectMulti = RDDnoSQL.selectMulti;
exports.createBackup = RDDnoSQL.createBackup;
exports.restoreTable = RDDnoSQL.restoreTable;
exports.getBackups = RDDnoSQL.getBackups;
exports.getCredsFromFile = RDDnoSQL.getCredsFromFile;
exports.getCredsFromJSON = RDDnoSQL.getCredsFromJSON;
