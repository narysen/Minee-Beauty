document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    window.location.href = "contact.html";
    return;
  }

  document.getElementById("name").innerText = user.name;
  document.getElementById("username").innerText = user.username;

  const avatar = document.getElementById("avatar");
  const uploadPhoto = document.getElementById("uploadPhoto");

  const savedAvatar = localStorage.getItem("userAvatar");
  if (savedAvatar) avatar.src = savedAvatar;

  document.querySelector(".avatar-frame").onclick = () => {
    uploadPhoto.click();
  };

  uploadPhoto.addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        avatar.src = e.target.result;
        localStorage.setItem("userAvatar", e.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
});

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("userAvatar");
  localStorage.removeItem("addresses");
  window.location.href = "contact.html";
}

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const isHidden =
    section.style.display === "none" ||
    section.style.display === "";

  // close all sections first (clean UI)
  document.querySelectorAll(".orders").forEach(sec => {
    sec.style.display = "none";
  });

  // open selected section
  if (isHidden) {
    section.style.display = "block";

    if (sectionId === "history-section") loadHistory();
    if (sectionId === "address-section") loadAddresses();
  }
}

/* ================= HISTORY ================= */
function loadHistory() {
  fetch("http://localhost:3000/orders")
    .then(res => res.json())
    .then(history => {
      console.log("HISTORY:", history); 

      const historyList = document.getElementById("history-list");
      if (!historyList) return;

      historyList.innerHTML = "";

      if (!Array.isArray(history) || history.length === 0) {
        historyList.innerHTML = "<li>No orders yet</li>";
        return;
      }

      history.forEach(order => {
        const li = document.createElement("li");

        const itemsText = (order.items || [])
          .map(i => `${i.product} (x${i.quantity})`)
          .join(", ");

        li.innerHTML = `
          <strong>${new Date(order.created_at).toLocaleString()}</strong><br>
          👤 ${order.customer_name}<br>
          📍 ${order.address || "No address"}<br>
          💰 $${order.total}<br>
          🛒 ${itemsText}
        `;

        historyList.appendChild(li);
      });
    })
    .catch(err => {
      console.error("History load error:", err);
    });
}