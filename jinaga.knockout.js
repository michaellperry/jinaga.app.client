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

  function Mutable(type, entity, defaultValue, user, resource) {
    this.facts = ko.observableArray();
    this.value = ko.computed({
      read: function () {
        var candidates = this.facts();
        if (candidates.length === 0) {
          return defaultValue;
        }
        else {
          return candidates[candidates.length-1].value;
        }
      },
      write: function (value) {
        var fact = {
          type: type,
          entity: entity,
          value: value,
          prior: this.facts()
        };
        if (user)
          fact.user = user;
        if (resource)
          fact.in = resource;
        j.fact(fact);
      },
      owner: this
    });

    this.watch = function () {
      j.watch(entity, [mutablesInEntity], addTo(this), removeFrom(this));
    };

    function addTo(mutable) {
      return function (p) {
        mutable.facts.push(p);
        return p;
      };
    }

    function removeFrom(mutable) {
      return function (p) {
        mutable.facts.remove(p);
      };
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

  Mutable.prototype.inConflict = function () {
    return this.facts().length > 1;
  };

  Mutable.prototype.candidates = function () {
    return this.facts().map(function (f) {
      return f.value;
    });
  };

  return {
    observeStatus: observeStatus,
    observeUser: observeUser,
    Mutable: Mutable
  };
}();