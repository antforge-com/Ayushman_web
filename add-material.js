// add-material.js
import { db, auth } from './firebase-config.js'; // Import db and auth from firebase-config.js
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const materialForm = document.getElementById('materialForm');
    const addMaterialMsg = document.getElementById('addMaterialMsg');

    // Get inputs for auto price calculation
    const qtyInput = document.getElementById('quantity');
    const pricePerKgInput = document.getElementById('pricePerKg');
    const priceInput = document.getElementById('price');

    // Auto-calculate Price = Quantity * PricePerKg whenever inputs change
    function autoCalculatePrice() {
        const qty = Number(qtyInput.value) || 0;
        const pricePerKg = Number(pricePerKgInput.value) || 0;
        priceInput.value = (qty * pricePerKg).toFixed(2);
    }

    qtyInput.addEventListener('input', autoCalculatePrice);
    pricePerKgInput.addEventListener('input', autoCalculatePrice);

    if (materialForm) {
        materialForm.onsubmit = async (e) => {
            e.preventDefault();
            addMaterialMsg.classList.add('hidden'); // Hide previous messages

            // Check user authentication
            if (!auth.currentUser) {
                addMaterialMsg.textContent = "Error: Authentication not ready. Please try again.";
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
                console.error("Authentication not ready. Cannot add material.");
                return;
            }

            // Collect form data
            const formData = new FormData(e.target);
            const data = {};
            for (let [key, value] of formData.entries()) {
                // Convert numeric fields
                if (['quantity', 'pricePerKg', 'price', 'gst', 'hamali'].includes(key)) {
                    data[key] = Number(value);
                } else {
                    data[key] = value;
                }
            }

            // Calculate total cost (Price + GST + Hamali)
            const price = data.price || 0;
            const gst = data.gst || 0;
            const hamali = data.hamali || 0;
            data.total = price + gst + hamali;

            // Add current user ID for tracking
            data.userId = auth.currentUser.uid;

            try {
                console.log("Saving material document:", data); // Debug: show data to save
                await addDoc(collection(db, "materials"), data);

                addMaterialMsg.textContent = "Material added successfully!";
                addMaterialMsg.classList.remove('hidden', 'message-error');
                addMaterialMsg.classList.add('message-success');
                e.target.reset(); // Reset the form for next entry

                // Clear the Price field value after reset (since JS won't auto-calc empty)
                priceInput.value = '';
            } catch (err) {
                console.error("Error adding document:", err);
                addMaterialMsg.textContent = "Error adding material: " + err.message;
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
            }
        };
    } else {
        console.error("Material form not found!");
    }
});
