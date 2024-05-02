// Function to generate a random glyph
export const randomGlyph = () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)];

// Function to generate random glyphs
export const generateGlyphs = () => {
  // Generate a string of random glyphs, always starting with '0'
  const glyphs = '0' + Array.from({length: 11}, randomGlyph).join('');
  // Return the glyphs
  return glyphs;
}

export const displayRandomGlyphs = () => {
  // Get the button and output elements from the DOM
  const generateButton = document.getElementById('generateButton');
  const glyphOutput = document.getElementById('glyphOutput');
  
  // Disable the button
  generateButton.disabled = true;
  
  // Generate the glyphs
  const glyphs = generateGlyphs();
  
  // Display the glyphs in the output elements
  // Each glyph is a span with the class 'glyph' and a unique id
  glyphOutput.innerHTML = Array.from({length: 12}, (_, i) => `<span id="glyph${i}" class="glyph"></span>`).join('');
  
  // Add the animation to each glyph
  glyphs.split('').forEach((glyph, i) => {
    setTimeout(() => {
      const glyphElement = document.getElementById(`glyph${i}`);
      glyphElement.classList.add('spin');
      // Change the glyph every 100ms while it's spinning
      const intervalId = setInterval(() => {
        glyphElement.textContent = randomGlyph();
      }, 100);
      // Stop changing the glyph after 1s
      setTimeout(() => {
        clearInterval(intervalId);
        // Set the final glyph
        glyphElement.textContent = glyph;
        // Enable the button after the last glyph has finished spinning
        if (i === glyphs.length - 1) {
          generateButton.disabled = false;
        }
      }, 1000);
    }, i * 200); // Delay the start of each animation
  });
}

// Make the displayRandomGlyphs function globally accessible
window.displayRandomGlyphs = displayRandomGlyphs;

// Function to change language
window.changeLanguage = function() {
  var lang = document.getElementById('lang').value;
  i18next.changeLanguage(lang);
  localStorage.setItem('i18nextLng', lang);
  $('body').localize();
}

// Initialize i18next
i18next.init({
  lng: localStorage.getItem('i18nextLng') || navigator.language || 'en',
  resources: {
    en: {
      translation: {
        title: "NMS Glyph Generator",
        header: "NMS Glyph Generator",
        button: "Generate Glyphs"
      }
    },
    es: {
      translation: {
        title: "Generador de Glifos NMS",
        header: "Generador de Glifos NMS",
        button: "Generar Glifos"
      }
    }
    // Puedes añadir más idiomas aquí
  }
}, function(err, t) {
  // Inicializa la biblioteca jquery-i18next
  jqueryI18next.init(i18next, $);
  // Traduce todo el body
  $('body').localize();
});
