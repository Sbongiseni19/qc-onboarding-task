// auth.js
// Only responsible for: reading form inputs, sending requests to auth-handler,
// handling responses, updating the DOM, and managing sessionStorage.
// No validation logic beyond basic non-empty checks. No Supabase client. No keys.

const AUTH_HANDLER_URL = "https://jecvbcdiytxgtvqibdby.supabase.co/functions/v1/auth-handler";

// ---------- Tab switching ----------

const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const panelLogin = document.getElementById("panelLogin");
const panelSignup = document.getElementById("panelSignup");

function showLogin() {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  panelLogin.classList.add("active");
  panelSignup.classList.remove("active");
}

function showSignup() {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  panelSignup.classList.add("active");
  panelLogin.classList.remove("active");
}

tabLogin.addEventListener("click", showLogin);
tabSignup.addEventListener("click", showSignup);

// ---------- Helpers ----------

function showAlert(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideAlert(el) {
  el.hidden = true;
  el.textContent = "";
}

function setLoading(button, loading, loadingText, defaultText) {
  button.disabled = loading;
  button.textContent = loading ? loadingText : defaultText;
}

// ---------- Sign-up ----------

const signupForm = document.getElementById("signupForm");
const signupError = document.getElementById("signupError");
const signupSuccess = document.getElementById("signupSuccess");
const signupSubmit = document.getElementById("signupSubmit");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(signupError);
  hideAlert(signupSuccess);

  const first_name = document.getElementById("firstName").value.trim();
  const last_name = document.getElementById("lastName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("signupPassword").value;

  // Basic non-empty check only — the edge function enforces the real rules.
  if (!first_name || !last_name || !email || !phone || !password) {
    showAlert(signupError, "Please fill in every field before submitting.");
    return;
  }

  setLoading(signupSubmit, true, "Creating account…", "Create Account");

  try {
    const res = await fetch(AUTH_HANDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "signup", first_name, last_name, email, phone, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(signupError, data.error || "Something went wrong. Please try again.");
      return;
    }

    showAlert(signupSuccess, data.message || "Account created. You can now log in.");
    signupForm.reset();

    // Redirect the user to the login form after a successful sign-up.
    setTimeout(() => {
      showLogin();
      hideAlert(signupSuccess);
    }, 1500);
  } catch (err) {
    showAlert(signupError, "Could not reach the server. Please check your connection and try again.");
  } finally {
    setLoading(signupSubmit, false, "Creating account…", "Create Account");
  }
});

// ---------- Login ----------

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSubmit = document.getElementById("loginSubmit");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert(loginError);

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    showAlert(loginError, "Please enter your email and password.");
    return;
  }

  setLoading(loginSubmit, true, "Logging in…", "Log In");

  try {
    const res = await fetch(AUTH_HANDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      showAlert(loginError, data.error || "Could not log in. Please try again.");
      return;
    }

    // Store the JWT and redirect to the dashboard.
    sessionStorage.setItem("qc_token", data.session.access_token);
    window.location.href = "dashboard.html";
  } catch (err) {
    showAlert(loginError, "Could not reach the server. Please check your connection and try again.");
  } finally {
    setLoading(loginSubmit, false, "Logging in…", "Log In");
  }
});
