// Generated by CoffeeScript 1.8.0

/*
Copyright (C) 2012 - 2014 Markus Kohlhase <mail@markus-kohlhase.de>
 */

(function() {
  var Store, async, canWrite, canWriteToFile, canWriteToFileSync, clone, fs, get, getIDs, getObjectFromFile, getObjectFromFileSync, id2fileName, isJSONFile, mkdirp, path, readIDs, readIDsSync, remove, removeFileExtension, save, saveObjectToFile, uuid;

  async = require('async');

  fs = require('fs');

  path = require('path');

  uuid = require('node-uuid');

  mkdirp = require('mkdirp');

  clone = require('clone');

  isJSONFile = function(f) {
    return f.substr(-5) === ".json";
  };

  removeFileExtension = function(f) {
    return f.split(".json")[0];
  };

  getIDs = function(a) {
    return a.filter(isJSONFile).map(removeFileExtension);
  };

  readIDsSync = function(d) {
    return getIDs(fs.readdirSync(d));
  };

  readIDs = function(d, cb) {
    return fs.readdir(d, function(err, ids) {
      return cb(err, getIDs(ids));
    });
  };

  canWrite = function(stat) {
    var group, owner;
    owner = (typeof process.getuid === "function" ? process.getuid() : void 0) === stat.uid;
    group = (typeof process.getgid === "function" ? process.getgid() : void 0) === stat.gid;
    return owner && (stat.mode & 128) || group && (stat.mode & 16) || (stat.mode & 2);
  };

  canWriteToFile = function(file, cb) {
    return fs.exists(file, function(e) {
      if (!e) {
        return cb(null);
      }
      return fs.stat(file, function(err, s) {
        if (err) {
          return cb(err);
        }
        if (canWrite(s)) {
          return cb(null);
        } else {
          return cb(new Error("File is protected"));
        }
      });
    });
  };

  canWriteToFileSync = function(file) {
    if (!fs.existsSync(file)) {
      return;
    }
    if (canWrite(fs.statSync(file))) {

    } else {
      throw new Error("File is protected");
    }
  };

  getObjectFromFileSync = function(id) {
    var e;
    try {
      return JSON.parse(fs.readFileSync(this._getFileName(id), "utf8"));
    } catch (_error) {
      e = _error;
      console.error(e);
      return e;
    }
  };

  getObjectFromFile = function(id, cb) {
    return fs.readFile(this._getFileName(id), "utf8", function(err, o) {
      var e;
      if (err != null) {
        return cb(err);
      }
      try {
        return cb(null, JSON.parse(o));
      } catch (_error) {
        e = _error;
        console.error(e);
        return cb(e);
      }
    });
  };

  saveObjectToFile = function(o, file, cb) {
    var e, indent, json, tmpFileName;
    indent = this._pretty ? 2 : void 0;
    try {
      json = JSON.stringify(o, null, indent);
    } catch (_error) {
      e = _error;
      if (cb != null) {
        return cb(e);
      } else {
        return e;
      }
    }
    tmpFileName = file + uuid.v4() + ".tmp";
    if (cb != null) {
      return canWriteToFile(file, function(err) {
        if (err) {
          return cb(err);
        }
        return fs.writeFile(tmpFileName, json, 'utf8', function(err) {
          if (err) {
            return cb(err);
          }
          return fs.rename(tmpFileName, file, cb);
        });
      });
    } else {
      try {
        canWriteToFileSync(file);
        fs.writeFileSync(tmpFileName, json, 'utf8');
        return fs.renameSync(tmpFileName, file);
      } catch (_error) {
        e = _error;
        return e;
      }
    }
  };

  id2fileName = function(id, dir) {
    return path.join(dir, "" + id + ".json");
  };

  save = function(id, o, cb) {
    var backup, data, done, file, k;
    if (typeof id === "object") {
      cb = o;
      o = id;
      id = null;
    }
    if (id == null) {
      id = uuid.v4();
    }
    file = this._getFileName(id);
    o = clone(o);
    if (this._saveId) {
      if ((typeof (k = this._saveId)) === 'string' && k.length > 0) {
        o[k] = id;
      } else {
        o.id = id;
      }
    }
    data = this._single ? (backup = this._cache[id], this._cache[id] = o, this._cache) : o;
    done = (function(_this) {
      return function(err) {
        if (err != null) {
          if (_this._single) {
            _this._cache[id] = backup;
          }
          if (cb != null) {
            return cb(err);
          } else {
            return err;
          }
        } else {
          _this._cache[id] = o;
          if (cb != null) {
            return cb(null, id);
          } else {
            return id;
          }
        }
      };
    })(this);
    if (this._memory) {
      return done();
    } else {
      if (cb != null) {
        return saveObjectToFile.call(this, data, file, done);
      } else {
        return done(saveObjectToFile.call(this, data, file));
      }
    }
  };

  get = function(id, cb) {
    var done, err, o;
    o = clone(this._cache[id]);
    if (o != null) {
      return (cb != null ? cb(null, o) : o);
    }
    done = (function(_this) {
      return function(err, o) {
        var e, item;
        if (err) {
          e = new Error("could not load data");
          if (cb != null) {
            return cb(e);
          } else {
            return e;
          }
        }
        item = _this._single ? o[id] : o;
        if (item == null) {
          e = new Error("could not load data");
          if (cb != null) {
            return cb(e);
          } else {
            return e;
          }
        }
        _this._cache[id] = item;
        if (cb != null) {
          return cb(null, item);
        } else {
          return item;
        }
      };
    })(this);
    if (this._memory) {
      return done(null, o);
    } else {
      if (cb != null) {
        return getObjectFromFile.call(this, id, done);
      } else {
        err = (o = getObjectFromFileSync.call(this, id)) instanceof Error;
        return done(err, o);
      }
    }
  };

  remove = function(id, cb) {
    var backup, done, e, err, file, o;
    file = this._getFileName(id);
    if (this._single) {
      backup = this._cache[id];
      this._cache.splice(id, 1);
      done = (function(_this) {
        return function(err) {
          if (err != null) {
            _this._cache[id] = backup;
            if (cb != null) {
              return cb(err);
            } else {
              return err;
            }
          } else {
            return typeof cb === "function" ? cb(null) : void 0;
          }
        };
      })(this);
      if (this._memory) {
        return done();
      } else {
        if (cb != null) {
          return saveObjectToFile.call(this, this._cache, file, done);
        } else {
          err = (o = saveObjectToFile.call(this, this._cache, file)) instanceof Error;
          return done(err, o);
        }
      }
    } else {
      done = (function(_this) {
        return function(err) {
          if (err != null) {
            return (cb != null ? cb(err) : err);
          }
          delete _this._cache[id];
          if (cb != null) {
            return cb(null);
          }
        };
      })(this);
      if (this._memory) {
        return done();
      } else {
        if (cb != null) {
          return fs.unlink(file, done);
        } else {
          try {
            return done(fs.unlinkSync(file));
          } catch (_error) {
            e = _error;
            return done(e);
          }
        }
      }
    }
  };

  Store = (function() {
    function Store(name, opt) {
      var fn;
      this.name = name != null ? name : 'store';
      if (opt == null) {
        opt = {};
      }
      this._single = opt.single === true || opt.type === 'single';
      this._pretty = opt.pretty === true;
      this._memory = opt.memory === true || opt.type === 'memory';
      this._saveId = opt.saveId;
      if (isJSONFile(this.name)) {
        this.name = this.name.split(".json")[0];
        this._single = true;
      }
      this._dir = path.resolve(this.name);
      if (this._single) {
        this._dir = path.dirname(this._dir);
      }
      this._cache = {};
      if (!this._memory) {
        mkdirp.sync(this._dir);
      }
      if (this._single) {
        fn = this._getFileName();
        if (!this._memory) {
          if (!fs.existsSync(fn)) {
            if (fs.writeFileSync(fn, "{}", 'utf8')) {
              throw new Error("could not create database");
            }
          }
        }
        this._cache = this.allSync();
      }
    }

    Store.prototype._getFileName = function(id) {
      if (this._single) {
        return path.join(this._dir, (path.basename(this.name)) + ".json");
      } else {
        return id2fileName(id, this._dir);
      }
    };

    Store.prototype.save = function(id, o, cb) {
      if (cb == null) {
        cb = function() {};
      }
      return save.call(this, id, o, cb);
    };

    Store.prototype.saveSync = function(id, o) {
      return save.call(this, id, o);
    };

    Store.prototype.get = function(id, cb) {
      if (cb == null) {
        cb = function() {};
      }
      return get.call(this, id, cb);
    };

    Store.prototype.getSync = function(id) {
      return get.call(this, id);
    };

    Store.prototype["delete"] = function(id, cb) {
      return remove.call(this, id, cb);
    };

    Store.prototype.deleteSync = function(id) {
      return remove.call(this, id);
    };

    Store.prototype.all = function(cb) {
      if (cb == null) {
        cb = function() {};
      }
      if (this._memory) {
        return cb(null, this._cache);
      } else if (this._single) {
        return getObjectFromFile.call(this, void 0, cb);
      } else {
        return readIDs(this._dir, (function(_this) {
          return function(err, ids) {
            var all, id, loaders, that;
            if (err != null) {
              return cb(err);
            }
            that = _this;
            all = {};
            loaders = (function() {
              var _i, _len, _results;
              _results = [];
              for (_i = 0, _len = ids.length; _i < _len; _i++) {
                id = ids[_i];
                _results.push((function(id) {
                  return function(cb) {
                    return that.get(id, function(err, o) {
                      if (err == null) {
                        all[id] = o;
                      }
                      return cb(err);
                    });
                  };
                })(id));
              }
              return _results;
            })();
            return async.parallel(loaders, function(err) {
              return cb(err, all);
            });
          };
        })(this));
      }
    };

    Store.prototype.allSync = function() {
      var db, f, item, objects, _i, _len, _ref;
      if (this._memory) {
        return this._cache;
      }
      if (this._single) {
        db = getObjectFromFileSync.apply(this);
        if (typeof db !== "object") {
          throw new Error("could not load database");
        }
        return db;
      } else {
        objects = {};
        _ref = readIDsSync(this._dir);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          f = _ref[_i];
          item = getObjectFromFileSync.call(this, f);
          if (item != null) {
            objects[f] = item;
          } else {
            console.error("could not load '" + f + "'");
          }
        }
        return objects;
      }
    };

    return Store;

  })();

  module.exports = Store;

}).call(this);
