(function (global) {
  var STORAGE_KEY = "det_fake_results_v1";
  var mode = "local";
  var readyResolve;
  var ready = new Promise(function (r) {
    readyResolve = r;
  });

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { results: {} };
      var data = JSON.parse(raw);
      if (!data.results) data.results = {};
      return data;
    } catch (e) {
      return { results: {} };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function localGet(id) {
    if (!id) return null;
    return loadStore().results[id] || null;
  }

  function localUpsert(result) {
    var store = loadStore();
    if (!result.id) {
      result.id =
        global.crypto && global.crypto.randomUUID
          ? global.crypto.randomUUID()
          : "r_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);
    }
    result.updatedAt = Date.now();
    store.results[result.id] = result;
    saveStore(store);
    return result;
  }

  function localDelete(id) {
    var store = loadStore();
    delete store.results[id];
    saveStore(store);
  }

  function localList() {
    var store = loadStore();
    return Object.keys(store.results)
      .map(function (k) {
        return store.results[k];
      })
      .sort(function (a, b) {
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
  }

  function detectMode() {
    return fetch("/api/health", { method: "GET", cache: "no-store" })
      .then(function (res) {
        if (res.ok) mode = "api";
        else mode = "local";
      })
      .catch(function () {
        mode = "local";
      });
  }

  detectMode().then(function () {
    readyResolve();
  });

  function get(id) {
    return ready.then(function () {
      if (mode === "api") {
        return fetch("/api/results/" + encodeURIComponent(id), { cache: "no-store" }).then(function (res) {
          if (res.status === 404) return null;
          if (!res.ok) throw new Error("get failed");
          return res.json();
        });
      }
      return Promise.resolve(localGet(id));
    });
  }

  function upsert(result) {
    return ready.then(function () {
      if (mode === "api") {
        return fetch("/api/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        }).then(function (res) {
          if (!res.ok) throw new Error("save failed");
          return res.json();
        });
      }
      return Promise.resolve(localUpsert(result));
    });
  }

  function remove(id) {
    return ready.then(function () {
      if (mode === "api") {
        return fetch("/api/results/" + encodeURIComponent(id), { method: "DELETE" }).then(function (res) {
          if (res.status === 404) return;
          if (!res.ok) throw new Error("delete failed");
        });
      }
      localDelete(id);
    });
  }

  function list() {
    return ready.then(function () {
      if (mode === "api") {
        return fetch("/api/results", { cache: "no-store" }).then(function (res) {
          if (!res.ok) throw new Error("list failed");
          return res.json();
        });
      }
      return Promise.resolve(localList());
    });
  }

  function exportJson() {
    return ready.then(function () {
      if (mode === "api") {
        return fetch("/api/export", { cache: "no-store" }).then(function (res) {
          if (!res.ok) throw new Error("export failed");
          return res.json().then(function (data) {
            return JSON.stringify(data, null, 2);
          });
        });
      }
      return Promise.resolve(JSON.stringify(loadStore(), null, 2));
    });
  }

  function importJson(text) {
    return ready.then(function () {
      var data = JSON.parse(text);
      if (!data.results) throw new Error("Invalid format");
      if (mode === "api") {
        return fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merge: true, data: data }),
        }).then(function (res) {
          if (!res.ok) throw new Error("import failed");
        });
      }
      var store = loadStore();
      Object.keys(data.results).forEach(function (k) {
        data.results[k].updatedAt = Date.now();
        store.results[k] = data.results[k];
      });
      saveStore(store);
    });
  }

  global.DET_store = {
    ready: ready,
    getMode: function () {
      return mode;
    },
    get: get,
    upsert: upsert,
    remove: remove,
    list: list,
    exportJson: exportJson,
    importJson: importJson,
  };
})(typeof window !== "undefined" ? window : this);
