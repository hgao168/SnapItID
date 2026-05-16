const rulesForm = document.getElementById("rules-form");
const complianceForm = document.getElementById("compliance-form");
const rulesResult = document.getElementById("rules-result");
const complianceResult = document.getElementById("compliance-result");

const apiBase = "https://api.snapitid.ai";

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

rulesForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const countryCode = document.getElementById("countryCode").value.trim().toUpperCase();
  rulesResult.textContent = "Loading...";

  try {
    const data = await fetchJSON(`${apiBase}/api/rules/${countryCode}`);
    rulesResult.textContent = pretty(data);
  } catch (error) {
    rulesResult.textContent = pretty({ error: error.message });
  }
});

complianceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    photoID: document.getElementById("photoID").value.trim(),
    countryCode: document.getElementById("complianceCountry").value.trim().toUpperCase(),
    documentType: document.getElementById("documentType").value,
  };

  complianceResult.textContent = "Loading...";

  try {
    const data = await fetchJSON(`${apiBase}/api/compliance/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    complianceResult.textContent = pretty(data);
  } catch (error) {
    complianceResult.textContent = pretty({ error: error.message });
  }
});
