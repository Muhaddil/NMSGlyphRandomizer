const validPortalKeys = '0123456789ABCDEF';

const randomGlyph = () => {
  return validPortalKeys[Math.floor(Math.random() * validPortalKeys.length)];
};

const generateGlyphs = () => {
  const regionInput = document.getElementById("regionInput").value.trim().toUpperCase();
  
  let glyphs = "0";

  for (let i = 1; i <= 3; i++) {
    glyphs += randomGlyph();
  }

  if (regionInput.length >= 12) {
    for (let i = 4; i < 12; i++) {
      if (validPortalKeys.includes(regionInput[i])) {
        glyphs += regionInput[i];
      } else {
        return "";
      }
    }
  } else if (regionInput.length > 0 && regionInput.length < 12) {
    for (let i = 0; i < 8; i++) {
      glyphs += randomGlyph();
      showNotification(i18next.t("fullportalcode"), "error");
    }
  } else {
    for (let i = 0; i < 8; i++) {
      glyphs += randomGlyph();
    }
  }

  while (glyphs.length < 12) {
    glyphs += randomGlyph();
  }

  return glyphs;
};

document.addEventListener("DOMContentLoaded", () => {
  const generateButton = document.getElementById("generateButton");
  const copyButton = document.getElementById("copyButton");
  const glyphOutput = document.getElementById("glyphOutput");
  const glyphOutputHex = document.getElementById("glyphOutputHex");

  generateButton.disabled = false;
  copyButton.disabled = true;
  // copyButton.style.display = "none";

  glyphOutput.innerHTML = "";
  glyphOutputHex.innerHTML = "";
});

const displayRandomGlyphs = () => {
  const generateButton = document.getElementById("generateButton");
  const copyButton = document.getElementById("copyButton");
  const glyphOutput = document.getElementById("glyphOutput");
  const glyphOutputHex = document.getElementById("glyphOutputHex");

  generateButton.disabled = true;
  copyButton.disabled = true;

  const glyphs = generateGlyphs();

  if (!glyphs) {
    generateButton.disabled = false;
    return;
  }

  const portalCodeText = i18next.t("portalCode");

  glyphOutput.innerHTML = Array.from(
    { length: 12 },
    (_, i) => `<span id="glyph${i}" class="glyph"></span>`
  ).join("");

  glyphOutputHex.innerHTML = `
    <span id="portalText" class="glyphHex">${portalCodeText}</span>
    ${Array.from(
      glyphs,
      (_, i) => `<span id="glyphHex${i}" class="glyphHex"></span>`
    ).join("")}
  `;

  glyphs.split("").forEach((glyph, i) => {
    setTimeout(() => {
      const glyphElement = document.getElementById(`glyph${i}`);
      glyphElement.classList.add("spin");

      const intervalId = setInterval(() => {
        glyphElement.textContent = randomGlyph();
      }, 100);

      setTimeout(() => {
        clearInterval(intervalId);
        glyphElement.textContent = glyph;

        if (i === glyphs.length - 1) {
          generateButton.disabled = false;
          copyButton.disabled = false;
          copyButton.classList.remove("hidden");
          copyButton.classList.add("visible");
        }
      }, 1000);
    }, i * 200);

    setTimeout(() => {
      const glyphHexElement = document.getElementById(`glyphHex${i}`);
      glyphHexElement.classList.add("spin");

      const intervalIdHex = setInterval(() => {
        glyphHexElement.textContent = randomGlyph();
      }, 100);

      setTimeout(() => {
        clearInterval(intervalIdHex);
        glyphHexElement.textContent = glyph;
      }, 1000);
    }, i * 200);
  });

  copyButton.dataset.clipboard = glyphs;
};

export const copyToClipboard = () => {
  const copyButton = document.getElementById("copyButton");
  const textToCopy = copyButton.dataset.clipboard;

  navigator.clipboard.writeText(textToCopy).then(
    () => {
      showNotification(i18next.t("copiedSuccess"), "success");
    },
    () => {
      showNotification(i18next.t("copiedFail"), "error");
    }
  );
};

const showNotification = (message, type) => {
  let notification = document.createElement("div");
  notification.className = `notification ${type === "error" ? "error" : ""}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("visible");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("visible");
    setTimeout(() => notification.remove(), 500);
  }, 3000);
};

window.displayRandomGlyphs = displayRandomGlyphs;
window.copyToClipboard = copyToClipboard;
window.displayRandomGlyphs = displayRandomGlyphs;

// Function to populate the language options
const populateLanguageOptions = () => {
  const select = document.getElementById("lang");
  const languageNames = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    eu: "Euskara",
  };
  Object.keys(i18next.options.resources).forEach((lang) => {
    const option = document.createElement("option");
    option.value = lang;
    option.text = languageNames[lang];
    select.add(option);
  });
};

// Function to change language
window.changeLanguage = () => {
  const lang = document.getElementById("lang").value;
  i18next.changeLanguage(lang);
  localStorage.setItem("i18nextLng", lang);
  $("body").localize();
};

// Initialize i18next
i18next.init(
  {
    lng:
      localStorage.getItem("i18nextLng") ||
      navigator.language.split("-")[0] ||
      "en", // Language fallback to browser language
    resources: {
      en: {
        translation: {
          title: "NMS Glyph Generator",
          header: "NMS Glyph Generator",
          button: "Generate Glyphs",
          portalCode: "Portal Code:",
          copyButton: "Copy",
          copiedSuccess: "Code copied to clipboard!",
          copiedFail: "Error copying the code.",
          glyphinput: "Glyphs (12): Optional",
          fullportalcode: "You need to insert the full portal-code!",
        },
      },
      es: {
        translation: {
          title: "Generador de Glifos para NMS",
          header: "Generador de Glifos para NMS",
          button: "Generar Glifos",
          portalCode: "Código del Portal:",
          copyButton: "Copiar",
          copiedSuccess: "¡Código copiado al portapapeles!",
          copiedFail: "Error al copiar el código.",
          glyphinput: "Glifos (12): Opcional",
          fullportalcode: "¡Es necesario insertar el código completo del portal!",
        },
      },
      fr: {
        translation: {
          title: "Générateur de glyphes NMS",
          header: "Générateur de glyphes NMS",
          button: "Générer des glyphes",
          portalCode: "Code du portail :",
          copyButton: "Copier",
          copiedSuccess: "Code copié dans le presse-papiers !",
          copiedFail: "Erreur lors de la copie du code.",
          glyphinput: "Glyphes (12): Facultatif",
          fullportalcode: "Vous devez insérer le code complet du portail !",
        },
      },
      de: {
        translation: {
          title: "NMS Glyph Generator",
          header: "NMS Glyph Generator",
          button: "Glyphs generieren",
          portalCode: "Portal-Code:",
          copyButton: "Kopieren",
          copiedSuccess: "Code in die Zwischenablage kopiert!",
          copiedFail: "Fehler beim Kopieren des Codes.",
          glyphinput: "Glyphs (12): Optional",
          fullportalcode: "Sie müssen den vollständigen Portalcode eingeben!",
        },
      },
      eu: {
        translation: {
          title: "NMS Glifo Sortzailea",
          header: "NMS Glifo Sortzailea",
          button: "Sortu Glifoak",
          portalCode: "Atariaren Kodea:",
          copyButton: "Kopiatu",
          copiedSuccess: "Kodea ondo kopiatu da!",
          copiedFail: "Errorea kodea kopiatzerakoan.",
          glyphinput: "Glifoak (12): Aukerakoa",
          fullportalcode: "Atariaren kode osoa sartu behar duzu!",
        },
      },
    },
  },
  (err, t) => {
    // Initialize the jquery-i18next library
    jqueryI18next.init(i18next, $);
    // Translate the entire body
    $("body").localize();

    // This autopopulates the language options in the select
    populateLanguageOptions();

    // This selects the correct language option in the select
    const lang =
      localStorage.getItem("i18nextLng") || i18next.language.split("-")[0]; // Get the selected language from localStorage or navigator.language
    document.getElementById("lang").value = lang;
  }
);
