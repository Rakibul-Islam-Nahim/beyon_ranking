// ========== HEADER LOADING AND CHART SUPPORT ==========
function loadHeader() {
  const headerContainer = document.getElementById("common-header");
  if (!headerContainer) return;
  fetch("../header.html")
    .then((res) => res.text())
    .then((data) => {
      headerContainer.innerHTML = data;
      renderDropdownAuth();
      initializeChart();
      setupDropdownHide();
    })
    .catch((err) => {
      console.error("Error loading header:", err);
    });
}

// ========== RENDER LOGIN/LOGOUT IN DROPDOWN ==========

async function renderDropdownAuth() {
  const dropdownAuth = document.getElementById("dropdown-auth");
  if (!dropdownAuth) return;

  try {
    await fetch("http://localhost:3000/api/auth/status", {
      credentials: "include",
    });
    const data = await resp.json();
    dropdownAuth.innerHTML = "";
    Console.log(data.loggedIn);
    if (data.loggedIn) {
      // Show Logout button
      const logoutBtn = document.createElement("button");
      logoutBtn.textContent = "Logout";
      logoutBtn.className = "nav-btn";
      logoutBtn.style.background = "none";
      logoutBtn.style.border = "none";
      logoutBtn.style.color = "#ff4c60";
      logoutBtn.style.font = "inherit";
      logoutBtn.style.cursor = "pointer";
      logoutBtn.style.width = "100%";
      logoutBtn.style.textAlign = "left";
      logoutBtn.style.padding = "10px 15px";
      logoutBtn.onclick = async () => {
        await fetch("http://localhost:3000/logout", { method: "POST" });
        window.location = "/index.html";
      };
      dropdownAuth.appendChild(logoutBtn);
    } else {
      // Show Login link
      const loginA = document.createElement("a");
      loginA.href = "login.html";
      loginA.textContent = "Login";
      loginA.className = "nav-btn";
      loginA.style.color = "#ff4c60";
      loginA.style.display = "block";
      loginA.style.padding = "10px 15px";
      dropdownAuth.appendChild(loginA);
    }
  } catch (err) {
    dropdownAuth.innerHTML = "";
    const loginA = document.createElement("a");
    loginA.href = "login.html";
    loginA.textContent = "Login";
    loginA.className = "nav-btn";
    loginA.style.color = "#ff4c60";
    loginA.style.display = "block";
    loginA.style.padding = "10px 15px";
    dropdownAuth.appendChild(loginA);
  }
}

// ========== CHART LOGIC FOR DASHBOARD ==========
function initializeChart() {
  const ctx = document.getElementById("skillChart");
  if (!ctx || !window.Chart) return;
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: [
        "Dynamic Programing",
        "Reverse Engineering",
        "Digital Forensics",
        "BackTracing",
        "Cryptography",
      ],
      datasets: [
        {
          label: "Skill Matrix",
          data: [30, 25, 15, 10, 20],
          backgroundColor: [
            "#ff6384",
            "#36a2eb",
            "#ffce56",
            "#4bc0c0",
            "#9966ff",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
      },
    },
  });
}

// ========== DROPDOWN MENU LOGIC ==========
function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu");
  if (!menu) return;
  menu.style.display = menu.style.display === "block" ? "none" : "block";
  if (menu.style.display === "block") renderDropdownAuth();
}

function setupDropdownHide() {
  window.addEventListener("click", function (e) {
    const menu = document.getElementById("dropdownMenu");
    const icon = document.querySelector(".menu-icon");
    if (!menu || !icon) return;
    if (!menu.contains(e.target) && !icon.contains(e.target)) {
      menu.style.display = "none";
    }
  });
}

// ========== AUTOLOAD ON STARTUP ==========
document.addEventListener("DOMContentLoaded", loadHeader);
