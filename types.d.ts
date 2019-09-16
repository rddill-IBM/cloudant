/**
 * CoachCloudant module
 * @module rddill/cloudant
 */
declare module "rddill/cloudant" {
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
    function setCreds(): boolean;
    /**
     * This retrieves the credentials from the provided file. Try/Catch is used during file processing and also when the file is
     * being parsed (JSON.parse). Errors are returned if either function fails.
     * Upon successful retrieval and parsing, the getCredsFromJSON function is called to set credentials and save
     * the retrieved creds for later use.
     * @param {object} file object with credentials
     * @returns {JSON} details follow:
     */
    function getCredsFromFile(file: any): JSON;
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
    function getCredsFromJSON(_creds: JSON): JSON;
    /**
     * function generate correct url to db instance.
     * url varies based on local/remote
     * @returns {String} the correct db access url
     */
    function getDBPath(): string;
    /**
     * authenticate user to service
     * @returns {JSON} details follow:
     * on Success, returns response object from database authenticate action
     * on Failure, returns JSON object with one of three error elements:
     *  - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
     *  - errorMessage: if body.error exists, then returns text string with body.error + body.reason
     *  - error: if body.error does not exist, then returns error object
     */
    function authenticate(): JSON;
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
    function create(_name: string): JSON;
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
    function drop(_name: string): JSON;
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
    function insert(_name: string, _object: JSON): JSON;
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
    function _delete(_name: string, _oid: string, _rev: string): JSON;
    /**
     * retrives a single record from the database using the couchdb or cloudant key field
     * @param {String} _name name of table to use
     * @param {String} _oid key value to use
     * @returns {JSON} details follow:
     * On Success: {success: _body}
     * On Failure:
     *  - if body.error exists: {error: _body.error + ' ' + body.reason}
     *  - if body.error does not exist: {error: error}
     */
    function getOne(_name: string, _oid: string): JSON;
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
    function update(_name: string, _id: string, _content: JSON): JSON;
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
    function select(_name: string, key: string, view: string): JSON;
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
    function select2(_name: string, key: Array, selectField: string): JSON;
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
    function selectMulti(_name: any, keyArray: any, view: any): JSON;
    /**
     * Retrieves all documents from the specified table
     * @param {*} _name name of table to use
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function getDocs(_name: any): JSON;
    /**
     * list all tables in this CouchDB or Cloudant instance
     * returns an array of database names
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function listAllDatabases(): JSON;
    /**
     * call this function to get a JSON object which lists each of the services which can be requested from this module
     * @returns {JSON} json object which has elements named after the callable functions
     */
    function capabilities(): JSON;
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
    function createBackup(_name: string): JSON;
    /**
     * This function restores a single table from a single file. The file to be used is located in the folder specified
     * by the backupFolder item in the JSON object provided during initialization.
     * this will fail if either the file does not exist or the server is unable to create the table.
     * @param {String} _name name of file to use for restoration. The table to be restored is defined by the file.
     * @returns {JSON} details follow:
     * On Success: {success: {table: _table, records: records, views: views}}
     * On Table Create Failure: {error: nodejs Error Object}
     */
    function restoreTable(_name: string): JSON;
    /**
     * this searches the folder identified in the JSON object provided during initialization and returns a list of found files
     * @returns {*} fs. generated file list
     */
    function getBackups(): any;
    /**
     * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
     * @returns {String} ISO based string with colons replaced with periods.
     * Used to name files
     */
    function getTimeStamp(): string;
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
    function setCreds(): boolean;
    /**
     * This retrieves the credentials from the provided file. Try/Catch is used during file processing and also when the file is
     * being parsed (JSON.parse). Errors are returned if either function fails.
     * Upon successful retrieval and parsing, the getCredsFromJSON function is called to set credentials and save
     * the retrieved creds for later use.
     * @param {object} file object with credentials
     * @returns {JSON} details follow:
     */
    function getCredsFromFile(file: any): JSON;
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
    function getCredsFromJSON(_creds: JSON): JSON;
    /**
     * function generate correct url to db instance.
     * url varies based on local/remote
     * @returns {String} the correct db access url
     */
    function getDBPath(): string;
    /**
     * authenticate user to service
     * @returns {JSON} details follow:
     * on Success, returns response object from database authenticate action
     * on Failure, returns JSON object with one of three error elements:
     *  - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
     *  - errorMessage: if body.error exists, then returns text string with body.error + body.reason
     *  - error: if body.error does not exist, then returns error object
     */
    function authenticate(): JSON;
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
    function create(_name: string): JSON;
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
    function drop(_name: string): JSON;
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
    function insert(_name: string, _object: JSON): JSON;
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
    function _delete(_name: string, _oid: string, _rev: string): JSON;
    /**
     * retrives a single record from the database using the couchdb or cloudant key field
     * @param {String} _name name of table to use
     * @param {String} _oid key value to use
     * @returns {JSON} details follow:
     * On Success: {success: _body}
     * On Failure:
     *  - if body.error exists: {error: _body.error + ' ' + body.reason}
     *  - if body.error does not exist: {error: error}
     */
    function getOne(_name: string, _oid: string): JSON;
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
    function update(_name: string, _id: string, _content: JSON): JSON;
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
    function select(_name: string, key: string, view: string): JSON;
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
    function select2(_name: string, key: Array, selectField: string): JSON;
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
    function selectMulti(_name: any, keyArray: any, view: any): JSON;
    /**
     * Retrieves all documents from the specified table
     * @param {*} _name name of table to use
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function getDocs(_name: any): JSON;
    /**
     * list all tables in this CouchDB or Cloudant instance
     * returns an array of database names
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function listAllDatabases(): JSON;
    /**
     * call this function to get a JSON object which lists each of the services which can be requested from this module
     * @returns {JSON} json object which has elements named after the callable functions
     */
    function capabilities(): JSON;
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
    function createBackup(_name: string): JSON;
    /**
     * This function restores a single table from a single file. The file to be used is located in the folder specified
     * by the backupFolder item in the JSON object provided during initialization.
     * this will fail if either the file does not exist or the server is unable to create the table.
     * @param {String} _name name of file to use for restoration. The table to be restored is defined by the file.
     * @returns {JSON} details follow:
     * On Success: {success: {table: _table, records: records, views: views}}
     * On Table Create Failure: {error: nodejs Error Object}
     */
    function restoreTable(_name: string): JSON;
    /**
     * this searches the folder identified in the JSON object provided during initialization and returns a list of found files
     * @returns {*} fs. generated file list
     */
    function getBackups(): any;
    /**
     * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
     * @returns {String} ISO based string with colons replaced with periods.
     * Used to name files
     */
    function getTimeStamp(): string;
}

/**
 * CoachCloudant module
 * @module rddill/cloudant
 */
declare module "rddill/cloudant" {
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
    function setCreds(): boolean;
    /**
     * This retrieves the credentials from the provided file. Try/Catch is used during file processing and also when the file is
     * being parsed (JSON.parse). Errors are returned if either function fails.
     * Upon successful retrieval and parsing, the getCredsFromJSON function is called to set credentials and save
     * the retrieved creds for later use.
     * @param {object} file object with credentials
     * @returns {JSON} details follow:
     */
    function getCredsFromFile(file: any): JSON;
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
    function getCredsFromJSON(_creds: JSON): JSON;
    /**
     * function generate correct url to db instance.
     * url varies based on local/remote
     * @returns {String} the correct db access url
     */
    function getDBPath(): string;
    /**
     * authenticate user to service
     * @returns {JSON} details follow:
     * on Success, returns response object from database authenticate action
     * on Failure, returns JSON object with one of three error elements:
     *  - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
     *  - errorMessage: if body.error exists, then returns text string with body.error + body.reason
     *  - error: if body.error does not exist, then returns error object
     */
    function authenticate(): JSON;
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
    function create(_name: string): JSON;
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
    function drop(_name: string): JSON;
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
    function insert(_name: string, _object: JSON): JSON;
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
    function _delete(_name: string, _oid: string, _rev: string): JSON;
    /**
     * retrives a single record from the database using the couchdb or cloudant key field
     * @param {String} _name name of table to use
     * @param {String} _oid key value to use
     * @returns {JSON} details follow:
     * On Success: {success: _body}
     * On Failure:
     *  - if body.error exists: {error: _body.error + ' ' + body.reason}
     *  - if body.error does not exist: {error: error}
     */
    function getOne(_name: string, _oid: string): JSON;
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
    function update(_name: string, _id: string, _content: JSON): JSON;
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
    function select(_name: string, key: string, view: string): JSON;
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
    function select2(_name: string, key: Array, selectField: string): JSON;
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
    function selectMulti(_name: any, keyArray: any, view: any): JSON;
    /**
     * Retrieves all documents from the specified table
     * @param {*} _name name of table to use
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function getDocs(_name: any): JSON;
    /**
     * list all tables in this CouchDB or Cloudant instance
     * returns an array of database names
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function listAllDatabases(): JSON;
    /**
     * call this function to get a JSON object which lists each of the services which can be requested from this module
     * @returns {JSON} json object which has elements named after the callable functions
     */
    function capabilities(): JSON;
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
    function createBackup(_name: string): JSON;
    /**
     * This function restores a single table from a single file. The file to be used is located in the folder specified
     * by the backupFolder item in the JSON object provided during initialization.
     * this will fail if either the file does not exist or the server is unable to create the table.
     * @param {String} _name name of file to use for restoration. The table to be restored is defined by the file.
     * @returns {JSON} details follow:
     * On Success: {success: {table: _table, records: records, views: views}}
     * On Table Create Failure: {error: nodejs Error Object}
     */
    function restoreTable(_name: string): JSON;
    /**
     * this searches the folder identified in the JSON object provided during initialization and returns a list of found files
     * @returns {*} fs. generated file list
     */
    function getBackups(): any;
    /**
     * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
     * @returns {String} ISO based string with colons replaced with periods.
     * Used to name files
     */
    function getTimeStamp(): string;
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
    function setCreds(): boolean;
    /**
     * This retrieves the credentials from the provided file. Try/Catch is used during file processing and also when the file is
     * being parsed (JSON.parse). Errors are returned if either function fails.
     * Upon successful retrieval and parsing, the getCredsFromJSON function is called to set credentials and save
     * the retrieved creds for later use.
     * @param {object} file object with credentials
     * @returns {JSON} details follow:
     */
    function getCredsFromFile(file: any): JSON;
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
    function getCredsFromJSON(_creds: JSON): JSON;
    /**
     * function generate correct url to db instance.
     * url varies based on local/remote
     * @returns {String} the correct db access url
     */
    function getDBPath(): string;
    /**
     * authenticate user to service
     * @returns {JSON} details follow:
     * on Success, returns response object from database authenticate action
     * on Failure, returns JSON object with one of three error elements:
     *  - errorMessage: if authenticate credentials do not exist, then returns text string with message stating authenticate credentials are null
     *  - errorMessage: if body.error exists, then returns text string with body.error + body.reason
     *  - error: if body.error does not exist, then returns error object
     */
    function authenticate(): JSON;
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
    function create(_name: string): JSON;
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
    function drop(_name: string): JSON;
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
    function insert(_name: string, _object: JSON): JSON;
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
    function _delete(_name: string, _oid: string, _rev: string): JSON;
    /**
     * retrives a single record from the database using the couchdb or cloudant key field
     * @param {String} _name name of table to use
     * @param {String} _oid key value to use
     * @returns {JSON} details follow:
     * On Success: {success: _body}
     * On Failure:
     *  - if body.error exists: {error: _body.error + ' ' + body.reason}
     *  - if body.error does not exist: {error: error}
     */
    function getOne(_name: string, _oid: string): JSON;
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
    function update(_name: string, _id: string, _content: JSON): JSON;
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
    function select(_name: string, key: string, view: string): JSON;
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
    function select2(_name: string, key: Array, selectField: string): JSON;
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
    function selectMulti(_name: any, keyArray: any, view: any): JSON;
    /**
     * Retrieves all documents from the specified table
     * @param {*} _name name of table to use
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function getDocs(_name: any): JSON;
    /**
     * list all tables in this CouchDB or Cloudant instance
     * returns an array of database names
     * @returns {JSON} details follow:
     * On Success: {success: {rows: _body, total_rows: _body.length}}
     * On Failure:
     *  - if body.error exists: {error: _body.error}
     *  - if body.error does not exist: {error: error}
     */
    function listAllDatabases(): JSON;
    /**
     * call this function to get a JSON object which lists each of the services which can be requested from this module
     * @returns {JSON} json object which has elements named after the callable functions
     */
    function capabilities(): JSON;
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
    function createBackup(_name: string): JSON;
    /**
     * This function restores a single table from a single file. The file to be used is located in the folder specified
     * by the backupFolder item in the JSON object provided during initialization.
     * this will fail if either the file does not exist or the server is unable to create the table.
     * @param {String} _name name of file to use for restoration. The table to be restored is defined by the file.
     * @returns {JSON} details follow:
     * On Success: {success: {table: _table, records: records, views: views}}
     * On Table Create Failure: {error: nodejs Error Object}
     */
    function restoreTable(_name: string): JSON;
    /**
     * this searches the folder identified in the JSON object provided during initialization and returns a list of found files
     * @returns {*} fs. generated file list
     */
    function getBackups(): any;
    /**
     * generates an ISO compliant timestamp, where colons (:) are replaced with periods (.)
     * @returns {String} ISO based string with colons replaced with periods.
     * Used to name files
     */
    function getTimeStamp(): string;
}

