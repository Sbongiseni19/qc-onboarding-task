// dashboard.js
// Only responsible for: reading form inputs, sending requests to
// applications-handler, handling responses, updating the DOM, and
// managing sessionStorage. No validation logic beyond basic non-empty
// checks. No Supabase client. No keys.

const APPLICATIONS_HANDLER_URL = "https://jecvbcdiytxgtvqibdby.supabase.co/functions/v1/applications-handler";

const APPROVED_INSTITUTIONS = [
  "University of Cape Town (UCT)",
  "University of the Witwatersrand (Wits)",
  "University of Pretoria (UP)",
  "Stellenbosch University (SU)",
  "University of Johannesburg (UJ)",
  "University of KwaZulu-Natal (UKZN)",
  "University of the Free State (UFS)",
  "Nelson Mandela University (NMU)",
  "Rhodes University (RU)",
  "University of the Western Cape (UWC)",
  "University of Limpopo (UL)",
  "University of Zululand (UniZulu)",
  "Walter Sisulu University (WSU)",
  "University of Fort Hare (UFH)",
  "University of Venda (Univen)",
  "North-West University (NWU)",
  "University of South Africa (UNISA)",
  "University of Mpumalanga (UMP)",
  "Sol Plaatje University (SPU)",
  "Tshwane University of Technology (TUT)",
  "Cape Peninsula University of Technology (CPUT)",
  "Durban University of Technology (DUT)",
  "Vaal University of Technology (VUT)",
  "Central University of Technology (CUT)",
  "Mangosuthu University of Technology (MUT)",
  "Ekurhuleni East TVET College",
  "Tshwane North TVET College",
  "Sedibeng TVET College",
  "Motheo TVET College",
  "Boland TVET College",
  "False Bay TVET College",
  "Coastal KZN TVET College",
  "Umgungundlovu TVET College",
];

const token = sessionStorage.getItem("qc_token");

// The <head> guard already redirects if there's no token, but keep this
// as a safety net in case dashboard.js somehow runs without it.
if (!token) {
  window.location.replace("index.html");
}

function goToLoginExpired() {
  sessionStorage.removeItem("qc_token");
  window.location.replace("index.html");
}

// ---------- Populate institution dropdown ----------

const institutionSelect = document.getElementById("institution");
APPROVED_INSTITUTIONS.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  institutionSelect.appendChild(opt);
});

// ---------- Ledger rendering ----------

const ledgerList = document.getElementById("ledgerList");
const ledgerSub = document.getElementById("ledgerSub");

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function renderEmptyState() {
  ledgerList.innerHTML = `
    <li class="ledger-empty">
      <div class="ledger-empty-mark">—</div>
      <div>No applications recorded yet. Add your first one to begin your ledger.</div>
    </li>
  `;
}

function applicationToListItem(app) {
  const li = document.createElement("li");
  li.className = "ledger-item";

  const sealClass = app.status === "submitted" ? "seal--submitted" : "seal--draft";
  const sealLabel = app.status === "submitted" ? "Submitted" : "Draft";

  li.innerHTML = `
    <div class="ledger-item-top">
      <div class="ledger-institution">${escapeHtml(app.institution)}</div>
      <span class="seal ${sealClass}">${sealLabel}</span>
    </div>
    <div class="ledger-course">${escapeHtml(app.course)} · ${escapeHtml(app.academic_year)}</div>
    <div class="ledger-meta">Added ${formatDate(app.created_at)}</div>
    ${app.notes ? `<div class="ledger-notes">${escapeHtml(app.notes)}</div>` : ""}
  `;
  return li;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function renderApplications(applications) {
  ledgerList.innerHTML = "";
  if (!applications || applications.length === 0) {
    renderEmptyState();
    return;
  }
  applications.forEach((app) => {
    ledgerList.appendChild(applicationToListItem(app));
  });
}

function prependApplication(app) {
  // Remove empty state if present.
  const empty = ledgerList.querySelector(".ledger-empty");
  if (empty) empty.remove();
  ledgerList.insertBefore(applicationToListItem(app), ledgerList.firstChild);
}

// ---------- Load applications on page load ----------

async function loadApplications() {
  try {
    const res = await fetch(APPLICATIONS_HANDLER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "load" }),
    });

    if (res.status === 401) {
      goToLoginExpired();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      ledgerSub.textContent = data.error || "Could not load your applications.";
      renderEmptyState();
      return;
    }

    ledgerSub.textContent = `${data.applications.length} application${data.applications.length === 1 ? "" : "s"} on record.`;
    renderApplications(data.applications);
  } catch (err) {
    ledgerSub.textContent = "Could not reach the server. Please refresh and try again.";
  }
}

loadApplications();

// ---------- Add application ----------

const addForm = document.getElementById("addForm");
const addError = document.getElementById("addError");
const addSubmit = document.getElementById("addSubmit");

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  addError.hidden = true;

  const institution = institutionSelect.value;
  const course = document.getElementById("course").value.trim();
  const academic_year = document.getElementById("academicYear").value;
  const status = addForm.querySelector('input[name="status"]:checked').value;
  const notes = document.getElementById("notes").value.trim();

  if (!institution || !course || !academic_year) {
    addError.textContent = "Please complete all required fields.";
    addError.hidden = false;
    return;
  }

  addSubmit.disabled = true;
  addSubmit.textContent = "Adding…";

  try {
    const res = await fetch(APPLICATIONS_HANDLER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "add", institution, course, academic_year, status, notes }),
    });

    if (res.status === 401) {
      goToLoginExpired();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      addError.textContent = data.error || "Could not add application. Please try again.";
      addError.hidden = false;
      return;
    }

    prependApplication(data.application);
    ledgerSub.textContent = `${ledgerList.querySelectorAll(".ledger-item").length} applications on record.`;
    addForm.reset();
    addForm.querySelector('input[name="status"][value="draft"]').checked = true;
  } catch (err) {
    addError.textContent = "Could not reach the server. Please try again.";
    addError.hidden = false;
  } finally {
    addSubmit.disabled = false;
    addSubmit.textContent = "Add Application";
  }
});

// ---------- Logout ----------

document.getElementById("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("qc_token");
  window.location.href = "index.html";
});
