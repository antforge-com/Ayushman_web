import { db, auth, appId, initializeFirebase, collection, onSnapshot, query, where, Timestamp } from '../firebase-config.js';
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const productPricesListContainer = document.getElementById('productPricesList');
const statusMessageDiv = document.getElementById('statusMessage');

// Modal Elements
const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// New Search Modal Elements
const searchBtn = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const searchOptions = document.getElementById('searchOptions');
const searchByProductBtn = document.getElementById('searchByProductBtn');
const searchByDateBtn = document.getElementById('searchByDateBtn');
const productSearchForm = document.getElementById('productSearchForm');
const dateSearchForm = document.getElementById('dateSearchForm');

let unsubscribe = null; // Variable to store the unsubscribe function for the Firestore listener.
let selectedProductIdForDeletion = null;


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
 * Checks if the user is authenticated and sets up the data listener.
 */
const setupAuthCheck = async () => {
    try {
        await initializeFirebase();
    } catch (err) {
        console.error("Firebase initialization failed:", err);
        productPricesListContainer.innerHTML = '<div class="message-box message-error">Error connecting to the database.</div>';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            setupProductPriceListener(user.uid);
        } else {
            console.log("No user is signed in. Redirecting to login page.");
            window.location.href = '../login.html';
        }
    });
};

/**
 * Sets up a real-time listener for the products collection for the current user.
 * @param {string} currentUserId - The ID of the currently logged-in user.
 * @param {object} optionalQuery - An optional Firestore query to apply a filter.
 * @param {string} searchProductName - Case-insensitive search के लिए product का नाम.
 */
const setupProductPriceListener = (currentUserId, optionalQuery = [], searchProductName = null) => {
    console.log('setupProductPriceListener called with userId:', currentUserId);
    console.log('appId:', appId);
    
    if (unsubscribe) {
        unsubscribe(); // Unsubscribe from the previous listener
    }

    if (!db || !currentUserId) {
        console.error("Database or user ID not available. db:", !!db, "userId:", currentUserId);
        productPricesListContainer.innerHTML = '<div class="message-box message-error">Could not retrieve data. Please log in again.</div>';
        return;
    }

    // FIX: सीधे user-specific collection path का उपयोग करें
    const collectionPath = `artifacts/${appId}/users/${currentUserId}/products`;
    console.log('Fetching from collection path:', collectionPath);
    
    let baseQuery = collection(db, collectionPath);
    let finalQuery = query(baseQuery, ...optionalQuery);
    
    // Show loading state
    productPricesListContainer.innerHTML = '<div class="message-box message-info">Loading products...</div>';
    
    unsubscribe = onSnapshot(finalQuery, (snapshot) => {
        console.log('Snapshot received. Number of documents:', snapshot.size);
        
        let productPrices = [];
        snapshot.forEach(doc => {
            console.log('Product document:', doc.id, doc.data());
            productPrices.push({ id: doc.id, ...doc.data() });
        });

        if (searchProductName) {
            const lowerCaseSearch = searchProductName.toLowerCase();
            productPrices = productPrices.filter(item => 
                item.name && item.name.toLowerCase().includes(lowerCaseSearch)
            );
            console.log('Filtered products by name:', productPrices.length);
        }

        // Sort data on the client-side alphabetically by product name
        productPrices.sort((a, b) => {
            const nameA = a.name ? a.name.toLowerCase() : '';
            const nameB = b.name ? b.name.toLowerCase() : '';
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        console.log('Displaying products:', productPrices.length);
        displayProductPrices(productPrices);
    }, (error) => {
        console.error("Error listening to product prices:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        let errorMessage = 'Error loading data.';
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check your Firestore security rules.';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Database unavailable. Please check your internet connection.';
        }
        
        productPricesListContainer.innerHTML = `<div class="message-box message-error">${errorMessage}<br><small>Error: ${error.message}</small></div>`;
    });
};

/**
 * Dynamically displays product prices in the UI.
 * @param {Array} productPrices - The list of product prices to display.
 */
const displayProductPrices = (productPrices) => {
    if (productPrices.length === 0) {
        productPricesListContainer.innerHTML = '<div class="message-box">No product prices have been calculated yet.</div>';
        return;
    }

    const productCards = productPrices.map(item => {
        const date = item.timestamp ? item.timestamp.toDate().toLocaleDateString() : 'N/A';
        const time = item.timestamp ? item.timestamp.toDate().toLocaleTimeString() : 'N/A';

        const calculations = item.calculations || {};
        const materialsUsed = item.materialsUsed || [];
        const bottleInfo = item.bottleInfo || {};

        const baseCost = calculations.baseCost !== undefined ? `₹${calculations.baseCost.toFixed(2)}` : 'N/A';
        const margin1 = calculations.margin1 !== undefined ? `₹${calculations.margin1.toFixed(2)}` : 'N/A';
        const margin2 = calculations.margin2 !== undefined ? `₹${calculations.margin2.toFixed(2)}` : 'N/A';
        const totalSellingPrice = calculations.totalSellingPrice !== undefined ? `₹${calculations.totalSellingPrice.toFixed(2)}` : 'N/A';
        const grossPerBottle = calculations.grossPerBottle !== undefined ? `₹${calculations.grossPerBottle.toFixed(2)}` : 'N/A';

        const bottleCost = bottleInfo.numBottles !== undefined && bottleInfo.costPerBottle !== undefined ? `₹${(bottleInfo.numBottles * bottleInfo.costPerBottle).toFixed(2)}` : 'N/A';
        const totalMaterialCost = materialsUsed.reduce((sum, material) => sum + (material.totalCost || 0), 0).toFixed(2);
        
        const ingredientsTable = materialsUsed.map((material, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${material.materialName || 'N/A'}</td>
                <td>${material.quantity} ${material.unit}</td>
                <td>₹${(material.costPerUnit || 0).toFixed(2)}</td>
                <td>₹${(material.totalCost || 0).toFixed(2)}</td>
            </tr>
        `).join('');

        return `
            <article class="price-card" id="product-${item.id}">
                <header class="price-header flex justify-between items-center" data-id="${item.id}">
                    <div class="flex items-center gap-2">
                        <h3>${item.name || `Price Calculation ${date}`}</h3>
                    </div>
                    <div class="flex items-center gap-4">
                         <div class="card-actions">
                            <button class="action-btn print-btn" onclick="printProduct('${item.id}', event)" title="Print">
                                <i class="fa-solid fa-print"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="openDeleteModal('${item.id}', event)" title="Delete">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                        <span style="font-weight:700;">${grossPerBottle} per bottle</span>
                        <i class="fa-solid fa-chevron-down toggle-icon"></i>
                    </div>
                </header>
                <div class="price-body hidden" id="details-${item.id}">
                    <div class="price-details">
                        <!-- Product Information Table -->
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Date:</span>
                                <span class="info-value">${date}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Drug Name:</span>
                                <span class="info-value">${item.name || 'N/A'}</span>
                            </div>
                            ${item.description ? `
                            <div class="info-item">
                                <span class="info-label">Description:</span>
                                <span class="info-value">${item.description}</span>
                            </div>
                            ` : ''}
                            <div class="info-item">
                                <span class="info-label">Cost:</span>
                                <span class="info-value">${baseCost}</span>
                            </div>
                        </div>

                        <!-- Ingredients Table -->
                        <h4 class="section-title">Ingredients</h4>
                        <table class="ingredients-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Ingredient</th>
                                    <th>Quantity</th>
                                    <th>Price/Unit</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ingredientsTable}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="4" style="text-align: right; font-weight: 600;">Sum:</td>
                                    <td style="font-weight: 700;">₹${totalMaterialCost}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <!-- Calculations Section -->
                        <h4 class="section-title">Calculations</h4>
                        <div class="calc-grid">
                            <div class="calc-row">
                                <span>Total Bottles with Labels:</span>
                                <span>${bottleInfo.numBottles || 'N/A'}</span>
                            </div>
                            <div class="calc-row">
                                <span>Total Material Cost:</span>
                                <span>₹${totalMaterialCost}</span>
                            </div>
                            <div class="calc-row">
                                <span>Total Bottle Cost:</span>
                                <span>${bottleCost}</span>
                            </div>
                            <div class="calc-row highlight">
                                <span>Base Cost (Sum + Bottle):</span>
                                <span>${baseCost}</span>
                            </div>
                            <div class="calc-row">
                                <span>Margin 1 (113%):</span>
                                <span>${margin1}</span>
                            </div>
                            <div class="calc-row">
                                <span>Margin 2 (12%):</span>
                                <span>${margin2}</span>
                            </div>
                            <div class="calc-row highlight">
                                <span>Total Selling Price:</span>
                                <span>${totalSellingPrice}</span>
                            </div>
                            <div class="calc-row primary">
                                <span>Each Bottle Price:</span>
                                <span>${grossPerBottle}</span>
                            </div>
                        </div>
                        
                        <p class="timestamp">Calculated on: ${date} at ${time}</p>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    productPricesListContainer.innerHTML = productCards;

    // Add event listeners to each card header
    document.querySelectorAll('.price-header').forEach(header => {
        header.addEventListener('click', (event) => {
            const cardBody = document.getElementById(`details-${header.dataset.id}`);
            const isExpanded = cardBody.classList.contains('expanded');
            
            // Toggle the visibility of the details section
            cardBody.classList.toggle('expanded');
            header.classList.toggle('expanded');
            
            // Toggle the icon
            const icon = header.querySelector('.toggle-icon');
            if (icon) {
                icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    });
};

/**
 * Opens the delete confirmation modal.
 * @param {string} productId - The ID of the product price to delete.
 * @param {Event} event - The event object to stop propagation.
 */
window.openDeleteModal = (productId, event) => {
    event.stopPropagation(); // Prevent card from expanding
    selectedProductIdForDeletion = productId;
    deleteModal.classList.remove('hidden');
};

/**
 * Prints a specific product card.
 * @param {string} productId - The ID of the product to print.
 * @param {Event} event - The event object to stop propagation.
 */
window.printProduct = (productId, event) => {
    event.stopPropagation(); // Prevent card from expanding
    
    const productCard = document.getElementById(`product-${productId}`);
    const detailsSection = document.getElementById(`details-${productId}`);
    
    if (!productCard || !detailsSection) {
        console.error('Product card not found');
        alert('Error: Product not found');
        return;
    }
    
    // Temporarily expand the card if it's collapsed
    const wasHidden = detailsSection.classList.contains('hidden');
    if (wasHidden) {
        detailsSection.classList.remove('hidden');
    }
    
    // Clone the product card for printing
    const printContent = productCard.cloneNode(true);
    
    // Remove action buttons from the cloned content
    const actionButtons = printContent.querySelectorAll('.card-actions');
    actionButtons.forEach(btn => btn.remove());
    
    // Remove toggle icon
    const toggleIcon = printContent.querySelector('.toggle-icon');
    if (toggleIcon) toggleIcon.remove();
    
    // Ensure the details are visible in the clone
    const clonedDetails = printContent.querySelector('.price-body');
    if (clonedDetails) {
        clonedDetails.classList.remove('hidden');
        clonedDetails.classList.add('expanded');
    }
    
    // Get the product name for the title
    const productName = productCard.querySelector('h3') ? productCard.querySelector('h3').textContent : 'Product';
    
    // Create a print window
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
        alert('Please allow popups for this site to enable printing');
        if (wasHidden) {
            detailsSection.classList.add('hidden');
        }
        return;
    }
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print - ${productName}</title>
            <meta charset="UTF-8">
            <style>
                * {
                    box-sizing: border-box;
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                }
                body {
                    margin: 10px;
                    padding: 0;
                    font-size: 12px;
                }
                .price-card {
                    border: 2px solid #234123;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .price-header {
                    background: #234123;
                    color: white;
                    padding: 10px 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .price-header h3 {
                    margin: 0;
                    font-size: 16px;
                }
                .price-body {
                    padding: 12px;
                    display: block !important;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 12px;
                    border: 1px solid #ddd;
                    padding: 10px;
                    border-radius: 4px;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .info-label {
                    font-weight: 700;
                    color: #234123;
                    font-size: 10px;
                    text-transform: uppercase;
                }
                .info-value {
                    color: #333;
                    font-size: 12px;
                }
                .section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #234123;
                    margin: 12px 0 6px;
                    padding-bottom: 3px;
                    border-bottom: 2px solid #234123;
                }
                .ingredients-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                    font-size: 11px;
                }
                .ingredients-table th,
                .ingredients-table td {
                    border: 1px solid #ddd;
                    padding: 5px 6px;
                    text-align: left;
                }
                .ingredients-table th {
                    background: #f0f0f0;
                    font-weight: 700;
                    color: #234123;
                    font-size: 10px;
                }
                .ingredients-table tfoot td {
                    background: #f9f9f9;
                    font-weight: 600;
                    font-size: 11px;
                }
                .calc-grid {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .calc-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 6px 10px;
                    border-bottom: 1px solid #eee;
                    font-size: 11px;
                }
                .calc-row:last-child {
                    border-bottom: none;
                }
                .calc-row.highlight {
                    background: #f9f9f9;
                    font-weight: 600;
                }
                .calc-row.primary {
                    background: #234123;
                    color: white;
                    font-weight: 700;
                    font-size: 13px;
                    padding: 8px 10px;
                }
                .timestamp {
                    margin-top: 10px;
                    font-size: 10px;
                    color: #666;
                    text-align: right;
                    font-style: italic;
                }
                @media print {
                    body { margin: 0; }
                    .price-card { border-radius: 0; }
                }
            </style>
        </head>
        <body>
            ${printContent.outerHTML}
            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 250);
                };
                
                window.onafterprint = function() {
                    window.close();
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Restore original state if it was hidden
    if (wasHidden) {
        setTimeout(() => {
            detailsSection.classList.add('hidden');
        }, 500);
    }
};

/**
 * Deletes a product price document from Firestore.
 */
const deleteProductPrice = async () => {
    const user = auth.currentUser;
    if (!user || !selectedProductIdForDeletion) {
        showMessage('Error deleting product price: Authentication or ID missing.', 'error');
        return;
    }

    try {
        // FIX: सीधे user-specific collection path का उपयोग करें
        const collectionPath = `artifacts/${appId}/users/${user.uid}/products`;
        const docRef = doc(db, collectionPath, selectedProductIdForDeletion);
        await deleteDoc(docRef);
        showMessage('Product price deleted successfully!', 'success');
        deleteModal.classList.add('hidden');
    } catch (error) {
        console.error("Error deleting product price:", error);
        showMessage('Failed to delete product price. Please try again.', 'error');
    } finally {
        selectedProductIdForDeletion = null;
    }
};

// Delete Confirmation & Cancel Listeners
confirmDeleteBtn.addEventListener('click', deleteProductPrice);
closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

// Search Modal Listeners
searchBtn.addEventListener('click', () => {
    searchModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    searchModal.classList.add('hidden');
    searchOptions.classList.remove('hidden');
    productSearchForm.classList.add('hidden');
    dateSearchForm.classList.add('hidden');
    
    const user = auth.currentUser;
    if (user) {
        setupProductPriceListener(user.uid);
    }
});

searchByProductBtn.addEventListener('click', () => {
    searchOptions.classList.add('hidden');
    productSearchForm.classList.remove('hidden');
});

searchByDateBtn.addEventListener('click', () => {
    searchOptions.classList.add('hidden');
    dateSearchForm.classList.remove('hidden');
});

productSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const productName = document.getElementById('productName').value.trim();
    const user = auth.currentUser;
    if (user) {
        const searchQueries = [];
        setupProductPriceListener(user.uid, searchQueries, productName);
        searchModal.classList.add('hidden');
    }
});

dateSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const purchaseDateStr = document.getElementById('purchaseDate').value;
    const user = auth.currentUser;
    if (purchaseDateStr && user) {
        const startDate = new Date(purchaseDateStr);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(purchaseDateStr);
        endDate.setHours(23, 59, 59, 999);
        
        const searchQueries = [
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            where('timestamp', '<=', Timestamp.fromDate(endDate))
        ];
        setupProductPriceListener(user.uid, searchQueries);
        searchModal.classList.add('hidden');
    } else if (user) {
        setupProductPriceListener(user.uid);
        searchModal.classList.add('hidden');
    }
});


// Drawer toggle logic
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('hamburgerBtn');
    const drawer = document.getElementById('drawerNav');
    const backdrop = document.getElementById('backdrop');
    const logoutLink = document.getElementById('logoutLink');

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
    
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                console.log("User signed out successfully.");
                window.location.href = '../login.html';
            } catch (error) {
                console.error("Error signing out: ", error);
            }
        });
    }
});

// Start the authentication check on page load
window.onload = setupAuthCheck;
