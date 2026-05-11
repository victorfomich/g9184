/**
 * Подстановка результатов на index / certificate, чистые URL, лоадер, Share.
 * DET_store: API или localStorage.
 */
(function (global) {
  function getParamR() {
    return new URLSearchParams(location.search).get("r");
  }

  function getParamC() {
    return new URLSearchParams(location.search).get("c");
  }

  /** Slug from /certs/<slug> when server serves certificate.html on that path (no ?c=). */
  function getCertSlugFromPathname() {
    try {
      var prefix = appBasePrefix();
      var path = location.pathname || "";
      if (prefix && path.indexOf(prefix) === 0) {
        path = path.slice(prefix.length) || "/";
      }
      // Host-style: certs.<domain>/<slug>
      if (/^certs\./i.test(String(location.hostname || ""))) {
        var m0 = path.match(/^\/([^/]+)\/?$/);
        if (m0 && m0[1] && m0[1] !== "certificate") return decodeURIComponent(m0[1]);
      }
      // Path-style: <domain>/certs/<slug>
      var m1 = path.match(/^\/certs\/([^/]+)\/?$/);
      if (m1) return decodeURIComponent(m1[1]);
    } catch (e) {}
    return "";
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
    var prefix = appBasePrefix();
    var k = typeof kind === "string" ? kind : "";

    function certsOrigin() {
      try {
        var host = String(location.hostname || "");
        // Prefer certs.<apex> if we're on apex or already on certs.
        if (/^certs\./i.test(host)) return window.location.origin;
        // If on www.<apex> keep apex for certs subdomain
        var apex = host.replace(/^www\./i, "");
        return "https://certs." + apex;
      } catch (e) {
        return window.location.origin;
      }
    }

    // Short public cert URL: certs.<domain>/<certificateId> — must NOT append ?r=.
    if (k === "certs" && id) {
      var slug = String(id).trim();
      if (!slug) return new URL(prefix + "/certificate", window.location.origin).href;
      var u = new URL(certsOrigin());
      u.pathname = "/" + encodeURIComponent(slug);
      u.search = "";
      u.hash = "";
      return u.href;
    }

    var map = {
      score: "/",
      index: "/",
      "index.html": "/",
      certificate: "/certificate",
      "certificate.html": "/certificate",
      certs: "/certs",
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
    var fullPath = prefix + (path === "/" ? "/" : path);
    var url = new URL(fullPath, window.location.origin);
    if (id) url.searchParams.set("r", id);
    return url.href;
  }

  function certShortUrlByCertificateId(certificateId) {
    var cid = String(certificateId || "").trim();
    if (!cid) return "";
    return pageUrl("certs", cid);
  }

  /** Prefer /certs/<certificateId>; fallback /certificate?r=<uuid> if no certificateId. */
  function certificatePublicUrl(result) {
    if (!result) return "";
    var cid = String(result.certificateId || "").trim();
    if (cid) return pageUrl("certs", cid);
    if (result.id) return pageUrl("certificate", result.id);
    return "";
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
    if (certA) {
      var certHref = certificatePublicUrl(result);
      if (certHref) certA.href = certHref;
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
    if (dob) {
      var dobPrefix =
        global.DET_i18n && typeof global.DET_i18n.t === "function"
          ? global.DET_i18n.t("cert.dobPrefix")
          : "Date of birth:";
      dob.textContent = dobPrefix + " " + (result.dob || "—");
    }

    var taken = document.getElementById("cert-exam-line");
    if (taken) {
      var takenPrefix =
        global.DET_i18n && typeof global.DET_i18n.t === "function"
          ? global.DET_i18n.t("cert.takenPrefix")
          : "Test taken:";
      taken.textContent = takenPrefix + " " + (result.examDate || "—");
    }

    var cid = result.certificateId || "";
    var certIdEl = document.getElementById("cert-id-value");
    if (certIdEl) certIdEl.textContent = cid || "—";

    var linkA = document.getElementById("cert-link-url");
    if (linkA) {
      var shortUrl = certShortUrlByCertificateId(result.certificateId);
      if (shortUrl) {
        linkA.href = shortUrl;
        try {
          var u = new URL(shortUrl);
          var host = u.host;
          // "certs.<domain>" look (like Duolingo), but keep same-origin URL.
          linkA.textContent = "certs." + host.replace(/^certs\./, "") + "/" + String(result.certificateId || "");
        } catch (e1) {
          linkA.textContent = String(result.certificateId || "—");
        }
      } else if (result.id) {
        // Fallback if certificateId is missing
        var certPageUrl = pageUrl("certificate", result.id);
        linkA.href = certPageUrl;
        try {
          var u2 = new URL(certPageUrl);
          linkA.textContent = u2.host + u2.pathname + u2.search;
        } catch (e2) {
          linkA.textContent = certPageUrl;
        }
      } else {
        linkA.href = "#";
        linkA.textContent = "—";
      }
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

    // Keep tab title short — Chrome/Safari often put document.title in PDF headers.
    if (full) document.title = full + " · Duolingo English Test";
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

  function sanitizeCertificatePdfFilename() {
    var el = document.getElementById("cert-full-name");
    var s = el && el.textContent ? el.textContent.trim() : "certificate";
    if (!s || s === "—") s = "certificate";
    s = s
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9\u0400-\u04FF_.-]+/g, "")
      .replace(/^[\-.]+|[\-.]+$/g, "");
    if (!s) s = "certificate";
    if (s.length > 80) s = s.slice(0, 80);
    return s + "-DET-certificate.pdf";
  }

  /**
   * Save certificate as a real PDF file (no browser print headers: no date/URL/page in margins).
   * Requires html2pdf.js on the certificate page.
   */
  function saveCertificatePdf() {
    var shell = document.querySelector(".page.det-page-shell .shell");
    if (!shell) return;
    if (typeof global.html2pdf !== "function") {
      var miss =
        global.DET_i18n && typeof global.DET_i18n.t === "function"
          ? global.DET_i18n.t("cert.pdfLibraryMissing")
          : "PDF export is not available (library failed to load).";
      alert(miss);
      return;
    }

    var toolbar = shell.querySelector(".cert-toolbar");
    var prevTb = "";
    if (toolbar) {
      prevTb = toolbar.style.display;
      toolbar.style.display = "none";
    }
    var btn = document.querySelector(".cert-toolbar .print-btn");
    if (btn) btn.setAttribute("disabled", "disabled");

    function restoreUi() {
      if (toolbar) toolbar.style.display = prevTb || "";
      if (btn) btn.removeAttribute("disabled");
    }

    var opts = {
      margin: [8, 8, 8, 8],
      filename: sanitizeCertificatePdfFilename(),
      image: { type: "jpeg", quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        scrollY: 0,
        windowWidth: shell.scrollWidth,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    var fontWait =
      document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontWait
      .then(function () {
        return global.html2pdf().set(opts).from(shell).save();
      })
      .then(function () {
        restoreUi();
      })
      .catch(function (err) {
        restoreUi();
        var msg =
          global.DET_i18n && typeof global.DET_i18n.t === "function"
            ? global.DET_i18n.t("cert.pdfError")
            : "PDF error: " + String((err && err.message) || err);
        alert(msg);
      });
  }

  function showNotFound() {
    var bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText =
      "position:fixed;top:0;left:0;right:0;padding:12px 16px;background:#ffe8e8;color:#8b2e2e;font-family:Nunito,sans-serif;font-size:14px;text-align:center;z-index:9999;";
    bar.textContent =
      global.DET_i18n && typeof global.DET_i18n.t === "function"
        ? global.DET_i18n.t("error.badLink")
        : "Неверная ссылка.";
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
    var certId = getParamC() || getCertSlugFromPathname();
    if (!id && !certId) return;
    setPageLoading(true);
    global.DET_store.ready
      .then(function () {
        if (id) return global.DET_store.get(id);
        if (global.DET_store.findByCertificateId) return global.DET_store.findByCertificateId(certId);
        return global.DET_store.list().then(function (items) {
          for (var i = 0; i < items.length; i++) {
            if (String(items[i].certificateId || "").trim() === String(certId || "").trim()) return items[i];
          }
          return null;
        });
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
      var copiedMsg =
        global.DET_i18n && typeof global.DET_i18n.t === "function"
          ? global.DET_i18n.t("toast.linkCopied")
          : "Ссылка скопирована";
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          toast(copiedMsg);
        } catch (e) {
          prompt("Скопируйте ссылку:", url);
        }
        document.body.removeChild(ta);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            toast(copiedMsg);
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
    getParamC: getParamC,
    getCertSlugFromPathname: getCertSlugFromPathname,
    buildQueryR: buildQueryR,
    pageUrl: pageUrl,
    certShortUrlByCertificateId: certShortUrlByCertificateId,
    certificatePublicUrl: certificatePublicUrl,
    applyToScorePage: applyToScorePage,
    applyToCertificatePage: applyToCertificatePage,
    setPageLoading: setPageLoading,
    initScorePage: initScorePage,
    initCertPage: initCertPage,
    initShareButton: initShareButton,
    saveCertificatePdf: saveCertificatePdf,
  };
})(typeof window !== "undefined" ? window : this);
