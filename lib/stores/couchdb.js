var cradle = require('cradle');

/**
 * Initialize Store with the given `options`.
 *
 * @param {Object} options [database, host, port, collection]
 * @return store
 */

module.exports = function (options) {

  var STORE = {},

      _default = function (thing) {
        return thing || function () { };
      },

      _is_connected = false,
      _connecting = false;

  options = options || {};

  Object.defineProperty(STORE, 'db', {value : new(cradle.Connection)(
    (options.connectStr || 'http://127.0.0.1:5984')).database(options.database || 'dialect')});

  /**
   * Exposes is_connected
   *
   * @return is_connected
   */
  STORE.is_connected = function () {
    return _is_connected;
  };

  STORE.find = function (locale, original, callback){
    STORE.db.view('translations/all', { key: [ locale,original], include_docs: true }, function (err, docs) {
      if (err){
        callback(err);
      } else {
        if (docs && docs.length > 0){
          callback(null, docs[0].doc);
        } else {
          callback(null, null);
        }
      }
    });
  };

  /**
   * Connects to the Store
   *
   * @param {Function} callback
   * @return store
   */
  STORE.connect = function (callback) {

    var callback = _default(callback);
    //STORE.db.on('dialectReady', callback);

    if (_connecting) {
      console.log("connecting");
      return;
    }

    _connecting = true;

    function connect(err, collection) {
      _is_connected = true;
      _connecting = false;
      STORE.collection = collection;
      //STORE.db.emit('dialectReady', err);
    }

    function collectionSetup() {
      STORE.db.exists(function (err, exists) {
        if (err) {
          console.log('error', err);
        } else {
          if (exists){
            _connecting = false;
            callback(null);
          } else {
            console.log('database does not exists.');
            STORE.db.create( function(err){
              STORE.db.save('_design/translations', {
                all: {
                  map: function (doc) {
                    emit([doc.locale, doc.original], doc);
                  }
                },
                approved: {
                  map: function (doc) {
                    if (doc.approved){
                      emit([doc.locale, doc.original], doc);
                    }
                  }
                },
                not_approved: {
                  map: function (doc) {
                    if (!doc.approved){
                      emit([doc.locale, doc.original], doc);
                    }
                  }
                }
              });
              callback(null);
            });
          }
        }
      });
    }
    collectionSetup();
    return STORE;
  };

  /**
   * Attempt to fetch a translation
   *
   * @param {Object} query
   * @param {Function} callback
   * @return store
   */
  STORE.get = function (query, callback) {

    callback = _default(callback);
    query = query || {};

    //console.log(["get-approved", query.approved]);
    if (query.approved){
      STORE.db.view('translations/approved', { startkey: [query.locale, ''], endkey: [query.locale, 'ZZZ'], include_docs: true }, function (err, docs) {
        var res = [];
        if (docs){
          for (i=0;i<docs.length;i++){
            res.push(docs[i].doc);
          }
        //console.log(["get", docs]);
        }
        //console.log(["get", query, res.length]);
        callback(err,res);
      });
    } else {
      callback(null,null);
    }
    return STORE;
  };

  /**
   * Add a translation
   *
   * @param {Object} doc {original, locale, [, plural] [, context]}
   * @param {String} translation
   * @param {Function} callback
   * @return store
   */
  STORE.add = function (doc, translation, callback) {
    callback = _default(callback);
    STORE.find(doc.locale,doc.original,function(err, obj){
      if (!err && !obj){
        STORE.db.save(doc,callback);
      } else {
        callback(err, obj);
      }
    });
    return STORE;
  };

  /**
   * Set a translation
   * If the translation is new, set it to null
   *
   * @param {Object} query {original, locale}
   * @param {String} translation
   * @param {Function} callback
   * @return store
   */
  STORE.set = function (query, translation, callback) {
    callback = _default(callback);
    query = query || {};
    translation.approved = false;
    STORE.find(query.locale,query.original,function(err, obj){
      if (!err && !obj){
        query.translation = translation.translation;
        query.approved = translation.approved;
        STORE.db.save(query, callback);
      } else {
        callback(err, obj);
      }
    });
    return STORE;
  };

  /**
   * Approve or rejects a translation
   *
   * @param {Object} query {original, locale}
   * @param {String} translation
   * @param {Function} callback
   * @return store
   */
  STORE.approve = function (query, approved, callback) {
    callback = _default(callback);
    query = query || {};
    STORE.find(query.locale,query.original,function(err, obj){
      if(!err && obj){
        obj.approved = approved
        delete obj._rev;
        STORE.db.save(obj, callback);
      } else {
        callback(err, obj);
      }
    });
    return STORE;
  };

  /**
   * Destroy the translation
   *
   * @param {Object} query {original, locale}
   * @param {Function} callback
   * @return store
   */

  STORE.destroy = function (query, callback) {
    callback = _default(callback);
    query = query || {};
    //console.log(["destroy", query]);
    STORE.find(query.locale,query.original,function(err, obj){
      if (!err && obj){
        STORE.db.remove(obj._id, obj._rev, callback);
      } else {
        callback(err, obj);
      }
    });
    return STORE;
  };

  /**
   * Fetch number of translations.
   *
   * @param {Object} query {locale, translation...} [optional]
   * @param {Function} callback
   * @return store
   */

  STORE.count = function (query, callback) {
    callback = _default(callback);
    query = query || {};
    console.log(["count", query]);
    callback(null,null);
    //STORE.collection.count(query, callback);
    return STORE;
  };

  return STORE;
};
