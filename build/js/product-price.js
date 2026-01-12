// product-price.js
// Import necessary Firebase modules from the shared config file
import { db, auth, appId, initializeFirebase, collection, getDocs, addDoc, Timestamp } from "./firebase-config.js";
import { doc, getDoc, updateDoc, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// DOM elements will be accessed in DOMContentLoaded
let materialRowsDiv, totalMaterialCostSpan, totalCostSpan, calculateBtn, calculateAndSaveBtn;
let pricingResultsDiv, statusMessageDiv, calculateButtonText, saveButtonText, loadingIndicator;
let viewAllPricesBtn, productNameInput;


let materialRows = []; // Stores the current rows for material/bottle selection
let materials = []; // Stores all materials fetched from Firestore
let latestMaterials = {}; // Stores the latest material records for each unique material name

// Predefined bottle database
const bottleDatabase = [
    { id: 'bottle_100ml', name: 'Small Bottle (100ml)', cost: 5.00 },
    { id: 'bottle_200ml', name: 'Medium Bottle (200ml)', cost: 8.00 },
    { id: 'bottle_500ml', name: 'Large Bottle (500ml)', cost: 12.00 },
    { id: 'bottle_glass_100ml', name: 'Glass Bottle (100ml)', cost: 15.00 },
    { id: 'bottle_glass_200ml', name: 'Glass Bottle (200ml)', cost: 20.00 },
    { id: 'bottle_plastic_250ml', name: 'Plastic Bottle (250ml)', cost: 6.00 },
    { id: 'bottle_dropper_30ml', name: 'Dropper Bottle (30ml)', cost: 25.00 }
];


/**
 * Displays a message to the user.
 * @param {string} message The message to display.
 * @param {string} type The type of message ('success', 'error', 'info').
 */
function showMessage(message, type) {
    statusMessageDiv.textContent = message;
    statusMessageDiv.className = `message-box message-${type}`;
    statusMessageDiv.classList.remove('hidden');
    setTimeout(() => {
        statusMessageDiv.classList.add('hidden');
    }, 5000);
}

/**
 * Fetches all materials from Firebase.
 * @param {string} currentUserId - The ID of the currently logged-in user.
 */
async function fetchMaterials(currentUserId) {
    console.log('fetchMaterials: Attempting to fetch materials...');
    try {
        // FIX: सीधे user-specific collection path का उपयोग करें
        const collectionPath = `artifacts/${appId}/users/${currentUserId}/materials`;
        const materialsCollectionRef = collection(db, collectionPath);
        
        // Fetch all material purchases and sort them by timestamp
        const materialsSnap = await getDocs(query(materialsCollectionRef, orderBy('timestamp', 'desc')));
        console.log('fetchMaterials: Firestore query completed.');

        materials = [];
        latestMaterials = {}; // Reset latestMaterials
        const seenMaterials = new Set();

        materialsSnap.forEach(doc => {
            const data = doc.data();
            materials.push({ id: doc.id, ...data });

            // If this is the most recent record for this material, store it
            if (!seenMaterials.has(data.material)) {
                latestMaterials[data.material] = { id: doc.id, ...data };
                seenMaterials.add(data.material);
            }
        });
        
        // Use latestMaterials to create a unique list for the dropdown
        const uniqueMaterials = Object.values(latestMaterials);
        
        console.log('Loaded materials for dropdown:', uniqueMaterials);
        
        if (uniqueMaterials.length === 0) {
            materialRowsDiv.innerHTML = '<tr><td colspan="6" class="text-center italic text-gray-500 py-4">No materials found. Please add materials first.</td></tr>';
        } else {
            if (materialRows.length === 0) {
                materialRows.push({ type: 'ingredient', materialId: '', quantity: '', unit: 'kg', costPerUnit: 0, totalCost: 0 });
            }
            renderRows(uniqueMaterials);
        }
    } catch (err) {
        console.error("Error fetching materials for calculator:", err);
        materialRowsDiv.innerHTML = '<tr><td colspan="6" class="text-center italic text-red-700 py-4">Error loading materials.</td></tr>';
    }
}

/**
 * Renders the material input rows on the page.
 * @param {Array} uniqueMaterials - The list of unique materials to display in the dropdown.
 */
function renderRows(uniqueMaterials) {
    materialRowsDiv.innerHTML = materialRows.map((row, idx) => {
        const isBottle = row.type === 'bottle';
        
        return `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:0.75rem 0.5rem;">
                <span style="padding:0.5rem;color:${isBottle ? '#28a745' : '#007bff'};font-weight:600;">
                    ${isBottle ? 'Bottle' : 'Ingredient'}
                </span>
            </td>
            <td style="padding:0.75rem 0.5rem;">
                ${isBottle ? `
                    <select class="bottleSelect" data-idx="${idx}" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                        <option value="">Select Bottle</option>
                        ${bottleDatabase.map(b => `<option value="${b.id}" ${row.bottleId === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
                    </select>
                ` : `
                    <select class="materialSelect" data-idx="${idx}" style="width:100%;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                        <option value="">Select Material</option>
                        ${uniqueMaterials.map(m => `<option value="${m.id}" ${row.materialId === m.id ? 'selected' : ''}>${m.material || ''}</option>`).join('')}
                    </select>
                `}
            </td>
            <td style="padding:0.75rem 0.5rem;">
                <input class="qtyInput text-center" data-idx="${idx}" type="number" min="0" step="any" 
                       value="${row.quantity || ''}" 
                       placeholder="${isBottle ? 'Qty' : 'Optional'}"
                       style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
            </td>
            <td style="padding:0.75rem 0.5rem;">
                ${isBottle ? `
                    <span style="color:#666;font-style:italic;">N/A</span>
                ` : `
                    <select class="unitSelect text-center" data-idx="${idx}" style="width:70px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;">
                        <option value="kg" ${row.unit === 'kg' ? 'selected' : ''}>kg</option>
                        <option value="gram" ${row.unit === 'gram' ? 'selected' : ''}>gram</option>
                        <option value="lts" ${row.unit === 'lts' ? 'selected' : ''}>lts</option>
                        <option value="ml" ${row.unit === 'ml' ? 'selected' : ''}>ml</option>
                        <option value="mt" ${row.unit === 'mt' ? 'selected' : ''}>mt</option>
                        <option value="no" ${row.unit === 'no' ? 'selected' : ''}>no</option>
                    </select>
                `}
            </td>
            <td style="padding:0.75rem 0.5rem;">
                <input class="costInput text-center" data-idx="${idx}" type="number" min="0" step="0.01" 
                       value="${(row.costPerUnit || 0).toFixed(2)}" 
                       style="width:80px;padding:0.5rem;border:1px solid #ddd;border-radius:4px;" disabled>
            </td>
            <td style="padding:0.75rem 0.5rem;">
                <span id="totalCost-${idx}">₹${(row.totalCost || 0).toFixed(2)}</span>
            </td>
            <td style="padding:0.75rem 0.5rem;text-align:right;">
                <button class="remove-btn" data-idx="${idx}" onclick="removeRow(${idx})"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        </tr>
        `;
    }).join('');

    // Attach event listeners to the new elements
    document.querySelectorAll('.materialSelect').forEach(sel => sel.onchange = onMaterialOrUnitChange);
    document.querySelectorAll('.bottleSelect').forEach(sel => sel.onchange = onBottleChange);
    document.querySelectorAll('.qtyInput').forEach(inp => {
        inp.oninput = onQuantityChange;
    });
    document.querySelectorAll('.unitSelect').forEach(sel => sel.onchange = onMaterialOrUnitChange);

    updateTotals();
}

/**
 * Handles changes in the bottle selection.
 * @param {Event} e - the change event.
 */
function onBottleChange(e) {
    const idx = +e.target.dataset.idx;
    const row = materialRows[idx];
    
    row.bottleId = e.target.value;
    const bottle = bottleDatabase.find(b => b.id === row.bottleId);
    
    if (bottle) {
        row.costPerUnit = bottle.cost;
        row.totalCost = (row.quantity || 1) * row.costPerUnit;
        
        // Update the cost input display
        const rowEl = e.target.closest('tr');
        const costInputEl = rowEl.querySelector('.costInput');
        const totalCostSpanEl = rowEl.querySelector(`#totalCost-${idx}`);
        
        if (costInputEl) costInputEl.value = row.costPerUnit.toFixed(2);
        if (totalCostSpanEl) totalCostSpanEl.textContent = `₹${row.totalCost.toFixed(2)}`;
    } else {
        row.costPerUnit = 0;
        row.totalCost = 0;
    }
    
    updateTotals();
}

/**
 * Handles changes in the quantity input field.
 * This function is triggered on every input event (keystroke).
 */
function onQuantityChange(e) {
    const idx = +e.target.dataset.idx;
    const row = materialRows[idx];

    // Update the row object directly
    row.quantity = +e.target.value;
    row.totalCost = (row.quantity || 0) * (row.costPerUnit || 0);

    // Update the total cost display for the specific row
    const totalCostSpan = document.getElementById(`totalCost-${idx}`);
    if (totalCostSpan) {
        totalCostSpan.textContent = `₹${(row.totalCost || 0).toFixed(2)}`;
    }
    
    // Update the overall totals
    updateTotals();
}

/**
 * Handles changes in the material selection or unit selection.
 * @param {Event} e - the change event.
 */
function onMaterialOrUnitChange(e) {
    const idx = +e.target.dataset.idx;
    const row = materialRows[idx];

    // Find the current elements for this row
    const rowEl = e.target.closest('tr');
    const costInputEl = rowEl.querySelector('.costInput');
    const totalCostSpanEl = rowEl.querySelector(`#totalCost-${idx}`);
    const unitSelectEl = rowEl.querySelector('.unitSelect');

    if (e.target.classList.contains('materialSelect')) {
        row.materialId = e.target.value;
        const mat = materials.find(m => m.id === row.materialId);
        
        if (mat) {
            // Get the updated cost per unit directly from the latest material record
            let costPerUnit = parseFloat(mat.updatedCostPerUnit) || 0;
            let matUnit = mat.quantityUnit || 'kg';
            
            // Adjust the cost per unit to the selected row unit for calculation
            if (matUnit !== row.unit) {
                if (row.unit === 'gram' && matUnit === 'kg') {
                    costPerUnit = costPerUnit / 1000;
                } else if (row.unit === 'kg' && matUnit === 'gram') {
                    costPerUnit = costPerUnit * 1000;
                }
            }
            row.costPerUnit = costPerUnit;
        } else {
            row.quantity = 0;
            row.costPerUnit = 0;
            row.unit = 'kg'; // Reset unit if no material is selected
        }
    } else if (e.target.classList.contains('unitSelect')) {
        const mat = materials.find(m => m.id === row.materialId);
        const newUnit = e.target.value;
        row.unit = newUnit;

        if (mat) {
            let costPerUnit = parseFloat(mat.updatedCostPerUnit) || 0;
            let matUnit = mat.quantityUnit || 'kg';
            
            // Adjust the cost per unit to the new selected row unit for calculation
            if (matUnit !== newUnit) {
                if (newUnit === 'gram' && matUnit === 'kg') {
                    costPerUnit = costPerUnit / 1000;
                } else if (newUnit === 'kg' && matUnit === 'gram') {
                    costPerUnit = costPerUnit * 1000;
                }
            }
            row.costPerUnit = costPerUnit;
        } else {
             row.costPerUnit = 0;
        }
    }
    
    // The total cost is the quantity entered multiplied by the adjusted cost per unit
    row.totalCost = (row.quantity || 0) * (row.costPerUnit || 0);

    // Update the UI for this specific row
    if (costInputEl) {
        costInputEl.value = (row.costPerUnit || 0).toFixed(2);
    }
    if (totalCostSpanEl) {
        totalCostSpanEl.textContent = `₹${(row.totalCost || 0).toFixed(2)}`;
    }
    
    // Update the overall totals
    updateTotals();
}


/**
 * Removes a material row.
 * @param {number} idx - The index of the row to remove.
 */
window.removeRow = function(idx) {
    materialRows.splice(idx, 1);
    renderRows(Object.values(latestMaterials));
};

/**
 * Updates the total costs displayed on the page.
 */
function updateTotals() {
    const totalMaterial = materialRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    totalMaterialCostSpan.textContent = `₹${totalMaterial.toFixed(2)}`;
    totalCostSpan.textContent = `₹${totalMaterial.toFixed(2)}`;
}

/**
 * Saves the product price calculation to Firestore.
 * @param {object} productData - The object containing all product pricing information.
 * @returns {Promise<void>}
 */
async function saveProductPrice(productData) {
    try {
        await initializeFirebase();
        if (!db || !auth.currentUser) {
            throw new Error("User is not authenticated. Please log in and try again.");
        }
        
        // FIX: सीधे user-specific collection path का उपयोग करें
        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/products`;
        await addDoc(collection(db, collectionPath), productData);

        // Deduct stock after successful calculation and saving
        await deductStock();

        showMessage('Product price saved successfully!', 'success');
        // No redirect, just show the message
    } catch (error) {
        console.error("Error saving product price:", error);
        if (error.code === 'permission-denied') {
            showMessage('Permission denied. Please check your Firestore security rules.', 'error');
        } else {
            showMessage('Failed to save product price. Please try again.', 'error');
        }
    }
}

/**
 * Deducts the used material quantity from the stock in Firestore.
 * @returns {Promise<void>}
 */
async function deductStock() {
    try {
        if (!auth.currentUser) {
            throw new Error("User is not authenticated.");
        }
        // FIX: सीधे user-specific collection path का उपयोग करें
        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;

        const updates = materialRows.map(async (row) => {
            if (!row.materialId) return; // Skip empty rows
            
            // Find the most recent material record using materialId
            const materialItem = materials.find(m => m.id === row.materialId);
            if (!materialItem) return;

            const q = query(
                collection(db, collectionPath),
                where('material', '==', latestMaterials[materialItem.material].material),
                orderBy('timestamp', 'desc'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.warn(`Stock deduction failed: No recent record found for material ID ${row.materialId}.`);
                return;
            }
            
            const docRef = querySnapshot.docs[0].ref;
            const docSnap = querySnapshot.docs[0];

            if (docSnap.exists()) {
                const currentData = docSnap.data();
                
                let currentStock = parseFloat(currentData.stock) || 0;
                let deduction = parseFloat(row.quantity) || 0;
                
                // Convert deduction quantity to the stock's unit
                if (row.unit === 'gram' && currentData.quantityUnit === 'kg') {
                    deduction = deduction / 1000;
                } else if (row.unit === 'kg' && currentData.quantityUnit === 'gram') {
                    deduction = deduction * 1000;
                }

                const newStock = Math.max(0, currentStock - deduction);
                
                await updateDoc(docRef, {
                    stock: newStock
                });
            }
        });
        
        await Promise.all(updates);
        console.log('Stock deducted successfully!');
    } catch (error) {
        console.error("Error deducting stock:", error);
        showMessage('Failed to deduct stock. Please check the logs.', 'error');
    }
}

/**
 * Checks for sufficient stock before performing the calculation.
 * @returns {Promise<string[]>} An array of error messages for insufficient stock, or an empty array if all is well.
 */
async function checkStock() {
    // FIX: सीधे user-specific collection path का उपयोग करें
    const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;

    const stockPromises = materialRows.map(async (row) => {
        if (!row.materialId) {
            return null; // Skip if no material is selected for this row
        }
        
        // Find the most recent material record using materialId
        const materialItem = materials.find(m => m.id === row.materialId);
        if (!materialItem) {
            return `Insufficient stock for a material in the list. Please check your selections.`;
        }

        const q = query(
            collection(db, collectionPath),
            where('material', '==', latestMaterials[materialItem.material].material),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return `Insufficient stock for ${materialItem.material}: Material not found.`;
        }

        const data = querySnapshot.docs[0].data();
        let currentStock = parseFloat(data.stock) || 0;
        let requiredQuantity = parseFloat(row.quantity);

        // Normalize units for comparison: convert both to a common unit (e.g., grams)
        let stockInGrams = currentStock;
        if (data.quantityUnit === 'kg') {
             stockInGrams = stockInGrams * 1000;
        }
        
        let requiredInGrams = requiredQuantity;
        if (row.unit === 'kg') {
             requiredInGrams = requiredInGrams * 1000;
        }
        
        if (stockInGrams < requiredInGrams) {
            // Revert units for a clear error message
            let stockDisplay = currentStock.toFixed(2) + ' ' + data.quantityUnit;
            let requiredDisplay = requiredQuantity.toFixed(2) + ' ' + row.unit;

            return `Insufficient stock for ${data.material}. Required: ${requiredDisplay}, Available: ${stockDisplay}.`;
        }
        return null;
    });

    return (await Promise.all(stockPromises)).filter(error => error !== null);
}

// FIX: Added a function to clear all previous results and errors from the UI
function clearResults() {
    // We do not clear the innerHTML here to preserve the result structure
    // We only hide the section and ensure text is cleared if needed
    pricingResultsDiv.style.display = 'none';
    statusMessageDiv.classList.add('hidden');
    // Clear the result spans to prevent old values from flashing
    const resultBasePriceEl = document.getElementById('resultBasePrice');
    const resultMargin1El = document.getElementById('resultMargin1');
    const resultMargin2El = document.getElementById('resultMargin2');
    const resultTotalPriceEl = document.getElementById('resultTotalPrice');
    const resultPricePerBottleEl = document.getElementById('resultPricePerBottle');
    
    if (resultBasePriceEl) resultBasePriceEl.textContent = '';
    if (resultMargin1El) resultMargin1El.textContent = '';
    if (resultMargin2El) resultMargin2El.textContent = '';
    if (resultTotalPriceEl) resultTotalPriceEl.textContent = '';
    if (resultPricePerBottleEl) resultPricePerBottleEl.textContent = '';

    // FIX: Clear the innerHTML of the pricingResultsDiv to remove previous error messages
    pricingResultsDiv.innerHTML = `
        <div class="results-grid">
            <div style="padding:1.2rem;background:#f0f0f0;text-align:center;">
                <div style="color:#666;margin-bottom:0.5rem;">Base Cost (₹)</div>
                <div style="font-size:1.25rem;font-weight:700;" id="resultBasePrice"></div>
                <div style="color:#666;font-size:0.875rem;">Total ingredient + bottle cost</div>
            </div>
            <div style="padding:1.2rem;background:#f0f0f0;text-align:center;">
                <div style="color:#666;margin-bottom:0.5rem;">Margin 1 (113%)</div>
                <div style="font-size:1.25rem;font-weight:700;" id="resultMargin1"></div>
                <div style="color:#666;font-size:0.875rem;">Base Cost × 113%</div>
            </div>
            <div style="padding:1.2rem;background:#f0f0f0;text-align:center;">
                <div style="color:#666;margin-bottom:0.5rem;">Margin 2 (12%)</div>
                <div style="font-size:1.25rem;font-weight:700;" id="resultMargin2"></div>
                <div style="color:#666;font-size:0.875rem;">(Base Cost + Margin 1) × 12%</div>
            </div>
        </div>
        <div style="margin-top:1.5rem;text-align:center;padding:1.2rem;background:#234123;color:white;border-radius:12px;">
            <div style="margin-bottom:0.5rem;">Total Selling Price</div>
            <div style="font-size:1.5rem;font-weight:700;" id="resultTotalPrice"></div>
            <div style="font-size:0.95rem;margin-top:0.5rem;">
                Gross Selling Price per Bottle: <span id="resultPricePerBottle"></span>
            </div>
        </div>
    `;
}

/**
 * Handles the calculation and optional saving of product price.
 * @param {boolean} shouldSave - A flag to determine if the result should be saved to Firestore.
 */
async function handleCalculation(shouldSave) {
    clearResults();

    const buttonToDisable = shouldSave ? calculateAndSaveBtn : calculateBtn;
    const loadingText = shouldSave ? saveButtonText : calculateButtonText;

    buttonToDisable.disabled = true;
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    if (loadingText) loadingText.classList.add('hidden');
    
    try {
        if (materialRows.some(row => row.materialId === '')) {
            const errorHtml = `
                <div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;">
                    <h4 style="font-weight:600;margin-bottom:0.5rem;">Error:</h4>
                    <p>Please select a material for each row before calculating.</p>
                </div>
            `;
            pricingResultsDiv.innerHTML = errorHtml;
            pricingResultsDiv.style.display = 'block';
            return;
        }

        const totalMaterial = materialRows.reduce((sum, r) => sum + (r.totalCost || 0), 0);
        const numBottles = +numBottlesInput.value;
        const costPerBottle = +costPerBottleInput.value;
        
        const productName = productNameInput.value.trim();
        if (!productName) {
            pricingResultsDiv.innerHTML = `
                <div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;text-align:center;">
                    Please enter a product name.
                </div>
            `;
            pricingResultsDiv.style.display = 'block';
            return;
        }
        
        if (numBottles <= 0) {
            pricingResultsDiv.innerHTML = `
                <div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;text-align:center;">
                    Please enter a valid number of bottles (greater than 0).
                </div>
            `;
            pricingResultsDiv.style.display = 'block';
            return;
        }
        
        if (shouldSave) {
            const stockErrors = await checkStock();
            if (stockErrors.length > 0) {
                const errorHtml = `
                    <div style="padding:1rem;background:#fee2e2;color:#991b1b;border-radius:8px;">
                        <h4 style="font-weight:600;margin-bottom:0.5rem;">Stock Check Failed:</h4>
                        <ul style="list-style-type:disc;padding-left:1.5rem;">
                            ${stockErrors.map(err => `<li>${err}</li>`).join('')}
                        </ul>
                    </div>
                `;
                pricingResultsDiv.innerHTML = errorHtml;
                pricingResultsDiv.style.display = 'block';
                return;
            }
        }

        const bottleCost = numBottles * costPerBottle;
        const baseCost = totalMaterial + bottleCost;

        const margin1 = baseCost * 1.13;
        const margin2 = (baseCost + margin1) * 0.12;
        const totalSellingPrice = baseCost + margin1 + margin2;
        const grossPerBottle = totalSellingPrice / numBottles;

        const resultBasePriceEl = document.getElementById('resultBasePrice');
        const resultMargin1El = document.getElementById('resultMargin1');
        const resultMargin2El = document.getElementById('resultMargin2');
        const resultTotalPriceEl = document.getElementById('resultTotalPrice');
        const resultPricePerBottleEl = document.getElementById('resultPricePerBottle');
        
        if (resultBasePriceEl) resultBasePriceEl.textContent = `₹${baseCost.toFixed(2)}`;
        if (resultMargin1El) resultMargin1El.textContent = `₹${margin1.toFixed(2)}`;
        if (resultMargin2El) resultMargin2El.textContent = `₹${margin2.toFixed(2)}`;
        if (resultTotalPriceEl) resultTotalPriceEl.textContent = `₹${totalSellingPrice.toFixed(2)}`;
        if (resultPricePerBottleEl) resultPricePerBottleEl.textContent = `₹${grossPerBottle.toFixed(2)}`;
        
        pricingResultsDiv.style.display = 'block';

        if (shouldSave) {
            const productData = {
                name: productName,
                materialsUsed: materialRows.map(row => {
                    const materialInfo = materials.find(m => m.id === row.materialId) || {};
                    return {
                        materialId: row.materialId,
                        materialName: materialInfo.material,
                        quantity: row.quantity,
                        unit: row.unit,
                        costPerUnit: row.costPerUnit,
                        totalCost: row.totalCost,
                    };
                }),
                bottleInfo: {
                    numBottles: numBottles,
                    costPerBottle: costPerBottle,
                },
                calculations: {
                    baseCost: baseCost,
                    margin1: margin1,
                    margin2: margin2,
                    totalSellingPrice: totalSellingPrice,
                    grossPerBottle: grossPerBottle,
                },
                timestamp: Timestamp.now(),
            };
            await saveProductPrice(productData);
        }

    } catch (error) {
        console.error("Error during calculation/save:", error);
        showMessage('Calculation/save failed. Please try again.', 'error');
    } finally {
        buttonToDisable.disabled = false;
        if (loadingIndicator) loadingIndicator.classList.add('hidden');
        if (loadingText) loadingText.classList.remove('hidden');
    }
}


/**
 * Toggles the visibility of the drawer navigation and backdrop.
 */
function toggleDrawer() {
    if (drawerNav.classList.contains('open')) {
        closeDrawer();
    } else {
        openDrawer();
    }
}

/**
 * Opens the drawer navigation.
 */
function openDrawer() {
    if (!drawerNav || !backdrop || !hamburgerBtn) return;
    drawerNav.classList.add('open');
    backdrop.classList.add('open');
    drawerNav.setAttribute('aria-hidden', 'false');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    const firstLink = drawerNav.querySelector('a');
    if (firstLink) firstLink.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
}

/**
 * Closes the drawer navigation.
 */
function closeDrawer() {
    if (!drawerNav || !backdrop || !hamburgerBtn) return;
    drawerNav.classList.remove('open');
    backdrop.classList.remove('open');
    drawerNav.setAttribute('aria-hidden', 'true');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.focus({ preventScroll: true });
    document.body.style.overflow = '';
}


// When the DOM is loaded, wait for Firebase auth, then fetch materials
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded - Initializing elements');
    
    // Initialize DOM elements now that DOM is loaded
    materialRowsDiv = document.getElementById('materialRows');
    totalMaterialCostSpan = document.getElementById('totalMaterialCost');
    totalCostSpan = document.getElementById('totalCost');
    calculateBtn = document.getElementById('calculateBtn'); 
    calculateAndSaveBtn = document.getElementById('calculateAndSaveBtn'); 
    pricingResultsDiv = document.getElementById('pricingResults');
    statusMessageDiv = document.getElementById('statusMessage');
    calculateButtonText = document.getElementById('calculateButtonText');
    saveButtonText = document.getElementById('saveButtonText');
    loadingIndicator = document.getElementById('loadingIndicator');
    viewAllPricesBtn = document.querySelector('.btn-view-prices');
    productNameInput = document.getElementById('productNameInput');
    
    console.log('DOM elements initialized:', {
        materialRowsDiv: !!materialRowsDiv,
        totalMaterialCostSpan: !!totalMaterialCostSpan,
        calculateBtn: !!calculateBtn
    });
    
    console.log('DOM Content Loaded - Setting up button handlers');
    
    // Get drawer elements now that DOM is ready
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const drawerNav = document.getElementById('drawerNav');
    const backdrop = document.getElementById('backdrop');
    
    console.log('Drawer elements:', {
        hamburgerBtn: !!hamburgerBtn,
        drawerNav: !!drawerNav,
        backdrop: !!backdrop
    });
    
    // Add ingredient and bottle button event listeners
    const addIngredientBtn = document.getElementById('addIngredientBtn');
    const addBottleBtn = document.getElementById('addBottleBtn');
    
    console.log('All button elements found:', {
        addIngredientBtn: !!addIngredientBtn,
        addBottleBtn: !!addBottleBtn,
        materialRowsDiv: !!materialRowsDiv,
        calculateBtn: !!calculateBtn,
        calculateAndSaveBtn: !!calculateAndSaveBtn
    });
    
    // Set up calculate button event listeners
    if (calculateBtn) {
        calculateBtn.addEventListener('click', () => handleCalculation(false));
        console.log('Calculate button listener attached');
    } else {
        console.error('calculateBtn not found in DOM!');
    }
    
    if (calculateAndSaveBtn) {
        calculateAndSaveBtn.addEventListener('click', () => handleCalculation(true));
        console.log('Calculate & Save button listener attached');
    } else {
        console.error('calculateAndSaveBtn not found in DOM!');
    }
    
    if (addIngredientBtn) {
        addIngredientBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Add Ingredient button clicked');
            console.log('Current materialRows length:', materialRows.length);
            console.log('Current latestMaterials:', Object.keys(latestMaterials));
            
            materialRows.push({ 
                type: 'ingredient',
                materialId: '', 
                quantity: '', 
                unit: 'kg', 
                costPerUnit: 0, 
                totalCost: 0 
            });
            
            console.log('Added ingredient row, new length:', materialRows.length);
            
            // Check if we have the DOM element before trying to render
            if (!materialRowsDiv) {
                console.error('materialRowsDiv element not found in DOM!');
                return;
            }
            
            // Use the materials array that's populated when materials are fetched
            renderRows(Object.values(latestMaterials));
            updateTotals();
            console.log('Finished adding ingredient row');
        });
    } else {
        console.error('addIngredientBtn not found in DOM!');
    }
    
    if (addBottleBtn) {
        addBottleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Add Bottle button clicked');
            console.log('Current materialRows length:', materialRows.length);
            
            materialRows.push({ 
                type: 'bottle',
                bottleId: '', 
                quantity: 1, 
                unit: '', 
                costPerUnit: 0, 
                totalCost: 0 
            });
            
            console.log('Added bottle row, new length:', materialRows.length);
            
            // Check if we have the DOM element before trying to render
            if (!materialRowsDiv) {
                console.error('materialRowsDiv element not found in DOM!');
                return;
            }
            
            // Use the materials array that's populated when materials are fetched
            renderRows(Object.values(latestMaterials));
            updateTotals();
            console.log('Finished adding bottle row');
        });
    } else {
        console.error('addBottleBtn not found in DOM!');
    }
    
    // Check if the required elements exist before adding listeners
    if (hamburgerBtn && drawerNav && backdrop) {
        hamburgerBtn.addEventListener('click', toggleDrawer);
        backdrop.addEventListener('click', closeDrawer);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawerNav.classList.contains('open')) {
                closeDrawer();
            }
        });
        drawerNav.addEventListener('click', (e) => {
            if (e.target.closest('a[href]')) closeDrawer();
        });
    } else {
        console.error('Drawer elements not found. Check your HTML IDs.');
    }
    
    // First, let Firebase initialize completely
    await initializeFirebase();
    onAuthStateChanged(auth, user => {
        if (user) {
            console.log('User signed in, fetching materials...');
            fetchMaterials(user.uid);
        } else {
            console.log('User not signed in, redirecting to login...');
            window.location.href = '../login.html';
        }
    });
});
