import { db, auth, appId, initializeFirebase, collection, onSnapshot, query, where, Timestamp } from './firebase-config.js';
import { doc, updateDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const drugsListContainer = document.getElementById('drugsList');
const searchModal = document.getElementById('searchModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const searchByDrugBtn = document.getElementById('searchByDrugBtn');
const searchByDateBtn = document.getElementById('searchByDateBtn');
const drugSearchForm = document.getElementById('drugSearchForm');
const dateSearchForm = document.getElementById('dateSearchForm');
const searchOptions = document.getElementById('searchOptions');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const deleteModal = document.getElementById('deleteModal');
const historyModal = document.getElementById('historyModal');
const closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
const historyListContainer = document.getElementById('historyList');


let allDrugs = [];
let selectedDrugIdForDeletion = null;

async function loadAllDrugs() {
    try {
        await initializeFirebase();
        const drugsCollectionRef = collection(db, 'drugs');
        const snapshot = await getDocs(drugsCollectionRef);
        allDrugs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayDrugs(allDrugs);
    } catch (error) {
        drugsListContainer.innerHTML = '<div class="message-box message-error">Error loading drugs.</div>';
    }
}

const displayDrugs = (drugs) => {
    const sortedDrugs = [...drugs].sort((a, b) => {
        const nameA = (a.drugName || '').toLowerCase();
        const nameB = (b.drugName || '').toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    const renderCards = (items) => {
        if (items.length === 0) {
            return '<div class="message-box">No drugs found.</div>';
        }
        return items.map(item => {
            let formattedTimestamp = '';
            if (item.timestamp && item.timestamp.seconds) {
                const dateObj = new Date(item.timestamp.seconds * 1000);
                formattedTimestamp = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString();
            }
            let anotherFieldsHtml = '';
            if (Array.isArray(item.anotherFields)) {
                anotherFieldsHtml = `<ul class="list-disc ml-4">${item.anotherFields.map(f => `<li><strong>${f.fieldName}:</strong> ${f.fieldValue}</li>`).join('')}</ul>`;
            }
            let summaryHtml = `
        <div class="font-bold text-green-900 text-lg">${item.drugName || 'Drug Name'}</div>
      `;
            let detailsHtml = `
        ${formattedTimestamp ? `<div><strong>Date Added:</strong> ${formattedTimestamp}</div>` : ''}
        ${item.preparation ? `<div><strong>Preparation:</strong> ${item.preparation}</div>` : ''}
        ${anotherFieldsHtml ? `<div><strong>Details:</strong> ${anotherFieldsHtml}</div>` : ''}
        ${Object.entries(item).filter(([key]) => !['id', 'drugName', 'timestamp', 'preparation', 'anotherFields'].includes(key)).map(([key, value]) => `<div><strong>${key}:</strong> ${typeof value === 'object' ? JSON.stringify(value) : value}</div>`).join('')}
      `;
            return `
      <article class="drug-card p-4 mb-4 rounded-lg shadow bg-white cursor-pointer" onclick="toggleDrugDetails(this)">
        <div class="drug-summary">
          ${summaryHtml}
        </div>
        <div class="drug-details hidden mt-2">
          ${detailsHtml}
        </div>
      </article>
      `;
        }).join('');
    };

    if (drugsListContainer) {
        drugsListContainer.innerHTML = renderCards(sortedDrugs);
    }
};

window.toggleDrugDetails = function (cardElem) {
    const details = cardElem.querySelector('.drug-details');
    if (details) {
        details.classList.toggle('hidden');
    }
};

window.editDrug = async (drugId, event) => {
    event.stopPropagation();
    window.location.href = `drug-entry.html?editId=${drugId}`;
};

window.openDeleteModal = (drugId, event) => {
    event.stopPropagation();
    selectedDrugIdForDeletion = drugId;
    deleteModal.classList.remove('hidden');
};

window.openHistoryModal = (drugName, event) => {
    event.stopPropagation();
    document.getElementById('historyModalTitle').textContent = `${drugName} Drug History`;
    const history = allDrugs.filter(item => item.drugName === drugName);
    if (history.length > 0) {
        const historyHtml = history.map(item => {
            const date = item.timestamp ? item.timestamp.toDate().toLocaleString() : 'N/A';
            const purchaseQuantity = item.quantity !== undefined ? `${item.quantity.toFixed(2)}` : 'N/A';
            const purchaseUnit = item.quantityUnit || 'N/A';
            const pricePerUnit = item.pricePerUnit !== undefined ? `₹${item.pricePerUnit.toFixed(2)}` : 'N/A';
            const totalPurchasePrice = item.price !== undefined ? `₹${item.price.toFixed(2)}` : 'N/A';
            return `
      <div class="history-item">
        <div class="flex-between">
          <strong>Date:</strong> <span>${date}</span>
        </div>
        <div class="flex-between">
          <strong>Quantity:</strong> <span>${purchaseQuantity} ${purchaseUnit}</span>
        </div>
        <div class="flex-between">
          <strong>Price per unit:</strong> <span>${pricePerUnit}</span>
        </div>
        <div class="flex-between">
          <strong>Total Price:</strong> <span>${totalPurchasePrice}</span>
        </div>
        <div class="flex-between" style="margin-top:0.5rem;">
           <button class="action-btn edit-btn" onclick="editDrug('${item.id}', event)">
             <i class="fa-solid fa-pen-to-square"></i> Edit
           </button>
        </div>
      </div>
      `;
        }).join('');
        historyListContainer.innerHTML = historyHtml;
    } else {
        historyListContainer.innerHTML = '<p class="text-center italic text-gray-500">No history available for this drug.</p>';
    }
    historyModal.classList.remove('hidden');
};

const deleteDrug = async () => {
    const user = auth.currentUser;
    if (!user || !selectedDrugIdForDeletion) {
        showMessage('Error deleting drug: Authentication or ID missing.', 'error');
        return;
    }
    try {
        const docRef = doc(db, 'drugs', selectedDrugIdForDeletion);
        await deleteDoc(docRef);
        showMessage('Drug deleted successfully!', 'success');
        deleteModal.classList.add('hidden');
        loadAllDrugs(); // Refresh the list
    } catch (error) {
        showMessage('Failed to delete drug. Please try again.', 'error');
    } finally {
        selectedDrugIdForDeletion = null;
    }
};

closeModalBtn.addEventListener('click', () => {
    searchModal.classList.add('hidden');
    searchOptions.classList.remove('hidden');
    drugSearchForm.classList.add('hidden');
    dateSearchForm.classList.add('hidden');
    displayDrugs(allDrugs);
});

closeHistoryModalBtn.addEventListener('click', () => {
    historyModal.classList.add('hidden');
});

searchByDrugBtn.addEventListener('click', () => {
    searchOptions.classList.add('hidden');
    drugSearchForm.classList.remove('hidden');
});

searchByDateBtn.addEventListener('click', () => {
    searchOptions.classList.add('hidden');
    dateSearchForm.classList.remove('hidden');
});

drugSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const drugName = document.getElementById('drugName').value.trim().toLowerCase();
    if (!drugName) {
        showMessage('Please enter a drug name.', 'error');
        return;
    }

    const filteredDrugs = allDrugs.filter(drug =>
        (drug.drugName || '').toLowerCase().includes(drugName)
    );
    displayDrugs(filteredDrugs);

    searchModal.classList.add('hidden');
    searchOptions.classList.remove('hidden');
    drugSearchForm.classList.add('hidden');
});

dateSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const purchaseDateStr = document.getElementById('purchaseDate').value;
    if (purchaseDateStr) {
        const searchDate = new Date(purchaseDateStr);
        const startDate = new Date(searchDate.setHours(0, 0, 0, 0));
        const endDate = new Date(searchDate.setHours(23, 59, 59, 999));

        const filteredDrugs = allDrugs.filter(drug => {
            if (drug.timestamp && drug.timestamp.seconds) {
                const drugDate = new Date(drug.timestamp.seconds * 1000);
                return drugDate >= startDate && drugDate <= endDate;
            }
            return false;
        });
        displayDrugs(filteredDrugs);
    } else {
        displayDrugs(allDrugs);
    }
    searchModal.classList.add('hidden');
    searchOptions.classList.remove('hidden');
    dateSearchForm.classList.add('hidden');
});

confirmDeleteBtn.addEventListener('click', deleteDrug);
closeDeleteModalBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));
cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.add('hidden'));

document.getElementById('searchBtn').addEventListener('click', () => {
    searchModal.classList.remove('hidden');
});


document.addEventListener('DOMContentLoaded', () => {
    loadAllDrugs();
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
    }
});

function showMessage(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `message-box message-${type}`;
    statusMessage.classList.remove('hidden');
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}