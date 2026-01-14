// add-material.js
import { db, userId, appId, initializeFirebase, collection, addDoc, Timestamp } from "../firebase-config.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { doc, getDoc, updateDoc, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth } from "../firebase-config.js";

// Access DOM elements
const materialInput = document.getElementById('material');
const quantityInput = document.getElementById('quantity');
const quantityUnitSelect = document.getElementById('quantityUnit');
let lastUnit = quantityUnitSelect.value;
const pricePerUnitInput = document.getElementById('pricePerUnit');
const updatedCostPerUnitInput = document.getElementById('updatedCostPerUnit');
const priceInput = document.getElementById('price');
const priceLabel = document.getElementById('priceLabel');
const fileInput = document.getElementById('billPhoto');
const fileNameSpan = document.getElementById('file-name');
const filePreviewDiv = document.getElementById('file-preview');
const previewImage = document.getElementById('preview-image');
const materialForm = document.getElementById('materialForm');
const materialIdInput = document.getElementById('materialId');
const formTitle = document.querySelector('.main-heading');
const formButtonText = document.getElementById('buttonText');
const viewAllPurchasesBtn = document.querySelector('.btn-view-purchases');
const stockInput = document.getElementById('stock');
const stockGroup = document.getElementById('stockGroup');
const costPerUnitGroup = document.getElementById('costPerUnitGroup');
const minQuantityInput = document.getElementById('minQuantity');
const minQuantityUnitSelect = document.getElementById('minQuantityUnit');
const gstInput = document.getElementById('gst');
const hamaliInput = document.getElementById('hamali');
const transportationInput = document.getElementById('transportation');

// Categories
const categoriesContainer = document.getElementById('categoriesContainer');
const toggleCategoriesBtn = document.getElementById('toggleCategoriesBtn');
const toggleCategoriesText = document.getElementById('toggleCategoriesText');
const customCategoriesSection = document.getElementById('customCategoriesSection');
const customCategoryFields = document.getElementById('customCategoryFields');
const addCustomCategoryBtn = document.getElementById('addCustomCategoryBtn');
const removeCustomCategoryBtn = document.getElementById('removeCustomCategoryBtn');

let _allCategories = [];
let _selectedCategories = [];
let _showAllCategories = false;
const categoriesToDisplayLimit = 4;
let customCategoryFieldsArr = [];


let currentBillPhotoUrl = null; // To store the current bill photo URL in edit mode
let previousStock = 0; // Stores the stock from the most recent purchase
let previousCostPerUnit = 0; // Stores the cost per unit from the most recent purchase
let previousUnit = 'kg'; // Stores the unit of the fetched previous stock, default is 'kg'
let isNewMaterial = false; // Flag to determine if it's a new material entry
let priceManuallyEdited = false; // Flag to track if user manually edited the calculated price
let costPerUnitManuallyEdited = false; // Flag to track if user manually edited the cost per unit
let stockManuallyEdited = false; // Flag to track if user manually edited the stock


/**
 * Displays a message to the user.
 * @param {string} message The message to display.
 * @param {string} type The type of message ('success', 'error', 'info').
 */
function showMessage(message, type) {
    const msgDiv = document.getElementById('addMaterialMsg');
    msgDiv.textContent = message;
    msgDiv.className = `message-box message-${type}`;
    msgDiv.classList.remove('hidden');
    setTimeout(() => {
        msgDiv.classList.add('hidden');
    }, 5000);
}

/**
 * Updates the price label and placeholder based on the selected quantity unit.
 */
function updatePriceLabel() {
    const oldUnit = lastUnit;
    const currentUnit = quantityUnitSelect.value;
    lastUnit = currentUnit;

    // Update label and placeholder based on unit
    switch (currentUnit) {
        case 'kg':
            priceLabel.textContent = "Price per kg (of this purchase)";
            pricePerUnitInput.placeholder = "Price per kg";
            break;
        case 'gram':
            priceLabel.textContent = "Price per gram (of this purchase)";
            pricePerUnitInput.placeholder = "Price per gram";
            break;
        case 'lts':
            priceLabel.textContent = "Price per liter (of this purchase)";
            pricePerUnitInput.placeholder = "Price per liter";
            break;
        case 'ml':
            priceLabel.textContent = "Price per ml (of this purchase)";
            pricePerUnitInput.placeholder = "Price per ml";
            break;
        case 'mt':
            priceLabel.textContent = "Price per meter (of this purchase)";
            pricePerUnitInput.placeholder = "Price per meter";
            break;
        case 'no':
            priceLabel.textContent = "Price per unit (of this purchase)";
            pricePerUnitInput.placeholder = "Price per unit";
            break;
        default:
            priceLabel.textContent = "Price per unit (of this purchase)";
            pricePerUnitInput.placeholder = "Price per unit";
    }

    // Handle unit conversion for existing price (only for weight units where conversion makes sense)
    if (pricePerUnitInput.value && !isNaN(parseFloat(pricePerUnitInput.value))) {
        const price = parseFloat(pricePerUnitInput.value);
        
        // Only convert between kg and gram as they're related units
        if (oldUnit === 'kg' && currentUnit === 'gram') {
            // Convert price from per kg to per gram
            pricePerUnitInput.value = (price / 1000).toFixed(6);
        } else if (oldUnit === 'gram' && currentUnit === 'kg') {
            // Convert price from per gram to per kg
            pricePerUnitInput.value = (price * 1000).toFixed(4);
        } else if (oldUnit === 'lts' && currentUnit === 'ml') {
            // Convert price from per liter to per ml
            pricePerUnitInput.value = (price / 1000).toFixed(6);
        } else if (oldUnit === 'ml' && currentUnit === 'lts') {
            // Convert price from per ml to per liter
            pricePerUnitInput.value = (price * 1000).toFixed(4);
        }
        // For other unit changes (mt, no), we don't convert as they're different measurement types
    }
    
    // Always call calculatePrices after a unit change to ensure all fields are up-to-date
    calculatePrices();
}

/**
 * Calculates the total purchase price, updated stock, and new cost per unit.
 */
function calculatePrices() {
    // Check if the input value is a valid number, otherwise default to 0
    const purchaseQuantity = parseFloat(quantityInput.value) || 0;
    const purchasePricePerUnit = parseFloat(pricePerUnitInput.value) || 0;
    const purchaseUnit = quantityUnitSelect.value;
    // FIX: Get values from new fields for calculation
    const gstAmount = parseFloat(gstInput.value) || 0;
    const hamaliAmount = parseFloat(hamaliInput.value) || 0;
    const transportationAmount = parseFloat(transportationInput.value) || 0;

    let calculatedPurchasePrice = 0;
    if (!isNaN(purchaseQuantity) && !isNaN(purchasePricePerUnit)) {
        // Calculate price as only quantity × price per unit
        calculatedPurchasePrice = purchaseQuantity * purchasePricePerUnit;
    }
    
    // Auto-calculate price unless user has manually edited it
    if (!priceManuallyEdited) {
        priceInput.value = calculatedPurchasePrice.toFixed(4);
    }
    
    // Calculate total cost including all additional charges for cost per unit calculation
    const totalCost = calculatedPurchasePrice + gstAmount + hamaliAmount + transportationAmount;
    
    // Calculate cost per unit based on total cost (including all additional charges)
    if (purchaseQuantity > 0) {
        // Auto-calculate cost per unit unless user has manually edited it
        if (!costPerUnitManuallyEdited) {
            updatedCostPerUnitInput.value = (totalCost / purchaseQuantity).toFixed(6);
        }
    } else if (!costPerUnitManuallyEdited) {
        updatedCostPerUnitInput.value = '';
    }
    
    // Auto-calculate updated stock unless user has manually edited it
    if (!stockManuallyEdited) {
        // Convert current purchase quantity to match previous unit if needed
        let convertedPurchaseQuantity = purchaseQuantity;
        const currentUnit = quantityUnitSelect.value;
        
        // Handle unit conversion for stock calculation
        if (previousUnit !== currentUnit) {
            if (previousUnit === 'kg' && currentUnit === 'gram') {
                convertedPurchaseQuantity = purchaseQuantity / 1000;
            } else if (previousUnit === 'gram' && currentUnit === 'kg') {
                convertedPurchaseQuantity = purchaseQuantity * 1000;
            } else if (previousUnit === 'lts' && currentUnit === 'ml') {
                convertedPurchaseQuantity = purchaseQuantity / 1000;
            } else if (previousUnit === 'ml' && currentUnit === 'lts') {
                convertedPurchaseQuantity = purchaseQuantity * 1000;
            }
            // For other unit combinations (mt, no), use the quantity as-is
        }
        
        const updatedStock = previousStock + convertedPurchaseQuantity;
        stockInput.value = updatedStock.toFixed(4);
    }
}

/**
 * Updates the file name and preview when a file is selected.
 */
function handleFileSelect() {
    const file = fileInput.files[0];
    if (file) {
        fileNameSpan.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.src = e.target.result;
            filePreviewDiv.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else if (currentBillPhotoUrl) {
        fileNameSpan.textContent = 'Existing bill photo';
        previewImage.src = currentBillPhotoUrl;
        filePreviewDiv.style.display = 'block';
    } else {
        fileNameSpan.textContent = 'Select an image...';
        filePreviewDiv.style.display = 'none';
        previewImage.src = '#';
    }
}

/**
 * Fetches the latest data for a given material name.
 * @param {string} materialName The name of the material.
 * @returns {Promise<object|null>} The latest material data or null if not found.
 */
async function fetchLatestMaterialData(materialName) {
    try {
        await initializeFirebase();
        if (!db) {
            console.error("Firestore not initialized. Cannot fetch data.");
            return null;
        }
        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;
        
        // Query to get the latest record by timestamp
        const q = query(
            collection(db, collectionPath),
            where('material', '==', materialName),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const latestDoc = querySnapshot.docs[0];
            return latestDoc.data();
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching latest material data:", error);
        return null;
    }
}

/**
 * Fills the form with the latest data when the user leaves the material input field.
 */
async function handleMaterialInputBlur() {
    // Only run if we are not in edit mode
    if (materialIdInput.value) {
        return;
    }

    const materialName = materialInput.value.trim();
    if (materialName) {
        const latestData = await fetchLatestMaterialData(materialName);
        if (latestData) {
            isNewMaterial = false;
            // Fill the fields with the latest data
            document.getElementById('dealer').value = latestData.dealer || '';
            document.getElementById('gstNumber').value = latestData.gstNumber || '';
            document.getElementById('quantityUnit').value = latestData.quantityUnit || 'kg';
            minQuantityInput.value = latestData.minQuantity !== undefined ? latestData.minQuantity : 0;
            minQuantityUnitSelect.value = latestData.minQuantityUnit || 'kg';
            
            // Store previous stock and cost for calculation
            previousStock = parseFloat(latestData.stock) || 0;
            previousCostPerUnit = parseFloat(latestData.updatedCostPerUnit) || 0;
            previousUnit = latestData.quantityUnit || 'kg';

            // Make both stock and cost per unit fields editable
            stockInput.removeAttribute('readonly');
            updatedCostPerUnitInput.removeAttribute('readonly');

            showMessage(`Loaded recent data for "${materialName}". You are adding to a stock of ${previousStock.toFixed(4)} ${latestData.quantityUnit} at a cost of ₹${previousCostPerUnit.toFixed(4)} per ${latestData.quantityUnit}.`, 'info');
            
            // Recalculate prices and stock based on any existing form data
            calculatePrices();
        } else {
            // If no data is found, reset the fields and previous values
            isNewMaterial = true;
            priceManuallyEdited = false; // Reset price editing flag
            costPerUnitManuallyEdited = false;
            stockManuallyEdited = false;
            document.getElementById('dealer').value = '';
            document.getElementById('gstNumber').value = '';
            document.getElementById('quantityUnit').value = 'kg';
            minQuantityInput.value = 0;
            minQuantityUnitSelect.value = 'kg';
            
            previousStock = 0;
            previousCostPerUnit = 0;
            previousUnit = 'kg';

            // Allow manual input for both stock and cost per unit
            stockInput.removeAttribute('readonly');
            updatedCostPerUnitInput.removeAttribute('readonly');
            stockInput.value = '';
            updatedCostPerUnitInput.value = '';

            showMessage('This is a new material. Please enter initial stock and cost per unit manually.', 'info');
        }
    }
}


// Event listeners
materialInput.addEventListener('blur', handleMaterialInputBlur);
quantityInput.addEventListener('input', calculatePrices);
quantityUnitSelect.addEventListener('change', updatePriceLabel);
pricePerUnitInput.addEventListener('input', calculatePrices);
fileInput.addEventListener('change', handleFileSelect);

// Add event listener to track manual price edits
priceInput.addEventListener('input', () => {
    priceManuallyEdited = true;
});

// Add event listeners to track manual cost per unit and stock edits
updatedCostPerUnitInput.addEventListener('input', () => {
    costPerUnitManuallyEdited = true;
});

stockInput.addEventListener('input', () => {
    stockManuallyEdited = true;
    // Don't call calculatePrices here to avoid circular updates
});

// FIX: Add event listeners for the new fields to trigger calculation
gstInput.addEventListener('input', calculatePrices);
hamaliInput.addEventListener('input', calculatePrices);
transportationInput.addEventListener('input', calculatePrices);


materialForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const button = form.querySelector('.btn');
    const buttonText = document.getElementById('buttonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    button.disabled = true;
    buttonText.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');

    try {
        await initializeFirebase();
        
        // Get data from the form
        const existingMaterialId = materialIdInput.value;
        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;
        
        // Final calculation before saving
        calculatePrices();

        let dataToSave = {
            material: form.material.value.trim(),
            dealer: form.dealer.value || null,
            gstNumber: form.gstNumber.value || null,
            description: form.description.value || null,
            quantity: parseFloat(form.quantity.value),
            quantityUnit: form.quantityUnit.value,
            pricePerUnit: parseFloat(form.pricePerUnit.value),
            // FIX: `price` field now stores the total calculated price
            price: parseFloat(priceInput.value),
            gst: parseFloat(form.gst.value) || 0,
            hamali: parseFloat(form.hamali.value) || 0,
            transportation: parseFloat(form.transportation.value) || 0,
            minQuantity: parseFloat(minQuantityInput.value) || 0,
            minQuantityUnit: minQuantityUnitSelect.value,
            stock: parseFloat(stockInput.value),
            updatedCostPerUnit: parseFloat(updatedCostPerUnitInput.value),
            categories: _selectedCategories
        };

        // If it's a new material, the updated cost is the total cost divided by quantity
        if (isNewMaterial) {
            // dataToSave.stock = parseFloat(form.quantity.value); // This line is removed to allow manual stock entry
            // dataToSave.updatedCostPerUnit = (parseFloat(priceInput.value) / parseFloat(form.quantity.value)) || 0; // This line is removed
        }

        let billPhotoUrl = currentBillPhotoUrl;
        const file = fileInput.files[0];
        if (file) {
            const storage = getStorage();
            const storageRef = ref(storage, `user-uploads/${userId}/bills/${Timestamp.now().toMillis()}_${file.name}`);
            const uploadTask = await uploadBytes(storageRef, file);
            billPhotoUrl = await getDownloadURL(uploadTask.ref);
            showMessage('Bill photo uploaded successfully!', 'info');
            dataToSave.billPhotoUrl = billPhotoUrl;
        }

        if (!existingMaterialId) {
            // This is a new purchase, so always add a new document
            dataToSave.timestamp = Timestamp.now();
            await addDoc(collection(db, collectionPath), dataToSave);
            showMessage('New material added successfully!', 'success');
            form.reset();
            priceInput.value = '';
            stockInput.value = '';
            updatedCostPerUnitInput.value = '';
            handleFileSelect();
            // Reset previous values for the next entry
            previousStock = 0;
            previousCostPerUnit = 0;
            previousUnit = 'kg';
            isNewMaterial = false;
            priceManuallyEdited = false; // Reset flag after successful submission
            costPerUnitManuallyEdited = false;
            stockManuallyEdited = false;
            // Keep fields editable after successful submission
            stockInput.removeAttribute('readonly');
            updatedCostPerUnitInput.removeAttribute('readonly');
        } else {
            // This is edit mode (came from the URL), so update the existing document
            dataToSave.updatedAt = Timestamp.now();
            await updateDoc(doc(db, collectionPath, existingMaterialId), dataToSave);
            showMessage('Material updated successfully!', 'success');
            window.location.href = 'all-materials.html';
        }

    } catch (error) {
        console.error("Error submitting document: ", error);
        if (error.code === 'permission-denied') {
            showMessage('Permission denied. Please check your Firestore security rules.', 'error');
        } else {
            showMessage('Failed to submit material. Please check the form and try again.', 'error');
        }
    } finally {
        button.disabled = false;
        buttonText.classList.remove('hidden');
        loadingIndicator.classList.add('hidden');
    }
});


// Page load logic
window.addEventListener('load', async () => {
    try {
        await initializeFirebase();
        
        // Check for a materialId from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('editId');
        
        if (editId) {
            loadMaterialForEdit(editId);
        } else {
            // New entry mode
            document.getElementById('materialId').value = '';
            formTitle.textContent = "Add New Material";
            formButtonText.textContent = "+ Add Purchase";
            viewAllPurchasesBtn.style.display = 'inline-flex';
        }
        
    // Initial state for new entry - keep both fields editable
    stockInput.removeAttribute('readonly');
    updatedCostPerUnitInput.removeAttribute('readonly');
    isNewMaterial = false;

    fetchAndSetCategories();

    } catch (err) {
        console.error("Initialization failed:", err);
        showMessage("Firebase initialization failed. Please check your connection.", "error");
    }
});

// Populates the form with data for editing.
async function loadMaterialForEdit(materialId) {
    try {
        await initializeFirebase();
        if (!db) {
            throw new Error("Firestore instance not available. Cannot load data.");
        }

        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;
        const materialDocRef = doc(db, collectionPath, materialId);
        const materialDoc = await getDoc(materialDocRef);

        if (materialDoc.exists()) {
            const data = materialDoc.data();
            materialIdInput.value = materialId;
            formTitle.textContent = "Edit Material Purchase";
            formButtonText.textContent = "Update Purchase";
            viewAllPurchasesBtn.style.display = 'none';
            isNewMaterial = false;

            // Populate form fields for editing
            document.getElementById('material').value = data.material || '';
            document.getElementById('dealer').value = data.dealer || '';
            document.getElementById('gstNumber').value = data.gstNumber || '';
            document.getElementById('description').value = data.description || '';
            document.getElementById('quantity').value = data.quantity || '';
            document.getElementById('quantityUnit').value = data.quantityUnit || 'kg';
            document.getElementById('pricePerUnit').value = data.pricePerUnit || '';
            document.getElementById('price').value = data.price || '';
            document.getElementById('gst').value = data.gst || 0;
            document.getElementById('hamali').value = data.hamali || 0;
            document.getElementById('transportation').value = data.transportation || 0;
            
            // Populate new minimum quantity field
            minQuantityInput.value = data.minQuantity !== undefined ? data.minQuantity : 0;
            minQuantityUnitSelect.value = data.minQuantityUnit || 'kg';
            
            // These fields are calculated, so we just display the saved values in edit mode
            document.getElementById('stock').value = data.stock || '';
            document.getElementById('updatedCostPerUnit').value = data.updatedCostPerUnit || '';

            _selectedCategories = data.categories || [];

            // Keep fields editable in edit mode
            stockInput.removeAttribute('readonly');
            updatedCostPerUnitInput.removeAttribute('readonly');

            currentBillPhotoUrl = data.billPhotoUrl || null;
            handleFileSelect();
            updatePriceLabel();
        } else {
            showMessage("Material not found for editing.", 'error');
            priceManuallyEdited = false; // Reset price editing flag
            costPerUnitManuallyEdited = false;
            stockManuallyEdited = false;
            materialIdInput.value = '';
            materialForm.reset();
        }
    } catch (error) {
        console.error("Error loading material for edit:", error);
        showMessage("Error loading material for editing. Please try again.", 'error');
        materialIdInput.value = '';
    }
}


// Drawer toggle logic (reused from other pages)
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('hamburgerBtn');
    const drawer = document.getElementById('drawerNav');
    const backdrop = document.getElementById('backdrop');

    if (btn && drawer && backdrop) {
        function openDrawer() {
            drawer.classList.add('open');
            backdrop.classList.add('open');
            drawer.setAttribute('aria-hidden', 'false');
            btn.setAttribute('aria-expanded', 'true');
            const firstLink = drawer.querySelector('a');
            if (firstLink) firstLink.focus({ preventScroll: true });
            document.body.style.overflow = 'hidden';
        }

        function closeDrawer() {
            drawer.classList.remove('open');
            backdrop.classList.remove('open');
            drawer.setAttribute('aria-hidden', 'true');
            btn.setAttribute('aria-expanded', 'false');
            btn.focus({ preventScroll: true });
            document.body.style.overflow = '';
        }

        btn.addEventListener('click', () => {
            drawer.classList.contains('open') ? closeDrawer() : openDrawer();
        });

        backdrop.addEventListener('click', closeDrawer);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
        });

        drawer.addEventListener('click', (e) => {
            if (e.target.closest('a[href]')) closeDrawer();
        });
    } else {
        console.error('Drawer elements not found. Check your HTML IDs.');
    }
});

async function fetchAndSetCategories() {
    try {
        await initializeFirebase();
        if (!db) {
            throw new Error("Firestore instance not available, cannot fetch categories.");
        }
        const fetchedCategoriesSet = new Set(_allCategories);
        const collectionPath = `artifacts/${appId}/users/${auth.currentUser.uid}/materials`;
        const querySnapshot = await getDocs(collection(db, collectionPath));

        querySnapshot.forEach(doc => {
            const materialData = doc.data();
            const categories = materialData['categories'];
            if (categories && Array.isArray(categories)) {
                categories.forEach(cat => {
                    if (typeof cat === 'string') {
                        fetchedCategoriesSet.add(cat);
                    }
                });
            }
        });

        _allCategories = Array.from(fetchedCategoriesSet).sort();
        renderCategories();
    } catch (e) {
        console.error('Error fetching categories from Firestore:', e);
        showMessage('Failed to load categories.', 'error');
    }
}

function renderCategories() {
    categoriesContainer.innerHTML = '';

    const categoriesToRender = _showAllCategories
        ? _allCategories
        : _allCategories.slice(0, categoriesToDisplayLimit);

    categoriesToRender.forEach(category => {
        const isSelected = _selectedCategories.includes(category);
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `chip ${isSelected ? 'selected' : ''}`;
        chip.innerHTML = `<i class="fas ${isSelected ? 'fa-check' : 'fa-plus'} icon"></i> ${category}`;
        chip.onclick = () => toggleCategory(category);
        categoriesContainer.appendChild(chip);
    });

    if (toggleCategoriesText) {
        toggleCategoriesText.innerText = _showAllCategories ? 'Show Less' : 'Show More';
    }

    if (_showAllCategories) {
        customCategoriesSection.classList.remove('hidden');
        renderCustomCategoryFields();
    } else {
        customCategoriesSection.classList.add('hidden');
        _selectedCategories = _selectedCategories.filter(cat => _allCategories.includes(cat));
        customCategoryFieldsArr = [];
        renderCustomCategoryFields();
    }
}

function toggleCategory(category) {
    const index = _selectedCategories.indexOf(category);
    if (index > -1) {
        _selectedCategories.splice(index, 1);
    } else {
        _selectedCategories.push(category);
    }
    renderCategories();
}

function toggleShowAllCategories() {
    _showAllCategories = !_showAllCategories;
    renderCategories();
}

function addCustomCategoryField() {
    const groupDiv = document.createElement("div");
    groupDiv.className = "dynamic-field-group";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Enter custom category name...";
    input.className = "customCategoryName";
    input.required = true;

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "add-btn";
    addBtn.innerHTML = `<i class="fas fa-plus"></i> Add`;
    addBtn.onclick = () => addCustomCategoryToList(input, addBtn);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.innerHTML = `<i class="fas fa-trash-alt"></i>`;
    removeBtn.onclick = () => removeDynamicField("customCategory", groupDiv);

    groupDiv.appendChild(input);
    groupDiv.appendChild(addBtn);
    groupDiv.appendChild(removeBtn);
    customCategoryFields.appendChild(groupDiv);

    customCategoryFieldsArr.push({ input: input, div: groupDiv });
    updateRemoveButtonVisibility("removeCustomCategoryBtn", customCategoryFieldsArr);
}

function addCustomCategoryToList(inputElement, addBtnElement) {
    const categoryText = inputElement.value.trim();
    if (!categoryText) {
        showMessage("Category name cannot be empty.", "error");
        return;
    }

    if (_allCategories.includes(categoryText) || customCategoryFieldsArr.some(field => field.input.value.trim() === categoryText && field.input !== inputElement)) {
        showMessage("This category already exists.", "error");
        return;
    }

    _allCategories.push(categoryText);
    _selectedCategories.push(categoryText);
    
    renderCategories();

    inputElement.disabled = true;
    addBtnElement.disabled = true;
    addBtnElement.innerHTML = `<i class="fas fa-check"></i> Added`;
}

function renderCustomCategoryFields() {
    customCategoryFields.innerHTML = '';
    customCategoryFieldsArr.forEach(field => customCategoryFields.appendChild(field.div));
    updateRemoveButtonVisibility("removeCustomCategoryBtn", customCategoryFieldsArr);
}

function removeDynamicField(type, elementToRemove) {
    elementToRemove.remove();
    let fieldArray;
    let removeButtonId;

    if (type === "customCategory") {
        const categoryText = elementToRemove.querySelector('input').value.trim();
        _selectedCategories = _selectedCategories.filter(cat => cat !== categoryText);
        customCategoryFieldsArr = customCategoryFieldsArr.filter(f => f.div !== elementToRemove);
        fieldArray = customCategoryFieldsArr;
        removeButtonId = "removeCustomCategoryBtn";
        renderCategories();
    }
    updateRemoveButtonVisibility(removeButtonId, fieldArray);
}

function updateRemoveButtonVisibility(buttonId, array) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.classList.toggle('hidden', array.length === 0);
    }
}

toggleCategoriesBtn.addEventListener("click", toggleShowAllCategories);
addCustomCategoryBtn.addEventListener("click", addCustomCategoryField);
removeCustomCategoryBtn.addEventListener("click", () => {
    const lastField = customCategoryFieldsArr[customCategoryFieldsArr.length - 1];
    if (lastField) removeDynamicField("customCategory", lastField.div);
});