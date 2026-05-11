/**
 * Lightweight i18n for static pages.
 * - Uses localStorage key "det_lang_v1"
 * - Defaults to navigator.language (ru/en) fallback to "en"
 * - Applies translations for nodes with [data-i18n="key"]
 */
(function (global) {
  var STORAGE_KEY = "det_lang_v1";

  function normalizeLang(code) {
    var c = String(code || "").trim().toLowerCase();
    if (!c) return "";
    // "en-US" -> "en"
    return c.split("-")[0];
  }

  function defaultLang() {
    // Product preference: always default to English.
    // We still keep the dictionary for other languages (and allow programmatic override),
    // but if there is no saved choice we start with "en".
    return "en";
  }

  var dict = {
    en: {
      "common.loading": "Loading…",
      "common.overallScore": "Overall Score",
      "common.individualSubscores": "Individual Subscores",
      "common.integratedSubscores": "Integrated Subscores",

      "score.certifiedTest": "Certified Test",
      "score.shareScore": "Share score",
      "score.certificate": "Certificate",

      "cert.toolbarTitle": "Certificate",
      "cert.print": "Print",
      "cert.official": "OFFICIAL CERTIFICATE",
      "cert.certificateIdLabel": "Certificate ID:",
      "cert.linkLabel": "Link:",
      "cert.verifyPrefix": "Verify this certificate’s authenticity at",
      "cert.printPdfHint":
        "Clean PDF: in the print dialog turn off “Headers and footers” (Chrome: More settings).",

      "cert.dobPrefix": "Date of birth:",
      "cert.takenPrefix": "Test taken:",

      "metrics.speaking": "Speaking",
      "metrics.writing": "Writing",
      "metrics.reading": "Reading",
      "metrics.listening": "Listening",
      "metrics.production": "Production",
      "metrics.literacy": "Literacy",
      "metrics.comprehension": "Comprehension",
      "metrics.conversation": "Conversation",

      "metricDesc.production": "Ability to speak and write",
      "metricDesc.literacy": "Ability to write and read",
      "metricDesc.comprehension": "Ability to read and listen",
      "metricDesc.conversation": "Ability to listen and speak",

      "toast.linkCopied": "Link copied",
      "error.badLink": "Invalid link.",
    },
    ru: {
      "common.loading": "Загрузка…",
      "common.overallScore": "Общий балл",
      "common.individualSubscores": "Отдельные навыки",
      "common.integratedSubscores": "Сводные навыки",

      "score.certifiedTest": "Сертифицированный тест",
      "score.shareScore": "Поделиться результатом",
      "score.certificate": "Сертификат",

      "cert.toolbarTitle": "Сертификат",
      "cert.print": "Распечатать",
      "cert.official": "ОФИЦИАЛЬНЫЙ СЕРТИФИКАТ",
      "cert.certificateIdLabel": "ID сертификата:",
      "cert.linkLabel": "Ссылка:",
      "cert.verifyPrefix": "Проверьте подлинность сертификата на",
      "cert.printPdfHint":
        "Чистый PDF: в окне печати отключите «Колонтитулы» (Chrome: Ещё настройки → Headers and footers).",

      "cert.dobPrefix": "Дата рождения:",
      "cert.takenPrefix": "Экзамен сдан:",

      "metrics.speaking": "Говорение",
      "metrics.writing": "Письмо",
      "metrics.reading": "Чтение",
      "metrics.listening": "Аудирование",
      "metrics.production": "Продукция",
      "metrics.literacy": "Грамотность",
      "metrics.comprehension": "Понимание",
      "metrics.conversation": "Разговор",

      "metricDesc.production": "Умение говорить и писать",
      "metricDesc.literacy": "Умение писать и читать",
      "metricDesc.comprehension": "Умение читать и слушать",
      "metricDesc.conversation": "Умение слушать и говорить",

      "toast.linkCopied": "Ссылка скопирована",
      "error.badLink": "Неверная ссылка.",
    },
  };

  function getLang() {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY)) || defaultLang();
    } catch (e) {
      return defaultLang();
    }
  }

  function setLang(code) {
    var v = normalizeLang(code) || defaultLang();
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch (e) {}
    apply(document);
    return v;
  }

  function t(key) {
    var lang = getLang();
    var table = dict[lang] || dict.en;
    return (table && table[key]) || (dict.en && dict.en[key]) || key;
  }

  function apply(root) {
    var lang = getLang();
    try {
      document.documentElement.setAttribute("lang", lang);
    } catch (e) {}

    // Translate text nodes.
    var nodes = (root || document).querySelectorAll("[data-i18n]");
    nodes.forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    var titleNodes = (root || document).querySelectorAll("[data-i18n-title]");
    titleNodes.forEach(function (el) {
      var tk = el.getAttribute("data-i18n-title");
      if (!tk) return;
      el.setAttribute("title", t(tk));
    });

    // Translate common loader text if present.
    var loaderText = document.querySelector("#det-page-loader span");
    if (loaderText) loaderText.textContent = t("common.loading");
  }

  global.DET_i18n = {
    dict: dict,
    getLang: getLang,
    setLang: setLang,
    t: t,
    apply: apply,
  };

  // Apply once on load.
  try {
    if (document && document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          apply(document);
        },
        { once: true }
      );
    } else {
      apply(document);
    }
  } catch (e) {}
})(typeof window !== "undefined" ? window : this);

