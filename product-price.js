// product-price.js
// Import Firebase modules from the shared config file
import { db, auth } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


const materialRowsDiv = document.getElementById('materialRows');
let materialRows = []; // Stores the current rows for material selection
let materials = []; // Stores all materials fetched from Firestore

// Status elements removed

/**
 * Displays a status message to the user (currently disabled).
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'loading'.
 */
function displayStatus(message, type) {
    // Only log errors to console
    if (type === 'error') {
        console.log(`[Error] ${message}`);
    }
}

/**
 * Fetches all materials from Firestore.
 */
async function fetchMaterials() {
    console.log('fetchMaterials: Attempting to fetch materials...'); // Added log
    try {
        // Fetch from flat 'materials' collection (not nested)
        const materialsCollectionRef = collection(db, "materials");
        console.log('fetchMaterials: Querying Firestore collection "materials"...'); // Added log
        const materialsSnap = await getDocs(materialsCollectionRef);
        console.log('fetchMaterials: Firestore query completed.'); // Added log

        materials = [];
        materialsSnap.forEach(doc => materials.push({ id: doc.id, ...doc.data() }));

        // Debug: log loaded materials
        console.log('Loaded materials:', materials); // Added log: Check this array in console!

        // Client-side sorting by material name (try 'material' or fallback to 'materialName')
        materials.sort((a, b) => ((a.material || a.materialName || '').localeCompare(b.material || b.materialName || '')));

        if (materials.length === 0) {
            displayStatus('No materials found in the database. Please add materials first.', 'error');
            console.log('fetchMaterials: No materials found in database.'); // Added log
            // Show a visible error message in the UI
            let errorDiv = document.getElementById('materialErrorMsg');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.id = 'materialErrorMsg';
                errorDiv.style.background = '#fee2e2';
                errorDiv.style.color = '#991b1b';
                errorDiv.style.padding = '1rem';
                errorDiv.style.margin = '1rem 0';
                errorDiv.style.borderRadius = '0.5rem';
                errorDiv.style.textAlign = 'center';
                const card = document.querySelector('.card');
                if (card) card.parentNode.insertBefore(errorDiv, card.nextSibling);
            }
            errorDiv.textContent = 'No materials found in the database. Please add materials first.';
        } else {
            // Remove error message if present
            let errorDiv = document.getElementById('materialErrorMsg');
            if (errorDiv) errorDiv.remove();
            console.log(`fetchMaterials: Successfully loaded ${materials.length} materials.`); // Added log
        }

        // Add an initial row if none exist and render
        if (materialRows.length === 0) {
            materialRows.push({ materialId: '', costPerKg: 0, quantity: 0, totalCost: 0 });
        }
        console.log('fetchMaterials: Calling renderRows()...'); // Added log
        renderRows(); // Render rows after materials are fetched
    } catch (err) {
        console.error("Error fetching materials for calculator:", err);
        displayStatus(`Error fetching materials: ${err.message}`, 'error');
        // Show a visible error message in the UI
        let errorDiv = document.getElementById('materialErrorMsg');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'materialErrorMsg';
            errorDiv.style.background = '#fee2e2';
            errorDiv.style.color = '#991b1b';
            errorDiv.style.padding = '1rem';
            errorDiv.style.margin = '1rem 0';
            errorDiv.style.borderRadius = '0.5rem';
            errorDiv.style.textAlign = 'center';
            const card = document.querySelector('.card');
            if (card) card.parentNode.insertBefore(errorDiv, card.nextSibling);
        }
        errorDiv.textContent = 'Error fetching materials: ' + err.message;
    }
}

/**
 * Renders the material input rows on the page.
 */
function renderRows() {
    console.log('renderRows: Rendering material rows...'); // Added log
    materialRowsDiv.innerHTML = materialRows.map((row, idx) => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:0.75rem 0.5rem;">
                <select class="materialSelect" data-idx="${idx}" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                    <option value="">Select Material</option>
                    ${materials.map(m => `<option value="${m.id}" ${row.materialId === m.id ? 'selected' : ''}>${m.material || m.materialName || ''}</option>`).join('')}
                </select>
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                <input class="qtyInput" data-idx="${idx}" type="number" min="0" step="0.01" value="${row.quantity || ''}" style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                <input class="costInput" data-idx="${idx}" type="number" min="0" step="0.01" value="${row.costPerKg || ''}" style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                ₹${(row.totalCost || 0).toFixed(2)}
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:right;">
                <button class="btn" style="background:#dc3545;color:#fff;padding:0.25rem 0.75rem;border-radius:4px;font-size:0.875rem;" data-idx="${idx}" onclick="removeRow(${idx})">Remove</button>
            </td>
        </tr>
    `).join('');

    // Attach event listeners to newly rendered elements
    document.querySelectorAll('.materialSelect').forEach(sel => sel.onchange = onRowChange);
    document.querySelectorAll('.costInput').forEach(inp => inp.oninput = onRowChange);
    document.querySelectorAll('.qtyInput').forEach(inp => inp.oninput = onRowChange);

    updateTotals(); // Update totals after rendering rows
    console.log('renderRows: Rendering complete.'); // Added log
}

/**
 * Handles changes in material row inputs (select, cost, quantity).
 * @param {Event} e - The change event.
 */
function onRowChange(e) {
    const idx = +e.target.dataset.idx;
    const row = materialRows[idx];

    if (e.target.classList.contains('materialSelect')) {
        row.materialId = e.target.value;
        const mat = materials.find(m => m.id === row.materialId);
        if (mat) {
            // Use the correct field for cost per kg (pricePerKg)
            row.costPerKg = mat.pricePerKg || 0;
        } else {
            row.costPerKg = 0; // Clear if no material selected
        }
    }
    if (e.target.classList.contains('costInput')) row.costPerKg = +e.target.value;
    if (e.target.classList.contains('qtyInput')) row.quantity = +e.target.value;

    row.totalCost = (row.costPerKg || 0) * (row.quantity || 0);
    renderRows(); // Re-render to update total cost for the row
}

/**
 * Removes a material row.
 * @param {number} idx - The index of the row to remove.
 */
window.removeRow = function(idx) {
    materialRows.splice(idx, 1);
    renderRows();
};

/**
 * Updates the total material cost, total bottle cost, and overall total cost.
 */
function updateTotals() {
    let totalMaterial = materialRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    document.getElementById('totalMaterialCost').textContent = `₹${totalMaterial.toFixed(2)}`;

    const numBottles = +document.getElementById('numBottles').value;
    const costPerBottle = +document.getElementById('costPerBottle').value;
    const totalBottleCost = numBottles * costPerBottle;
    document.getElementById('totalBottleCost').textContent = `₹${totalBottleCost.toFixed(2)}`;

    const overallTotalCost = totalMaterial + totalBottleCost;
    document.getElementById('totalCost').textContent = `₹${overallTotalCost.toFixed(2)}`;
}

// Event listener for adding a new material row
document.getElementById('addRowBtn').onclick = () => {
    materialRows.push({ materialId: '', costPerKg: 0, quantity: 0, totalCost: 0 });
    renderRows();
};

// Event listeners for bottle inputs to update totals dynamically
document.getElementById('numBottles').oninput = updateTotals;
document.getElementById('costPerBottle').oninput = updateTotals;

// Event listener for the "Calculate Product Price" button
document.getElementById('calcBtn').onclick = () => {
    const totalMaterial = materialRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const numBottles = +document.getElementById('numBottles').value;
    const costPerBottle = +document.getElementById('costPerBottle').value;

    const pricingResultsDiv = document.getElementById('pricingResults');

    if (numBottles <= 0) {
        pricingResultsDiv.style.display = 'block';
        pricingResultsDiv.innerHTML = `
            <div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;text-align:center;">
                Please enter a valid number of bottles (greater than 0).
            </div>
        `;
        return;
    }

    const bottleCost = numBottles * costPerBottle;
    const baseCost = totalMaterial + bottleCost;

    // Calculation logic for margins and total selling price
    const margin1 = baseCost * 1.13; // 113% margin on base cost
    const margin2 = (baseCost + margin1) * 0.12; // 12% margin on (baseCost + margin1)
    const totalSellingPrice = baseCost + margin1 + margin2;
    const grossPerBottle = totalSellingPrice / numBottles;

    // Show the pricing results div
    pricingResultsDiv.style.display = 'block';
    
    // Update the result fields
    document.getElementById('resultBasePrice').textContent = `₹${baseCost.toFixed(2)}`;
    document.getElementById('resultMargin1').textContent = `₹${margin1.toFixed(2)}`;
    document.getElementById('resultMargin2').textContent = `₹${margin2.toFixed(2)}`;
    document.getElementById('resultTotalPrice').textContent = `₹${totalSellingPrice.toFixed(2)}`;
    document.getElementById('resultPricePerBottle').textContent = `₹${grossPerBottle.toFixed(2)}`;
};

// Listen for the DOM to be fully loaded before trying to fetch materials
document.addEventListener('DOMContentLoaded', () => {
    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('onAuthStateChanged: User is signed in. Fetching materials...'); // Added log
            // User is signed in, fetch materials
            fetchMaterials();
        } else {
            // User is signed out or not yet signed in.
            // firebase-config.js handles anonymous sign-in, so this should eventually resolve.
            console.log('onAuthStateChanged: User is not signed in. Waiting for authentication...'); // Added log
        }
    });
});