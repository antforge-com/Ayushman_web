// product-price.js
// Import Firebase modules from the shared config file
import { db, auth } from './firebase/firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const materialRowsDiv = document.getElementById('materialRows');
let materialRows = []; // Stores the current rows for material selection
let materials = []; // Stores all materials fetched from Firestore

/**
 * Displays a status message to the user (currently disabled except error logs).
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'loading'.
 */
function displayStatus(message, type) {
    if (type === 'error') {
        console.error(`[Error] ${message}`);
    }
}

/**
 * Fetches all materials from Firestore.
 */
async function fetchMaterials() {
    console.log('fetchMaterials: Attempting to fetch materials...');
    try {
        const materialsCollectionRef = collection(db, "materials");
        const materialsSnap = await getDocs(materialsCollectionRef);
        console.log('fetchMaterials: Firestore query completed.');

        materials = [];
        materialsSnap.forEach(doc => materials.push({ id: doc.id, ...doc.data() }));

        console.log('Loaded materials:', materials);

        // Sort materials by name or fallback key
        materials.sort((a, b) => ((a.material || a.materialName || '').localeCompare(b.material || b.materialName || '')));

        if (materials.length === 0) {
            displayStatus('No materials found in the database. Please add materials first.', 'error');
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
            let errorDiv = document.getElementById('materialErrorMsg');
            if (errorDiv) errorDiv.remove();
        }

        // Initialize rows if empty
        if (materialRows.length === 0) {
            materialRows.push({ materialId: '', costPerKg: 0, quantity: 0, totalCost: 0 });
        }
        renderRows();
    } catch (err) {
        console.error("Error fetching materials for calculator:", err);
        displayStatus(`Error fetching materials: ${err.message}`, 'error');
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
    materialRowsDiv.innerHTML = materialRows.map((row, idx) => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:0.75rem 0.5rem;">
                <select class="materialSelect" data-idx="${idx}" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                    <option value="">Select Material</option>
                    ${materials.map(m => `<option value="${m.id}" ${row.materialId === m.id ? 'selected' : ''}>${m.material || m.materialName || ''}</option>`).join('')}
                </select>
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                <input class="qtyInput" data-idx="${idx}" type="number" min="0" step="any" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]+" value="${row.quantity || ''}" style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                <select class="unitSelect" data-idx="${idx}" style="width:70px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                    <option value="gm" ${row.unit === 'gm' ? 'selected' : ''}>gm</option>
                    <option value="kg" ${!row.unit || row.unit === 'kg' ? 'selected' : ''}>kg</option>
                </select>
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                <input class="costInput" data-idx="${idx}" type="number" min="0" step="0.01" value="${row.costPerKg || ''}" style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;" disabled>
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:center;">
                ₹${(row.totalCost || 0).toFixed(2)}
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:right;">
                <button class="btn" style="background:#dc3545;color:#fff;padding:0.25rem 0.75rem;border-radius:4px;font-size:0.875rem;" data-idx="${idx}" onclick="removeRow(${idx})">Remove</button>
            </td>
        </tr>
    `).join('');

    // Attach event listeners for new unit dropdown
    document.querySelectorAll('.unitSelect').forEach(sel => sel.onchange = function(e) {
        const idx = +e.target.dataset.idx;
        const prevUnit = materialRows[idx].unit || 'kg';
        const newUnit = e.target.value;
        // Do not change quantity!
        materialRows[idx].unit = newUnit;
        // Convert cost per unit for display and calculation
        let baseCostPerKg = materialRows[idx].baseCostPerKg || 0;
        // Always use the original DB price per kg for conversion
        if (newUnit === 'gm') {
            materialRows[idx].costPerKg = baseCostPerKg / 1000; // cost per gm
        } else {
            materialRows[idx].costPerKg = baseCostPerKg; // cost per kg
        }
        // Calculate total cost as quantity × cost per selected unit
        let qty = materialRows[idx].quantity || 0;
        let costPerUnit = 0;
        let dbQty = materialRows[idx].dbQty || 0;
        let dbUnit = materialRows[idx].dbUnit || 'gm';
        let totalPrice = materialRows[idx].dbTotalPrice || 0;
        if (materialRows[idx].unit === 'kg') {
            let qtyKg = dbUnit === 'kg' ? dbQty : dbQty / 1000;
            costPerUnit = qtyKg > 0 ? totalPrice / qtyKg : 0;
        } else {
            let qtyGm = dbUnit === 'gm' ? dbQty : dbQty * 1000;
            costPerUnit = qtyGm > 0 ? totalPrice / qtyGm : 0;
        }
        materialRows[idx].costPerKg = costPerUnit;
        materialRows[idx].totalCost = qty * costPerUnit;
        renderRows();
    });

    // Attach event listeners
    document.querySelectorAll('.materialSelect').forEach(sel => sel.onchange = onRowChange);
    // Only update totals on input, but re-render on change for quantity
    document.querySelectorAll('.qtyInput').forEach(inp => {
        inp.oninput = function(e) {
            const idx = +e.target.dataset.idx;
            let qty = +e.target.value;
            let row = materialRows[idx];
            row.quantity = qty;
            // Always recalculate cost per unit from original DB values
            let totalPrice = row.dbTotalPrice || 0;
            let dbQty = row.dbQty || 0;
            let dbUnit = row.dbUnit || 'gm';
            let costPerUnit = 0;
            if (row.unit === 'gm') {
                // price per gm
                costPerUnit = dbUnit === 'gm' ? (dbQty > 0 ? totalPrice / dbQty : 0) : (dbQty > 0 ? totalPrice / (dbQty * 1000) : 0);
            } else {
                // price per kg
                costPerUnit = dbUnit === 'kg' ? (dbQty > 0 ? totalPrice / dbQty : 0) : (dbQty > 0 ? totalPrice / (dbQty / 1000) : 0);
            }
            row.costPerKg = costPerUnit;
            row.totalCost = qty * costPerUnit;
            // Update the total cost cell directly
            const tr = inp.closest('tr');
            if (tr) {
                const totalCostCell = tr.querySelector('td:nth-child(5)');
                if (totalCostCell) {
                    totalCostCell.textContent = `₹${(row.totalCost || 0).toFixed(2)}`;
                }
            }
            updateTotals();
        };
        inp.onchange = onRowChange;
    });

    updateTotals();
}

/**
 * Handles changes in material row inputs (select, quantity).
 * @param {Event} e - The change event.
 */
function onRowChange(e) {
    const idx = +e.target.dataset.idx;
    const row = materialRows[idx];

    if (e.target.classList.contains('materialSelect')) {
        row.materialId = e.target.value;
        const mat = materials.find(m => m.id === row.materialId);
        let totalPrice = 0;
        let dbQty = 0;
        let dbUnit = 'gm';
        if (mat) {
            totalPrice = mat.total || 0;
            dbQty = mat.quantity || 0;
            // Auto-detect unit: if < 10, treat as kg; else gm
            dbUnit = dbQty < 10 ? 'kg' : 'gm';
        }
        row.dbTotalPrice = totalPrice;
        row.dbQty = dbQty;
        row.dbUnit = dbUnit;
        // Convert to selected unit for display
        let qtyInKg = dbUnit === 'kg' ? dbQty : dbQty / 1000;
        let qtyInGm = dbUnit === 'gm' ? dbQty : dbQty * 1000;
        if (row.unit === 'gm') {
            row.quantity = isNaN(qtyInGm) ? 0 : qtyInGm;
            row.costPerKg = (qtyInGm && !isNaN(totalPrice / qtyInGm)) ? totalPrice / qtyInGm : 0;
        } else {
            row.quantity = isNaN(qtyInKg) ? 0 : qtyInKg;
            row.costPerKg = (qtyInKg && !isNaN(totalPrice / qtyInKg)) ? totalPrice / qtyInKg : 0;
        }
        // Always calculate total cost as (quantity) × (cost per selected unit)
        row.totalCost = row.quantity * (row.costPerKg || 0);
    }
    if (e.target.classList.contains('qtyInput')) {
        row.quantity = +e.target.value;
    }
    // Calculate totalCost as quantity × cost per selected unit
    let qty = row.quantity || 0;
    row.totalCost = qty * (row.costPerKg || 0);
    renderRows();  // Re-render rows including totals
}

/**
 * Removes a material row.
 * @param {number} idx - Index of the row to remove.
 */
window.removeRow = function(idx) {
    materialRows.splice(idx, 1);
    renderRows();
};

/**
 * Updates the total costs shown on the page.
 */
function updateTotals() {
    const totalMaterial = materialRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    document.getElementById('totalMaterialCost').textContent = `₹${totalMaterial.toFixed(2)}`;

    const numBottles = +document.getElementById('numBottles').value;
    const costPerBottle = +document.getElementById('costPerBottle').value;
    const totalBottleCost = numBottles * costPerBottle;
    document.getElementById('totalBottleCost').textContent = `₹${totalBottleCost.toFixed(2)}`;

    const overallTotalCost = totalMaterial + totalBottleCost;
    document.getElementById('totalCost').textContent = `₹${overallTotalCost.toFixed(2)}`;
}

// Add new material row button
document.getElementById('addRowBtn').onclick = () => {
    materialRows.push({ materialId: '', costPerKg: 0, quantity: 0, totalCost: 0 });
    renderRows();
};

// Update totals when bottle info changes
document.getElementById('numBottles').oninput = updateTotals;
document.getElementById('costPerBottle').oninput = updateTotals;

// Calculate pricing on button click
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

    // Your margin calculations
    const margin1 = baseCost * 1.13;              // 113% margin on base cost
    const margin2 = (baseCost + margin1) * 0.12;  // 12% margin on (baseCost + margin1)
    const totalSellingPrice = baseCost + margin1 + margin2;
    const grossPerBottle = totalSellingPrice / numBottles;

    pricingResultsDiv.style.display = 'block';

    document.getElementById('resultBasePrice').textContent = `₹${baseCost.toFixed(2)}`;
    document.getElementById('resultMargin1').textContent = `₹${margin1.toFixed(2)}`;
    document.getElementById('resultMargin2').textContent = `₹${margin2.toFixed(2)}`;
    document.getElementById('resultTotalPrice').textContent = `₹${totalSellingPrice.toFixed(2)}`;
    document.getElementById('resultPricePerBottle').textContent = `₹${grossPerBottle.toFixed(2)}`;
};

// On DOM load, wait for Firebase auth then fetch materials
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('User signed in, fetching materials...');
            fetchMaterials();
        } else {
            console.log('User not signed in yet.');
        }
    });
});