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

/**
 * CoachCloudant module
 * @module rddill/cloudant
 */

'use strict';
let request = require('request');
let fs = require('fs');
let path = require('path');

module.exports = {
  cloudantAuth: {},
  noSQLCreds: {},
  _credentials: {},

  /**
    * 1Q 2020 planned updates
    * Required updates (focus on architectural quality of maintainability)
    * Streamline code: reduce duplication:
    *  - add function to replace replicated IAM test in each exported function
    *  - add methodName string to each exported function.
    *  - replace, where possible, replicated async functions with common function. primary difference in many routines
    *      is the presence of the method name in the async functions, which can be resolved by the previous update.
  */

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
          this.cloudantAuth = null;
          return true;
        } else {
          this._credentials = this.noSQLCreds.cloudant;
          this.cloudantAuth = null;
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
  * @param {object} file object with credentials
  * @returns {JSON} details follow:
  */
  getCredsFromFile: function(_file) {
    let fileCreds;
    try { fileCreds = fs.readFileSync(_file); } catch (error) { return {errorMessage: 'unable to read from provided file.', error: error}; }
    let parseFile;
    try { parseFile = JSON.parse(fileCreds); } catch (error) { return {errorMessage: 'unable to parse provided credentials.', error: error}; }
    return (this.getCredsFromJSON(parseFile));
  },

  /**
  * This takes the inbound credentials and saves them. This function calls setCreds() which returns false if the
  * inbound object does not contain a correctly formatted useCouchDB Boolean object.
  * @param {JSON} _creds inbound credentials to save.
  * @returns {JSON} details follow:
  * on Success, returns JSON object with credentials for selected data base
  * on Failure, returns JSON object with two elements:
  *  - errorMessage: text string
  *  - error: error object
  */
  getCredsFromJSON: function(_creds) {
    this.noSQLCreds = _creds;
    if (this.setCreds()) { return {success: this.noSQLCreds}; } else { return ({errorMessage: 'setCreds failed. Most like due to missing or incorrect useCouchDB value in JSON '}); }

  },

  /**
  * function generate correct url to db instance.
  * url varies based on local/remote
  * @returns {String} the correct db access url
  */
  getDBPath: function() {
    let url;
    if (this.noSQLCreds.useCouchDB) { // using CouchDB
      // use UID/PW authentication for CouchDB
      url = 'https://' + this._credentials.username + ':' + this._credentials.password + '@' + this._credentials.urlBase + '/';
    } else { // using Cloudant
      // eslint-disable-next-line no-lonely-if
      if (this.noSQLCreds.useIAM) { // using IAM for Cloudant
        url = 'https://' + this._credentials.host + '/';
      } else {
        url = this._credentials.url + '/';
      }
    }
    return url;
  },

  /**
  * authenticate user to service
  * @returns {JSON} details follow:
  * on Success, returns response object from database authenticate action
  * on Failure, returns JSON object with one of three error elements:
  *  - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
  *  - errorMessage: if body.error exists, then returns text string with body.error + body.reason
  *  - error: if body.error does not exist, then returns error object
  */
  authenticate: function() {
    let _rdd = this;
    console.log('\n=====> db authenticate entered at: ' + this.getTimeStamp());
    if ((this._credentials === null) || (typeof this._credentials === 'undefined')) {
      return {error: new Error('Authentication failed. No credentials provided.')};
    }
    if ((this.noSQLCreds.useIAM === null) || (typeof this.noSQLCreds.useIAM === 'undefined') || (this.noSQLCreds.useIAM === false)) {
      console.log('authenticate: using UID/PW for authentication');
      let params = 'name=' + this._credentials.username + '&password=' + this._credentials.password;
      let method = 'POST';
      let url = this.getDBPath() + '_session';
      let headers = {};
      headers['content-type'] = 'application/x-www-form-urlencoded';
      headers.Referer = this._credentials.url;
      return new Promise(function(resolve, reject) {
        request(
          {url: url, method: method, headers: headers, form: params},
          function(error, response, body) {
            let _body;
            try { _body = JSON.parse(body); } catch (_error) { reject({error: _error}); }
            if (error) { console.log('authenticate error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
              _rdd.cloudantAuth = response.headers['set-cookie'];
              resolve({success: response});
            }
          }
        );
      });
    } else if ((this.noSQLCreds.useIAM !== null) || (typeof this.noSQLCreds.useIAM !== 'undefined') || (this.noSQLCreds.useIAM === true)) {
      // use IAM authentication
      console.log('authenticate: using IAM for authentication');
      let method = 'POST';
      let url = 'https://iam.cloud.ibm.com/identity/token';
      let params = {};
      let headers = {};
      headers['content-type'] = 'application/x-www-form-urlencoded';
      headers.accept = 'application/json';
      headers['Cache-Control'] = 'no-cache';
      headers.Connection = 'keep-alive';
      headers.Host = 'iam.cloud.ibm.com';
      // headers.Referer = this._credentials.url;
      // eslint-disable-next-line camelcase
      params.grant_type = 'urn:ibm:params:oauth:grant-type:apikey';
      params.apikey = this._credentials.apikey;
      return new Promise(function(resolve, reject) {
        if (_rdd.cloudantAuth !== null) {
          resolve({success: _rdd.cloudantAuth});
        } else {
          request(
            {url: url, method: method, headers: headers, form: params},
            function(error, response, body) {
              let _body;
              try { _body = JSON.parse(body); } catch (_error) { reject({error: _error}); }
              if (error) { console.log('authenticate error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
                let rBody = JSON.parse(response.body);
                _rdd.cloudantAuth = 'Bearer ' + rBody.access_token;
                console.log('=====> auth: ' + _rdd.cloudantAuth);
                // the IAM token is only valid for one hour. 
                // refresh the token in just under an hour (3500 seconds)
                setTimeout((function() {
                  console.log('\n=====>initiating token refresh at: ' + _rdd.getTimeStamp());
                  _rdd.cloudantAuth = null;
                  _rdd.authenticate();
                }), 3500000);
                resolve({success: _rdd.cloudantAuth});
              }
            }
          );
        }
      });
    }
  },

  /**
  * Creates a new table
  * @param {String} _name name of table to create
  * @returns {JSON} details follow:
  * on Success, returns JSON object with body object from create operation
  *  - {success: (complete response object)}
  * on create Failure, returns JSON object:
  *  - {errorMessage: text string}
  *  - {error: Error object}
  * on JSON Parse Failure, returns JSON object with one element:
  *  - {error: JSON error object}
  */
  create: function(_name) {
    // create a new database
    let method = 'PUT';
    let url = this.getDBPath() + _name;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
      headers.Accept = '/';
      headers['Cache-Control'] = 'no-cache';
      headers.Connection = 'keep-alive';
      headers.Host = this._credentials.host;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request({
        url: url,
        headers: headers,
        method: method
      }, function(error, response, body) {
        let _body;
        try { _body = JSON.parse(body); } catch (jError) { console.log('parse error: ', jError); reject({error: jError}); }
        if (error) { console.log('create error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
          resolve({success: _body});
        }
      });
    });
  },

  /**
  * Irrevocably removes a table. The table does not have to be empty to be removed
  * @param {String} _name name of table to remove
  * @returns {JSON} details follow:
  * on Success, returns JSON object with body object from drop operation:
  *  - {success: { success: { ok: true } }}
  * on create Failure, returns JSON object:
  *  - {errorMessage: text string}
  * on JSON Parse Failure, returns JSON object with one element:
  *  - {error: JSON error object}
  */
  drop: function(_name) {
    // drop a database
    console.log('drop: this: ', this);
    let method = 'DELETE';
    let url = this.getDBPath() + _name;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
      headers.Accept = '/';
      headers['Cache-Control'] = 'no-cache';
      headers.Connection = 'keep-alive';
      headers.Host = this._credentials.host;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request({
        url: url,
        headers: headers,
        method: method
      }, function(error, response, body) {
        let _body;
        try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
        if (error) {
          reject({error: error});
        } else if (typeof (_body) === 'undefined') {
          reject({error: 'undefined error on drop'});
        } else if ((typeof (_body.error) !== 'undefined') && (_body.error !== null)) {
          reject({error: _body.error + ' ' + _body.reason});
        } else { resolve({success: _body}); }
      });
    });
  },

  /**
  * index-based retrieval
  * @param {String} _name name of table to use
  * @param {JSON} selector object to use for find
  * @returns {JSON} details follow:
  * on Success, returns JSON object with body object from operation:
  *  - {success: { ok: true,
  *      id: (text string with oid of inserted document),
  *      rev: (text string with rev of inserted document) }}
  * on insert Failure, returns JSON object:
  *  - {errorMessage: text string}
  *  - {error: Error object}
  */
  find: function(_name, _object) {
  // iCloudant automatically creates a unique index for each entry.
  // let methodName = 'insert';
    let method = 'POST';
    let url = this.getDBPath() + _name + '/_find';
    delete _object._rev;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request({
        url: url,
        headers: headers,
        method: method,
        json: _object
      }, function(error, response, body) {
        if (error) { console.log('insert error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (body.error) !== 'undefined') && (body.error !== null))) { console.log('_body.error: ', body.error); reject({error: body.error + ' ' + body.reason}); } else {
          resolve({success: body});
        }
      });
    });
  },

  /**
  * adds (inserts in SQL terminology) a single record into the targeted table
  * @param {String} _name name of table to use
  * @param {JSON} _object object (record) to add
  * @returns {JSON} details follow:
  * on Success, returns JSON object with body object from operation:
  *  - {success: { ok: true,
  *      id: (text string with oid of inserted document),
  *      rev: (text string with rev of inserted document) }}
  * on insert Failure, returns JSON object:
  *  - {errorMessage: text string}
  *  - {error: Error object}
  */
  insert: function(_name, _object) {
    // iCloudant automatically creates a unique index for each entry.
    // let methodName = 'insert';
    delete _object._rev;
    let method = 'POST';
    let url = this.getDBPath() + _name;
    delete _object._rev;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request({
        url: url,
        headers: headers,
        method: method,
        json: _object
      }, function(error, response, body) {
        if (error) { console.log('insert error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (body.error) !== 'undefined') && (body.error !== null))) { console.log('_body.error: ', body.error); reject({error: body.error + ' ' + body.reason}); } else {
          resolve({success: body});
        }
      });
    });
  },

  /**
  * Removes a single record from the targeted table. The request must match both key and rev for the delete to succeed.
  * @param {String} _name name of table to use
  * @param {String} _oid id of the record to delete
  * @param {String} _rev revision number for the record to delete
  * @returns {JSON} details follow:
  * On Success: {success: _body}
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
  */
  deleteItem: function(_name, _oid, _rev) {
    // delete object specified by _oid in database _name /$DATABASE/$DOCUMENT_ID?rev=$REV
    //_name, _oid, _rev, cbfn
    let method = 'DELETE';
    let url = this.getDBPath() + _name + '/' + _oid + '?rev=' + _rev;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url,
          headers: headers,
          method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if (error) { console.log('deleteItem error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
        }
      );
    });
  },

  /**
  * retrieves a single record from the database using the couchdb or cloudant key field
  * @param {String} _name name of table to use
  * @param {String} _oid key value to use
  * @returns {JSON} details follow:
  * On Success: {success: _body}
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
  */
  getOne: function(_name, _oid) {
    // let methodName = 'getOne';
    // select objects from database _name specified by selection criteria _selector
    let method = 'GET';
    let url = this.getDBPath() + _name + '/' + _oid;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url,
          headers: headers,
          method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if (error) { console.log('getOne error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
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
  * @returns {JSON} details follow:
  * On Success: {success: body}
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
  */
  update: function(_name, _id, _content) {
    // insert JSON _object into database _name
    let methodName = 'update';
    let updateContent = _content;
    let method = 'POST';
    let _rdd = this;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
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
            {url: url,
              headers: headers,
              json: orig,
              method: method},
            function(error2, response2, body2) {
              let _body = body2;
              if (error2) { console.log('create error: ', error2); reject({error: error2}); } else if ((typeof _body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
                resolve({success: _body});
              }
            }
          );
        })
        .catch(error => {
          console.log(methodName + ' database: ' + _name + ' key: ' + _id + ' error on getOne: ', error);
          reject({error: error});
        });
    });
  },

  /**
  * Retrieves zero or more records based on the value provided in key as managed by view
  * @param {String} _name name of the table to use
  * @param {String} key key value
  * @param {String} view name of the view to use
  * @returns {JSON} details follow:
  * On Success: {success: _body}
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
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
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    //console.log(url);
    return new Promise(function(resolve, reject) {
      request(
        {url: url,
          method: method,
          json: object,
          headers: headers},
        function(error, response, body) {
          let _body = body;
          if (error) { console.log('select error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
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
  * @returns {JSON} details follow:
  * On Success: {success: {rows: _body.docs}}
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
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
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, json: object, headers: headers},
        function(error, response, body) {
          let _body = body;
          if (error) { console.log('select2 error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
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
  * @returns {JSON} details follow:
  * On Success: {success: _body} where _body === the returned body object + a total_rows item
  * On Failure:
  *  - if body.error exists: {error: _body.error + ' ' + body.reason}
  *  - if body.error does not exist: {error: error}
 */
  selectMulti: function(_name, keyArray, view) {
    // select objects from database _name specified by selection criteria _selector
    // console.log("selectMulti entered");
    let methodName = 'selectMulti';
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
    let keySelect = '/_design/views/_view/' + view + '?keys=' + keys;
    let url = this.getDBPath() + _name + keySelect;
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, method: method, json: object, headers: headers},
        function(error, response, body) {
          let _body;
          _body = body;
          // eslint-disable-next-line camelcase
          if (error) { console.log('selectMulti error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            _body.total_rows = _body.rows.length;
            resolve({success: _body});
          }
        }
      );
    });
  },

  /**
  * Retrieves all documents from the specified table
  * @param {*} _name name of table to use
  * @returns {JSON} details follow:
  * On Success: {success: {rows: _body, total_rows: _body.length}}
  * On Failure:
  *  - if body.error exists: {error: _body.error}
  *  - if body.error does not exist: {error: error}
  */
  getDocs: function(_name) {
    let method = 'GET';
    let url = this.getDBPath() + _name + '/_all_docs?include_docs=true';
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, headers: headers, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if (error) { console.log('getDocs error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
        }
      );
    });
  },

  /**
  * list all tables in this CouchDB or Cloudant instance
  * returns an array of database names
  * @returns {JSON} details follow:
  * On Success: {success: {rows: _body, total_rows: _body.length}}
  * On Failure:
  *  - if body.error exists: {error: _body.error}
  *  - if body.error does not exist: {error: error}
  */
  listAllDatabases: function() {
    // list all databases
    let method = 'GET';
    let url = this.getDBPath() + '_all_dbs';
    let headers = {};
    if (this._credentials.useIAM !== null) {
      headers.Authorization = this.cloudantAuth;
    } else {
      headers['set-cookie'] = this.cloudantAuth;
    }
    //headers = (this._credentials.useIAM) ? {Authorization: this.cloudantAuth} : {'set-cookie': this.cloudantAuth, Accept: '/'};
    headers['content-type'] = 'application/json';
    return new Promise(function(resolve, reject) {
      request(
        {url: url, headers: headers, method: method},
        function(error, response, body) {
          let _body;
          try { _body = JSON.parse(body); } catch (jError) { reject({error: jError}); }
          if (error) { console.log('listAllDatabases error: ', error); reject({error: error}); } else if ((typeof body !== 'undefined') && ((typeof (_body.error) !== 'undefined') && (_body.error !== null))) { console.log('_body.error: ', _body.error); reject({error: _body.error + ' ' + _body.reason}); } else {
            resolve({success: _body});
          }
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
    _c.authenticate = 'function (): uses credentials in env.json file to authenticate to couchdb or cloudant server';
    _c.create = 'function (_name): create a new database';
    _c.drop = 'function (_name): drop a database';
    _c.find = 'function (_name, _object): find records based on provided selector object';
    _c.insert = 'function (_name, _object): insert JSON _object into database _name';
    _c.update = 'function (_name, _oid, _object): update JSON object specified by object _oid in database _name with new object _object';
    _c.select = 'function (_name, _selector): select objects from database _name specified by selection criteria _selector';
    _c.select2 = 'function (_name, _keysw, _selector): select objects from database _name specified by selection criteria _selector using multiple keys as defined in keys';
    _c._delete = 'function (_name, _oid): delete object specified by _oid in database _name';
    _c.listAllDatabases = 'function (): list all databases I can access';
    _c.getDocs = 'function (_name): list all documents in database _name';
    _c.capabilities = 'return this object with descriptors.';
    _c.createBackup = 'function (_name): create a backup of database _name.';
    _c.getBackups = 'function (): get a list of available time-stamped backups.';
    _c.restoreTable = 'function (_file): restore database _name.';
    _c.getCredsFromFile = 'function (_file): ingests credentials from file at provided absolute path.';
    _c.getCredsFromJSON = 'function (JSON): ingest credentials from provided JSON object.';
    return (_c);
  },

  /**
  * This function reads all documents from the specified table (using the getDocs function) and then generates a backup
  * file for that table. The file is stored in the path provided in the backupFolder option in the JSON object which
  * you provide during initialization. The file name is a concatenation of the following strings:
  * "Backup_" + the inbound _name parameter + a timestamp generated by the getTimeStamp local function
  * If _name is empty, then all documents from all files will be retrieved and placed into a single file.
  * @param {String} _name name of table to back up
  * @returns {JSON} details follow:
  * On Success: {success: {name: name, records: records, views: views}}
  * On Table Create Failure: {error: nodejs Error Object}
  */
  createBackup: function(_name) {
    let _rdd = this;
    return new Promise(function(resolve, reject) {
      return _rdd.getDocs(_name)
        .then(_body => {
          let name = 'Backup_';
          name = name + ((_name === '') ? 'allFiles' : _name);
          name = name + '_' + _rdd.getTimeStamp() + '.json';
          let fileName = path.join(_rdd.noSQLCreds.backupFolder, name);
          let rows = _body.success.rows;
          let _views = '"views": ['; let viewNum = 0;
          let _str = '[';
          let records = 0; let views = 0;
          for (let each = 0; each < rows.length; each++) {
            (function(_idx, _array) {
              if (_array[_idx].doc._id.substring(0, 7) !== '_design') {
                if (_str !== '[') { _str = _str + ', '; }
                _str = _str + JSON.stringify(_array[_idx].doc);
                records++;
              } else {
                views++;
                if (viewNum > 0) { _views = _views + ', '; } _views = _views + JSON.stringify(_array[_idx].doc);
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
  * @returns {JSON} details follow:
  * On Success: {success: {table: _table, records: records, views: views}}
  * On Table Create Failure: {error: nodejs Error Object}
  */
  restoreTable: function(_name) {
    let fileName = path.join(this.noSQLCreds.backupFolder, _name);
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
                  let _object = {}; _object = _arr[_idx];
                  return _rdd.insert(_table, _object)
                    .then(_res => { records.push({success: {id: _object._id, success: _res}}); })
                    .catch(_err => { records.push({error: {id: _object.id, error: _err}}); });
                })(each, restoreObject.rows);
              }
              // insert all the views
              for (let each = 0; each < restoreObject.views.length; each++) {
                (function(_idx, _arr) {
                  let _object = {}; _object = _arr[_idx];
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
    let loc = this.noSQLCreds.backupFolder;
    let files = {};
    return new Promise(function(resolve, reject) {
      try { files = fs.readdirSync(loc); } catch (error) { console.log('JASON.parse error: ', error); reject({error: error}); }
      resolve({success: files});
    });
  },

  /**
  * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
  * @returns {String} ISO based string with colons replaced with periods.
  * Used to name files
  */
  getTimeStamp: function() { return (new Date(Date.now()).toISOString().replace(/:/g, '.')); }
};
