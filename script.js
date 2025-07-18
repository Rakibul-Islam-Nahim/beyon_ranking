function loadHeader() {
  const headerContainer = document.getElementById("common-header");
  if (!headerContainer) return;

  fetch("../header.html") // adjust path if needed
    .then((res) => res.text())
    .then((data) => {
      headerContainer.innerHTML = data;

      // Now that header is loaded, try to render the chart
      initializeChart();
    })
    .catch((err) => {
      console.error("Error loading header:", err);
    });
}

function initializeChart() {
  const ctx = document.getElementById("skillChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Dynamic Programing", "Reverse Engineering", "Digital Forensics", "BackTracing", "Cryptography"],
      datasets: [
        {
          label: "Skill Matrix",
          data: [30, 25, 15, 10, 20],
          backgroundColor: [
            "#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff"
          ],
          borderWidth: 1
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "white"
          }
        }
      }
    }
  });
}


function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// Optional: Hide dropdown when clicking outside
window.addEventListener("click", function (e) {
  const menu = document.getElementById("dropdownMenu");
  const icon = document.querySelector(".menu-icon");
  if (!menu.contains(e.target) && !icon.contains(e.target)) {
    menu.style.display = "none";
  }
});


// Load header and chart after full DOM is ready
document.addEventListener("DOMContentLoaded", loadHeader);
