// add-material.js
import { db, auth } from './firebase-config.js'; // Import db and auth from the shared config
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const materialForm = document.getElementById('materialForm');
    const addMaterialMsg = document.getElementById('addMaterialMsg');

    if (materialForm) {
        materialForm.onsubmit = async (e) => {
            e.preventDefault();
            addMaterialMsg.classList.add('hidden'); // Hide previous messages

            // Ensure Firebase Auth is ready before proceeding
            if (!auth.currentUser) {
                addMaterialMsg.textContent = "Error: Authentication not ready. Please try again.";
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
                console.error("Authentication not ready. Cannot add material.");
                return;
            }

            const formData = new FormData(e.target);
            const data = {};
            for (let [key, value] of formData.entries()) {
                // Convert numeric fields to numbers
                if (['quantity', 'pricePerKg', 'price', 'gst', 'hamali'].includes(key)) {
                    data[key] = Number(value);
                } else {
                    data[key] = value;
                }
            }

            try {
                // Add a field to store the user ID, useful for Firestore security rules
                // If you're using public data, you might not need this for writes,
                // but it's good practice for user-specific data.
                data.userId = auth.currentUser.uid;

                await addDoc(collection(db, "materials"), data);
                addMaterialMsg.textContent = "Material added successfully!";
                addMaterialMsg.classList.remove('hidden', 'message-error');
                addMaterialMsg.classList.add('message-success');
                e.target.reset(); // Clear the form
            } catch (err) {
                console.error("Error adding document: ", err);
                addMaterialMsg.textContent = "Error adding material: " + err.message;
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
            }
        };
    } else {
        console.error("Material form not found!");
    }
});