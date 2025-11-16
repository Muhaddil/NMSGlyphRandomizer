* Copy this to the navigator console when all regions fetched.
```js
(() => {
  let raw = JSON.parse(localStorage.getItem("nms_civilizations_cache"));

  if (!raw) {
    console.error("❌ No existe 'nms_civilizations_cache' en localStorage.");
    return;
  }

  while (
    raw &&
    raw.data &&
    !raw.galaxies &&
    raw.data.galaxies &&
    raw.data.data
  ) {
    raw = raw.data;
  }

  if (raw.data && raw.data.galaxies) {
    raw = raw.data;
  }

  if (!raw.galaxies || !raw.data) {
    console.error("❌ Estructura inesperada. Aquí está el objeto para revisar:", raw);
    return;
  }

  const text = JSON.stringify(raw, null, 2);

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "defaultData.json";
  a.click();

  URL.revokeObjectURL(url);

  console.log("✅ defaultData.json generado correctamente con estructura limpia:", raw);
})();
```

* This will download a json, then simply copy it to the repo.