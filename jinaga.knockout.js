var jko = function () {
  function observeStatus(viewModel) {
    viewModel.error = ko.observable();
    viewModel.queueCount = ko.observable();
    viewModel.loading = ko.observable(false);

    viewModel.status = ko.computed(function () {
      return this.error()
        ? "Error"
        : this.queueCount() > 0
        ? "Saving..."
        : this.loading()
        ? "Loading..."
        : "";
    }, viewModel);

    j.onError(function (message) { viewModel.error(message); });
    j.onProgress(function (queueCount) { viewModel.queueCount(queueCount); });
    j.onLoading(function (loading) { viewModel.loading(loading); });
  }

  function observeUser(viewModel) {
    viewModel.user = ko.observable();
    viewModel.displayName = ko.observable();

    j.login(function (u, profile) {
      if (!u) {
        window.location = loginUrl;
      }
      else {
        viewModel.user(u);
        viewModel.displayName(profile.displayName);
        j.query(u, [namesForUser], function(names) {
          if (names.length != 1 || names[0].value !== profile.displayName) {
            createUserName(u, profile.displayName, names);
          }
        });
      }

      function createUserName(user, value, prior) {
        return j.fact({
          type: "Jinaga.User.Name",
          prior: prior,
          from: user,
          value: value
        });
      }

      function nameIsCurrent(n) {
        return j.not({
          type: "Jinaga.User.Name",
          prior: n
        });
      }

      function namesForUser(u) {
        return j.where({
          type: "Jinaga.User.Name",
          from: u
        }, [nameIsCurrent]);
      }
    });
  }

  function Collection(parent, template, childConstructor, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9) {
    this.items = ko.observableArray();

    this.watch = function () {
      return j.watch(parent, template, addTo(this), removeFrom(this));
    }

    var map = childConstructor ? function(f) {
      return new childConstructor(f, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9);
    } : function (f) {
      return f;
    };

    function addTo(collection) {
      return function (fact) {
        var obj = map(fact);
        collection.items.push(obj);
        return obj;
      };
    }

    function removeFrom(collection) {
      return function (obj) {
        collection.items.remove(obj);
      };
    }
  }

  function Mutable(defaultValue) {
    this.facts = ko.observableArray();

    this.value = ko.computed(function () {
      var candidates = this.facts();
      if (candidates.length === 0) {
        return defaultValue;
      }
      else {
        return candidates[candidates.length-1].value;
      }
    }, this);
  }

  Mutable.prototype.inConflict = function () {
    return this.facts().length > 1;
  };

  Mutable.prototype.candidates = function () {
    return this.facts().map(function (f) {
      return f.value;
    });
  };

  function watchMutable(parent, property, type) {
    return parent.watch([mutablesInEntity], addTo, removeFrom);

    function addTo(vm, p) {
      var mutable = vm[property];
      mutable.facts.push(p);
      return p;
    }

    function removeFrom(vm, p) {
      var mutable = vm[property];
      mutable.facts.remove(p);
    }

    function mutablesInEntity(e) {
      return j.where({
        type: type,
        entity: e
      }, [isCurrent]);
    }

    function isCurrent(p) {
      return j.not({
        type: type,
        prior: p
      });
    }
  }

  return {
    observeStatus: observeStatus,
    observeUser: observeUser,
    Collection: Collection,
    Mutable: Mutable,
    watchMutable: watchMutable
  };
}();