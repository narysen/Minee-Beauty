// MODE: register or login
let isRegister = true;

// ==========================
// LOGOUT
// ==========================
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "contact.html"; 
}

// ==========================
// AUTO LOCATION (GPS)
// ==========================
function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;

        getAddressFromCoords(lat, lng);
      },
      function(error) {
        alert("Location access denied!!");
      }
    );
  } else {
    alert("Geolocation not supported");
  }
}

// ==========================
// CONVERT LAT/LNG → ADDRESS
// ==========================
function getAddressFromCoords(lat, lng) {
  const geocoder = new google.maps.Geocoder();

  const latlng = { lat: lat, lng: lng };

  geocoder.geocode({ location: latlng }, function(results, status) {
    if (status === "OK" && results[0]) {
      document.getElementById("address").value =
        results[0].formatted_address;
    } else {
      console.log("Geocoder failed: " + status);
    }
  });
}

// ==========================
// HANDLE FORM SUBMIT
// ==========================
document.getElementById("authForm").addEventListener("submit", function(e){
  e.preventDefault();

  if(isRegister){
    registerUser();
  }else{
    loginUser();
  }
});

// ==========================
// REGISTER
// ==========================
function registerUser(){
  let user = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    phone: document.getElementById("phone").value,
    address: document.getElementById("address").value,
    password: document.getElementById("password").value
  };

  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("currentUser", JSON.stringify(user));

  alert("Register successful 🎉");
  window.location.href = "index.html";
}

// ==========================
// LOGIN
// ==========================
function loginUser(){
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  let user = JSON.parse(localStorage.getItem("user"));

  if(!user){
    alert("No account found!");
    return;
  }

  if(email === user.email && password === user.password){
    localStorage.setItem("currentUser", JSON.stringify(user));
    alert("Login successful 🎉");
    window.location.href = "index.html";
  }else{
    alert("Wrong email or password!");
  }
}

// ==========================
// SWITCH FORM
// ==========================
function switchForm(){
  let title = document.getElementById("formTitle");
  let btn = document.querySelector("button");
  let name = document.getElementById("name");
  let phone = document.getElementById("phone");
  let address = document.getElementById("address");

  isRegister = !isRegister;

  if(isRegister){
    title.innerText = "Create Account";
    btn.innerText = "Create Account";

    name.style.display = "block";
    phone.style.display = "block";
    address.style.display = "block";

  }else{
    title.innerText = "Sign In";
    btn.innerText = "Sign In";

    name.style.display = "none";
    phone.style.display = "none";
    address.style.display = "none";
  }
}

// ==========================
// INIT GOOGLE AUTOCOMPLETE
// ==========================
let locationLoaded = false;

function getCurrentLocation() {
  if (locationLoaded) return; 

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(position) {
        let lat = position.coords.latitude;
        let lng = position.coords.longitude;

        getAddressFromCoords(lat, lng);
        locationLoaded = true;
      },
      function(error) {
        alert("Location access denied!!");
      }
    );
  } else {
    alert("Geolocation not supported");
  }
}