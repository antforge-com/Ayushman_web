// add-material.js
import { db, auth } from './firebase/firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const materialForm = document.getElementById('materialForm');
    const addMaterialMsg = document.getElementById('addMaterialMsg');

    // Inputs
    const qtyInput = document.getElementById('quantity');
    const pricePerUnitInput = document.getElementById('pricePerKg'); // will mean per kg or per gm based on unit
    const priceInput = document.getElementById('price');
    const unitSelect = document.getElementById('unit');
    const priceLabel = document.querySelector("label[for='pricePerKg']");

    // Update label based on unit
    function updatePriceLabel() {
        if (unitSelect.value === 'kg') {
            priceLabel.textContent = "Price per Kg";
        } else {
            priceLabel.textContent = "Price per Gram";
        }
        autoCalculatePrice();
    }

    // Auto calculate price
    function autoCalculatePrice() {
        const qty = Number(qtyInput.value) || 0;
        const pricePerUnit = Number(pricePerUnitInput.value) || 0;
        const unit = unitSelect.value;

        let total = 0;
        if (unit === 'kg') {
            total = qty * pricePerUnit; // qty in kg × price per kg
        } else if (unit === 'gm') {
            // convert gm to kg for total price if pricePerUnit is per gm
            total = (qty / 1000) * (pricePerUnit * 1000); // convert to kg × price per kg
        }
        priceInput.value = total.toFixed(2);
    }

    qtyInput.addEventListener('input', autoCalculatePrice);
    pricePerUnitInput.addEventListener('input', autoCalculatePrice);
    unitSelect.addEventListener('change', updatePriceLabel);

    if (materialForm) {
        materialForm.onsubmit = async (e) => {
            e.preventDefault();
            addMaterialMsg.classList.add('hidden');

            // Auth check
            if (!auth.currentUser) {
                addMaterialMsg.textContent = "Error: Authentication not ready. Please try again.";
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
                return;
            }

            // Collect form data
            const formData = new FormData(e.target);
            const data = {};
            for (let [key, value] of formData.entries()) {
                if (['quantity', 'pricePerKg', 'price', 'gst', 'hamali'].includes(key)) {
                    data[key] = Number(value);
                } else {
                    data[key] = value;
                }
            }

            // Convert everything to kg and pricePerKg for DB
            if (unitSelect.value === 'kg') {
                data.quantity = data.quantity * 1000; // store as grams
                data.pricePerKg = data.pricePerKg; // already per kg
            } else if (unitSelect.value === 'gm') {
                data.quantity = data.quantity; // already in grams
                data.pricePerKg = data.pricePerKg * 1000; // convert per gm to per kg
            }
            data.unit = "gms";

            // Calculate total cost as (quantity in kg) * (pricePerKg)
            const qtyKg = (unitSelect.value === 'kg') ? (Number(formData.get('quantity')) || 0) : ((Number(formData.get('quantity')) || 0) / 1000);
            const pricePerKg = (unitSelect.value === 'kg') ? (Number(formData.get('pricePerKg')) || 0) : ((Number(formData.get('pricePerKg')) || 0) * 1000);
            const baseTotal = qtyKg * pricePerKg;
            const gst = data.gst || 0;
            const hamali = data.hamali || 0;
            data.total = baseTotal + gst + hamali;

            // Add user id
            data.userId = auth.currentUser.uid;

            try {
                console.log("Saving material document:", data);
                await addDoc(collection(db, "materials"), data);

                addMaterialMsg.textContent = "Material added successfully!";
                addMaterialMsg.classList.remove('hidden', 'message-error');
                addMaterialMsg.classList.add('message-success');
                e.target.reset();
                priceInput.value = '';
                updatePriceLabel(); // reset label
            } catch (err) {
                addMaterialMsg.textContent = "Error adding material: " + err.message;
                addMaterialMsg.classList.remove('hidden', 'message-success');
                addMaterialMsg.classList.add('message-error');
            }
        };

        // Initialize label on load
        updatePriceLabel();
    }
});
