(function (global) {
  var PIN = "1958";
  var IDLE_MS = 30 * 60 * 1000;
  var SK = "det_admin_v1";
  var THROTTLE_MS = 800;

  var lastActivity = Date.now();
  var lastThrottle = 0;
  var idleIntervalId = null;
  var activityBound = false;

  function getStoredLast() {
    try {
      var raw = sessionStorage.getItem(SK);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return typeof o.last === "number" ? o.last : null;
    } catch (e) {
      return null;
    }
  }

  function persistLast(t) {
    sessionStorage.setItem(SK, JSON.stringify({ last: t }));
  }

  function clearSession() {
    sessionStorage.removeItem(SK);
  }

  function sessionStillValid() {
    var t = getStoredLast();
    if (t == null) return false;
    return Date.now() - t < IDLE_MS;
  }

  function onUserActivity() {
    var n = Date.now();
    if (n - lastThrottle < THROTTLE_MS) return;
    lastThrottle = n;
    lastActivity = n;
    persistLast(n);
  }

  function bindActivity() {
    if (activityBound) return;
    activityBound = true;
    ["mousemove", "keydown", "click", "scroll", "touchstart", "wheel"].forEach(function (ev) {
      document.addEventListener(ev, onUserActivity, { passive: true });
    });
  }

  function startIdleWatch() {
    if (idleIntervalId != null) return;
    idleIntervalId = setInterval(function () {
      if (!document.documentElement.classList.contains("js-admin-auth-ok")) return;
      if (Date.now() - lastActivity > IDLE_MS) {
        clearSession();
        global.location.reload();
      }
    }, 20000);
  }

  /**
   * @param {{ onGranted: function() }} opts
   */
  function mount(opts) {
    var loginEl = document.getElementById("admin-login");
    var mainEl = document.getElementById("admin-main");
    var form = document.getElementById("admin-login-form");
    var pinInput = document.getElementById("admin-pin");
    var errEl = document.getElementById("admin-login-err");

    if (!loginEl || !mainEl || !form) return;

    function grant() {
      document.documentElement.classList.add("js-admin-auth-ok");
      if (errEl) errEl.setAttribute("hidden", "");
      if (pinInput) pinInput.value = "";
      lastActivity = Date.now();
      persistLast(lastActivity);
      bindActivity();
      startIdleWatch();
      if (typeof opts.onGranted === "function") opts.onGranted();
    }

    if (sessionStillValid()) {
      var t = getStoredLast();
      lastActivity = t != null ? t : Date.now();
      if (!document.documentElement.classList.contains("js-admin-auth-ok")) {
        document.documentElement.classList.add("js-admin-auth-ok");
      }
      bindActivity();
      startIdleWatch();
      if (typeof opts.onGranted === "function") opts.onGranted();
      return;
    }

    clearSession();
    document.documentElement.classList.remove("js-admin-auth-ok");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = (pinInput && pinInput.value) || "";
      if (v !== PIN) {
        if (errEl) {
          errEl.textContent = "Неверный PIN";
          errEl.removeAttribute("hidden");
        }
        return;
      }
      grant();
    });

    if (pinInput) {
      setTimeout(function () {
        pinInput.focus();
      }, 0);
    }
  }


  global.DET_adminAuth = {
    mount: mount,
  };
})(typeof window !== "undefined" ? window : this);
