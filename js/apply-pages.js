/**
 * Подстановка результатов на index / certificate, чистые URL, лоадер, Share.
 * DET_store: API или localStorage.
 */
(function (global) {
  function getParamR() {
    return new URLSearchParams(location.search).get("r");
  }

  function clampScore(n) {
    var x = Number(n);
    if (Number.isNaN(x)) return 140;
    return Math.min(160, Math.max(10, Math.round(x)));
  }

  function buildQueryR(id) {
    return id ? "?r=" + encodeURIComponent(id) : "";
  }

  function appBasePrefix() {
    var b = global.DET_BASE_PATH || "";
    return String(b).replace(/\/$/, "");
  }

  /**
   * Чистые URL: /, /certificate и т.д.; DET_BASE_PATH для подпапки.
   */
  function pageUrl(kind, id) {
    var map = {
      score: "/",
      index: "/",
      "index.html": "/",
      certificate: "/certificate",
      "certificate.html": "/certificate",
      admin: "/admin",
      "admin.html": "/admin",
    };
    var path = map[kind];
    if (path === undefined) {
      if (typeof kind === "string" && kind.indexOf(".html") !== -1) {
        path = "/" + kind.replace(/^\//, "");
      } else if (typeof kind === "string" && kind.charAt(0) === "/") {
        path = kind;
      } else {
        path = "/" + kind;
      }
    }
    var prefix = appBasePrefix();
    var fullPath = prefix + (path === "/" ? "/" : path);
    var url = new URL(fullPath, window.location.origin);
    if (id) url.searchParams.set("r", id);
    return url.href;
  }

  function applyToScorePage(result) {
    if (!result) return;
    var o = clampScore(result.overall);
    document.documentElement.style.setProperty("--score", String(o));

    var gaugeText = document.getElementById("gauge-overall-score");
    if (gaugeText) gaugeText.textContent = String(o);

    var gw = document.querySelector(".gauge-wrap");
    if (gw) {
      gw.setAttribute("aria-label", "Overall score " + o + ", scale 10 to 160");
    }

    var exam = document.getElementById("exam-date");
    if (exam) exam.textContent = result.examDate || "";

    var map = {
      speaking: result.speaking,
      writing: result.writing,
      reading: result.reading,
      listening: result.listening,
      production: result.production,
      literacy: result.literacy,
      comprehension: result.comprehension,
      conversation: result.conversation,
    };
    Object.keys(map).forEach(function (key) {
      var el = document.querySelector('[data-metric="' + key + '"]');
      if (el && map[key] !== undefined && map[key] !== null && map[key] !== "") {
        el.textContent = String(map[key]);
      }
    });

    var full =
      result.displayName ||
      [result.lastName, result.firstName].filter(Boolean).join(", ") ||
      "";
    if (full) document.title = "DET — " + full;

    var certA = document.getElementById("link-certificate");
    if (certA && result.id) {
      certA.href = pageUrl("certificate", result.id);
    }
  }

  function applyToCertificatePage(result) {
    if (!result) return;
    var o = clampScore(result.overall);
    document.documentElement.style.setProperty("--score", String(o));

    var certGauge = document.getElementById("cert-gauge-score");
    if (certGauge) certGauge.textContent = String(o);

    var full =
      result.displayName ||
      [result.lastName, result.firstName].filter(Boolean).join(", ") ||
      "";
    var nameEl = document.getElementById("cert-full-name");
    if (nameEl) nameEl.textContent = full || "—";

    var dob = document.getElementById("cert-dob-line");
    if (dob) dob.textContent = "Date of birth: " + (result.dob || "—");

    var taken = document.getElementById("cert-exam-line");
    if (taken) taken.textContent = "Test taken: " + (result.examDate || "—");

    var cid = result.certificateId || "";
    var certIdEl = document.getElementById("cert-id-value");
    if (certIdEl) certIdEl.textContent = cid || "—";

    var linkA = document.getElementById("cert-link-url");
    if (linkA && result.id) {
      var certPageUrl = pageUrl("certificate", result.id);
      linkA.href = certPageUrl;
      try {
        var u = new URL(certPageUrl);
        linkA.textContent = u.host + u.pathname + u.search;
      } catch (e1) {
        linkA.textContent = certPageUrl;
      }
    } else if (linkA) {
      linkA.href = "#";
      linkA.textContent = "—";
    }

    var photo = document.getElementById("cert-photo");
    if (photo) {
      if (result.photo) {
        photo.removeAttribute("data-empty");
        photo.src = result.photo;
      } else {
        photo.setAttribute("data-empty", "1");
        photo.src =
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      }
    }

    var cefr = document.getElementById("cert-cefr-title");
    if (cefr && result.cefrLabel) cefr.textContent = result.cefrLabel;

    var nums = ["speaking", "writing", "reading", "listening"];
    nums.forEach(function (k) {
      var el = document.querySelector('#cert-individual [data-metric="' + k + '"]');
      if (el && result[k] !== undefined) el.textContent = String(result[k]);
    });

    var integ = ["production", "literacy", "comprehension", "conversation"];
    integ.forEach(function (k) {
      var el = document.querySelector('#cert-integrated [data-metric="' + k + '"]');
      if (el && result[k] !== undefined) el.textContent = String(result[k]);
    });

    if (full) document.title = "Certificate — " + full;
  }

  function setPageLoading(on) {
    var v = !!on;
    document.documentElement.classList.toggle("det-loading", v);
    var loader = document.getElementById("det-page-loader");
    if (loader) loader.setAttribute("aria-busy", v ? "true" : "false");
  }

  /** Шрифты + фото сертификата (если есть), затем можно убирать лоадер */
  function waitForDeferredAssets() {
    var fontWait =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    return fontWait.then(function () {
      return new Promise(function (resolve) {
        var photo = document.getElementById("cert-photo");
        if (!photo || !photo.getAttribute("src") || photo.complete) return resolve();
        var done = function () {
          resolve();
        };
        photo.addEventListener("load", done, { once: true });
        photo.addEventListener("error", done, { once: true });
      });
    });
  }

  function showNotFound() {
    var bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;padding:12px 16px;background:#ffe8e8;color:#8b2e2e;font-family:Nunito,sans-serif;font-size:14px;text-align:center;z-index:9999;";
    bar.textContent = "Неверная ссылка.";
    document.body.appendChild(bar);
  }

  function initScorePage() {
    var id = getParamR();
    if (!id) return;
    setPageLoading(true);
    global.DET_store.ready
      .then(function () {
        return global.DET_store.get(id);
      })
      .then(function (result) {
        if (!result) {
          setPageLoading(false);
          showNotFound();
          return;
        }
        applyToScorePage(result);
        return waitForDeferredAssets();
      })
      .then(function () {
        setPageLoading(false);
      })
      .catch(function () {
        setPageLoading(false);
        showNotFound();
      });
  }

  function initCertPage() {
    var id = getParamR();
    if (!id) return;
    setPageLoading(true);
    global.DET_store.ready
      .then(function () {
        return global.DET_store.get(id);
      })
      .then(function (result) {
        if (!result) {
          setPageLoading(false);
          showNotFound();
          return;
        }
        applyToCertificatePage(result);
        return waitForDeferredAssets();
      })
      .then(function () {
        setPageLoading(false);
      })
      .catch(function () {
        setPageLoading(false);
        showNotFound();
      });
  }

  function initShareButton(btnId) {
    var btn = document.getElementById(btnId || "btn-share-score");
    if (!btn) return;

    function toast(msg) {
      var t = document.createElement("div");
      t.style.cssText =
        "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 18px;background:#333;color:#fff;border-radius:10px;font-family:Nunito,sans-serif;font-size:14px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,.2);";
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () {
        t.remove();
      }, 2200);
    }

    btn.addEventListener("click", function () {
      var url = window.location.href.split("#")[0];
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast("Ссылка скопирована");
        } catch (e) {
          prompt("Скопируйте ссылку:", url);
        }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            toast("Ссылка скопирована");
          },
          function () {
            fallbackCopy();
          }
        );
      } else {
        fallbackCopy();
      }
    });
  }

  global.DET_pages = {
    getParamR: getParamR,
    buildQueryR: buildQueryR,
    pageUrl: pageUrl,
    applyToScorePage: applyToScorePage,
    applyToCertificatePage: applyToCertificatePage,
    setPageLoading: setPageLoading,
    initScorePage: initScorePage,
    initCertPage: initCertPage,
    initShareButton: initShareButton,
  };
})(typeof window !== "undefined" ? window : this);
