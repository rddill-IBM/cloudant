/**
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

'use strict';
let request = require('request');
let fs = require('fs');
let path = require('path');

let RDDnoSQL = {
  cloudantAuth: {},
  noSQLCreds: {},
  _credentials: {},

  /**
   * used to set credentials for either Cloudant or CouchDB. This is required because the URL structure for the two
   * databases is different.
   * The passed in JSON structure has an element called 'useCouchDB'. If this value is true, then couchDB is used
   * if this value is false, then Cloudant is used.
   * if this value is null, undefined, or a value other than true or false, then _credentials is set to null
   * and the function returns false.
   * This function returns true on success
   * @returns {Boolean} true on success, false on failure
   */
  setCreds: function() {
    if ((typeof (this.noSQLCreds) !== 'undefined') && (this.noSQLCreds !== null)) {
      if ((typeof (this.noSQLCreds.useCouchDB) !== 'undefined') && (this.noSQLCreds.useCouchDB !== null)) {
        if (this.noSQLCreds.useCouchDB) {
          this._credentials = this.noSQLCreds.couchdb;
          return true;
        } else {
          this._credentials = this.noSQLCreds.cloudant;
          return true;
        }
      } else {
        this._credentials = null;
        return false;
      }
    } else {
      this._credentials = null;
      return false;
    }
  },

  /**
   * This retrieves the credentials from the provided file. Try/Catch is used during file processing and also when the file is
   * being parsed (JSON.parse). Errors are returned if either function fails.
   * Upon successful retrieval and parsing, the getCredsFromJSON function is called to set credentials and save
   * the retrieved creds for later use.
   * @param {*} _file nodejs file object with credcentials
   */
  getCredsFromFile: function(_file) {
    let fileCreds;
    try { fileCreds = fs.readFileSync(_file); } catch (error) { return {failure: 'unable to read from provided file.', error: error}; }
    let parseFile;
    try { parseFile = JSON.parse(fileCreds); } catch (error) { return {failure: 'unable to parse provided credentials.', error: error}; }
    return (this.getCredsFromJSON(parseFile));
  },

  /**
   * This takes the inbound credentials and saves them. This function calls setCreds() which returns false if the
   * inbound object does not contain a correctly formatted useCouchDB Boolean object.
   * @param {JSON object} _creds inbound credentials to save.
   */
  getCredsFromJSON: function(_creds) {
    this.noSQLCreds = _creds;
    if (this.setCreds()) { return {success: this.noSQLCreds}; } else { return ({failure: 'setCreds failed. Most like due to missing or incorrect useCouchDB value in JSON '}); }

  },

  /**
  * function generate correct url to db instance.
  * url varies based on local/remote
  * @returns {String} the correct db access url
  */
  getDBPath: function() {
    let url;
    if (this.noSQLCreds.useCouchDB) {
      url = 'http://' + this._credentials.username + ':' + this._credentials.password + '@' + this._credentials.urlBase + '/';
    } else { //console.log("using host database");
      url = this._credentials.url + '/';
    }
    return url;
  },

  /**
   * authenticate user to service
   */
  authenticate: function() {
    let params = 'name=' + this._credentials.username + '&password=' + this._credentials.password;
    let method = 'POST';
    let url = this.getDBPath() + '_session';
    let headers = {};
    headers['content-type'] = 'application/x-www-form-urlencoded';
    headers.Referer = this._credentials.url;
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, headers: headers, form: params},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (_error) { reject({error: _error}); }
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else {
            _rdd.cloudantAuth = response.headers['set-cookie'];
            resolve({success: response});
          }
        }
      );
    });
  },

  /**
   * Creates a new table
   * @param {String} _name name of table to create
   */
  create: function(_name) {
    // create a new database
    let method = 'PUT';
    let url = this.getDBPath() + _name;
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      request({
        url: url,
        headers: {'set-cookie': _rdd.cloudantAuth, Accept: '/'},
        method: method
      }, function(error, response, body) {
        let _body;
        try { _body = JSON.parse(body); } catch (jError) { console.log('create error: ', error); console.log('parse error: ', jError); reject({error: jError}); }
        if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
          if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
        } else { resolve({success: _body}); }
      });
    });
  },

  /**
   * Irrevocably removes a table. The table does not have to be empty to be removed
   * @param {String} _name name of table to remove
   */
  drop: function(_name) {
    // drop a database
    let method = 'DELETE';
    let url = this.getDBPath() + _name;
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if (error) {
            reject({error: error});
          } else if (typeof (_body) === 'undefined') {
            reject({error: 'undefined error on drop'});
          } else if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason});
          } else { resolve({success: _body}); }
        }
      );
    });
  },

  /**
   * adds (inserts in SQL terminology) a single record into the targeted table
   * @param {String} _name name of table to use
   * @param {JSON} _object object (record) to add
   */
  insert: function(_name, _object) {
    // iCloudant automatically creates a unique index for each entry.
    // let methodName = 'insert';
    delete _object._rev;
    let method = 'POST';
    let url = this.getDBPath() + _name;
    delete _object._rev;
    return new Promise(function(resolve, reject) {
      request(
        {url: url, json: _object, method: method},
        function(error, response, body) {
          if ((error) || ((typeof (body.error) !== 'undefined') && (body.error !== null))) {
            if ((typeof (body.error) !== 'undefined') && (body.error !== null)) { reject({error: body.error + ' ' + body.reason}); } else { reject({error: error}); }
          } else { resolve({success: body}); }
        }
      );
    });
  },

  /**
   * Removes a single record from the targeted table. The request must match both key and rev for the delete to succeed.
   * @param {String} _name name of table to use
   * @param {String} _oid id of the record to delete
   * @param {String} _rev revision number for the record to delete
   */
  deleteItem: function(_name, _oid, _rev) {
    // delete object specified by _oid in database _name /$DATABASE/$DOCUMENT_ID?rev=$REV
    //_name, _oid, _rev, cbfn
    let method = 'DELETE';
    let url = this.getDBPath() + _name + '/' + _oid + '?rev=' + _rev;
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else { resolve({success: _body}); }
        }
      );
    });
  },

  /**
 * retrives a single record from the database using the couchdb or cloudant key field
 * @param {String} _name name of table to use
 * @param {String} _oid key value to use
 */
  getOne: function(_name, _oid) {
    // let methodName = 'getOne';
    // select objects from database _name specified by selection criteria _selector
    let method = 'GET';
    let url = this.getDBPath() + _name + '/' + _oid;
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else { resolve({success: _body}); }
        }
      );
    });
  },

  /**
   * Updates a single record. inbound object adds or replaces values in current record. Values not
   * defined in inbound record are left untouched in updated record.
   * If field does not exist in original record but does exist in update object, the new field
   * will be created in the target record.
   * @param {String} _name name of table to use
   * @param {String} _id id of current record in database
   * @param {JSON} _content JSON objet with values to replace in original record.
   */
  update: function(_name, _id, _content) {
    // insert JSON _object into database _name
    let methodName = 'update';
    let updateContent = _content;
    let method = 'POST';
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      return _rdd.getOne(_name, _id)
        .then(_currRec => {
          let orig = _currRec.success;
          for (let prop in updateContent) {
            (function(_idx, _array) {
              orig[_idx] = _array[_idx];
            })(prop, updateContent);
          }
          method = 'PUT';
          let url = _rdd.getDBPath() + _name + '/' + _id;
          request(
            {url: url, json: orig, method: method},
            function(error2, response2, body2) {
              let _body = body2;
              if ((error2) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
                if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error2}); }
              } else { resolve({success: _body}); }
            }
          );
        })
        .catch(error => {
          console.log(methodName + ' error on getOne: ', error);
          reject({error: error});
        });
    });
  },

  /**
   * Retrieves zero or more records based on the value provided in key as managed by view
   * @param {String} _name name of the table to use
   * @param {String} key key value
   * @param {String} view name of the view to use
   */
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
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
        function(error, response, body) {
          let _body = body;
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else { resolve({success: _body}); }
        }
      );
    });
  },

  /**
   * retrieve 0 or more records from table based on values in key and field defined in
   * the selectField view. This is analogous to an SQL query which selects records based on
   * value a or b or c etc. in field y ... in the following example, this performs the following
   * analogous query:
   * Select * where type = joy or type = sorrow or type = fear;
   * @example
   * <caption> key is array, for example</caption>
   * new Array('joy', 'sorrow', 'fear')
   * @example <caption> selectField is a field, e.g. "type" in the following example</caption>
   * "views": {
   * "byType": {
   *     "map": "function (doc) { if (doc.type ) {emit(doc.type, doc); } }"
   *    }
   * }
   * @param {String} _name name of table to use
   * @param {Array} key array of key values to use
   * @param {String} selectField design view to use
   */
  select2: function(_name, key, selectField) {
    // select objects from database _name specified by selection criteria _selector
    // let methodName = 'select2';
    let method = 'POST';
    let object = {selector: {_id: {$gt: 0}}};
    object.selector[selectField] = {$in: key};
    let keySelect = '/_find';
    let url = this.getDBPath() + _name + keySelect;
    let headers = {};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, json: object, headers: headers},
        function(error, response, body) {
          let _body = body;
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else { resolve({success: {rows: _body.docs}}); }
        }
      );
    });
  },

  /**
 * used to find records using key values from multiple fields.
 * This is analogous to an SQL statement of the form:
 * Select * from {table} where field1=keyArray[0] and field2=keyArray[1];
 * The number of keys provided in keyArray should match the number of select fields in view
 * @param {*} _name table to use
 * @param {*} keyArray array of key values
 * @param {*} view view in selected table which will accept the provided keys
 */
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
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, json: object, headers: {'Content-Type': 'application/json'}},
        function(error, response, body) {
          let _body;
          _body = body;
          _body.total_rows = _body.rows.length;
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error + ' ' + _body.reason}); } else { reject({error: error}); }
          } else { resolve({success: _body}); }
        }
      );
    });
  },

  /**
   * Retrieves all documents from the specified table
   * @param {*} _name name of table to use
   */
  getDocs: function(_name) {
    let method = 'GET';
    let url = this.getDBPath() + _name + '/_all_docs?include_docs=true';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error}); } else { reject({error: error}); }
          } else { resolve({success: {rows: _body.rows, total_rows: _body.total_rows}}); }
        }
      );
    });
  },

  /**
   * list all tables in this CouchDB or Cloudant instance
   * returns an array of database names
   */
  listAllDatabases: function() {
    // list all databases
    let method = 'GET';
    let url = this.getDBPath() + '_all_dbs';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if ((error) || ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) {
            if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) { reject({error: _body.error}); } else { reject({error: error}); }
          } else { resolve({success: {rows: _body, total_rows: _body.length}}); }
        }
      );
    });
  },

  /**
   * call this function to get a JSON object which lists each of the services which can be requested from this module
   * @returns (JSON) json object which has elements named after the callable functions
   */
  capabilities: function() {
    let _c = {};
    _c.authenticate = 'function (): uses credentials in env.json file to authenticate to cloudant server';
    _c.create = 'function (_name): create a new database';
    _c.drop = 'function (_name): drop a database';
    _c.insert = 'function (_name, _object): insert JSON _object into database _name';
    _c.update = 'function (_name, _oid, _object): update JSON object specified by object _oid in database _name with new object _object';
    _c.select = 'function (_name, _selector): select objects from database _name specified by selection criteria _selector';
    _c.select2 = 'function (_name, _keysw, _selector): select objects from database _name specified by selection criteria _selector using multiple keys as defined in keys';
    _c.delete = 'function (_name, _oid): delete object specified by _oid in database _name';
    _c.listAllDatabases = 'function (): list all databases I can access';
    _c.getDocs = 'function (_name): list all documents in database _name';
    _c.capabilities = 'return this object with descriptors.';
    _c.createBackup = 'function (_name): create a backup of database _name.';
    _c.getBackups = 'function (): get a list of available time-stamped backups.';
    _c.restoreTable = 'function (_file): restore database _name.';
    return (_c);
  },

  /**
   * This function reads all documents from the specified table (using the getDocs function) and then generates a backup
   * file for that table. The file is stored in the path provided in the backupFolder option in the JSON object which
   * you provide during initialization. The file name is a concatenation of the following strings:
   * "Backup_" + the inbound _name parameter + a timestamp generated by the getTimeStamp local function
   * If _name is empty, then all documents from all files will be retrieved and placed into a single file.
   * @param {String} _name name of table to back up
   */
  createBackup: function(_name) {
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      return _rdd.getDocs(_name)
        .then(_body => {
          let name = 'Backup_';
          name = name + ((_name === '') ? 'allFiles' : _name);
          name = name + '_' + _rdd.getTimeStamp() + '.json';
          let fileName = path.join(__dirname, _rdd.noSQLCreds.backupFolder, name);
          let rows = _body.success.rows;
          let _views = '"views": ['; let viewNum = 0;
          let _str = '[';
          let records = 0; let views = 0;
          for (let each = 0; each < rows.length; each++) {
            (function(_idx, _array) {
              if (_array[_idx].doc._id !== '_design/views') {
                if (_str !== '[') { _str = _str + ', '; }
                _str = _str + JSON.stringify(_array[_idx].doc);
                records++;
              } else {
                views++;
                if (viewNum > 0) { _views = _views + ', '; } _views = _views + ('{ "_id": "_design/views", "views":' + JSON.stringify(_array[_idx].doc.views) + '}');
              }
            })(each, rows);
          }
          _str = _str + ']'; _views = _views + ']';
          fs.writeFileSync(fileName, '{"table" : "' + _name + '", "date": "' + _rdd.getTimeStamp() + '", "rows": ' + _str + ', ' + _views + '}', 'utf8');
          resolve({success: {name: name, records: records, views: views}});
        })
        .catch(error => {
          reject({error: error});
        });
    });
  },

  /**
 * This function restores a single table from a single file. The file to be used is located in the folder specified
 * by the backupFolder item in the JSON object provided during initialization.
 * this will fail if either the file does not exist or the server is unable to create the table.
 * @param {String} _name name of file to use for restoration. The table to be restored is defined by the file.
 */
  restoreTable: function(_name) {
    let fileName = path.join(__dirname, this.noSQLCreds.backupFolder, _name);
    let fileObject = fs.readFileSync(fileName);
    let restoreObject;
    let records = new Array();
    let views = new Array();
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      try { restoreObject = JSON.parse(fileObject); } catch (error) { console.log('JASON.parse error: ', error); reject({error: error}); }
      // console.log("restore data: "+JSON.stringify(restoreObject.rows));
      // drop existing table
      let _table = restoreObject.table;
      return _rdd.drop(_table)
        .then(() => {
          _rdd.create(_table)
            .then(() => {
              // insert all the rows
              for (let each = 0; each < restoreObject.rows.length; each++) {
                (function(_idx, _arr) {
                  let _object = {}; _object.content = _arr[_idx];
                  _object._id = _object.content._id;
                  _object._rev = _object.content._rev;
                  delete _object.content._id;
                  delete _object.content._rev;
                  return _rdd.insert(_table, _object)
                    .then(_res => { records.push({success: {id: _object._id, success: _res}}); })
                    .catch(_err => { records.push({error: {id: _object.id, error: _err}}); });
                })(each, restoreObject.rows);
              }
              // insert all the views
              for (let each = 0; each < restoreObject.views.length; each++) {
                (function(_idx, _arr) {
                  let _object = {}; _object.content = _arr[_idx];
                  _object._id = _object.content._id;
                  _object._rev = _object.content._rev;
                  delete _object.content._id;
                  delete _object.content._rev;
                  return _rdd.insert(_table, _object)
                    .then(_res => { views.push({success: {id: _object._id, success: _res}}); })
                    .catch(_err => { views.push({error: {id: _object.id, error: _err}}); });
                })(each, restoreObject.views);
              }
              console.log('success!');
              resolve({success: {table: _table, records: records, views: views}});
            })
            .catch(error2 => {
            // table create error
              console.log('create error: ', error2);
              reject({error: error2});
            });
        })
        // eslint-disable-next-line no-unused-vars
        .catch(error1 => {
          _rdd.create(_table)
            .then(() => {
              // insert all the rows
              for (let each = 0; each < restoreObject.rows.length; each++) {
                (function(_idx, _arr) {
                  let _object = {}; _object.content = _arr[_idx];
                  _object._id = _object.content._id;
                  _object._rev = _object.content._rev;
                  delete _object.content._id;
                  delete _object.content._rev;
                  return _rdd.insert(_table, _object)
                    .then(_res => { records.push({success: {id: _object._id, success: _res}}); })
                    .catch(_err => { records.push({error: {id: _object.id, error: _err}}); });
                })(each, restoreObject.rows);
              }
              // insert all the views
              for (let each = 0; each < restoreObject.views.length; each++) {
                (function(_idx, _arr) {
                  let _object = {}; _object.content = _arr[_idx];
                  _object._id = _object.content._id;
                  _object._rev = _object.content._rev;
                  delete _object.content._id;
                  delete _object.content._rev;
                  return _rdd.insert(_table, _object)
                    .then(_res => { views.push({success: {id: _object._id, success: _res}}); })
                    .catch(_err => { views.push({error: {id: _object.id, error: _err}}); });
                })(each, restoreObject.views);
              }
              resolve({success: {table: _table, records: records, views: views}});
            })
            .catch(error2 => {
            // table create error
              console.log('create error: ', error2);
              reject({error: error2});
            });
        });
    });
  },

  /**
   * this searches the folder identified in the JSON object provided during initialization and returns a list of found files
   * @returns {*} fs. generated file list
   */
  getBackups: function() {
    let loc = process.cwd() + this.noSQLCreds.backupFolder;
    let files = fs.readdirSync(loc);
    return (files);
  },

  /**
   * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
   * @returns {String} ISO based string with colons replaced with periods.
   * Used to name files
   */
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
exports.setCreds = RDDnoSQL.setCreds;
exports.cloudantAuth = RDDnoSQL.cloudantAuth;
exports.noSQLCreds = RDDnoSQL.noSQLCreds;
exports.getTimeStamp = RDDnoSQL.getTimeStamp;
exports._credentials = RDDnoSQL._credentials;
