// Global variables
let users = [];

// DOM Elements
const addUserForm = document.getElementById('addUserForm');
const addExpenseForm = document.getElementById('addExpenseForm');
const addSplitBtn = document.getElementById('addSplitBtn');
const splitsContainer = document.getElementById('splitsContainer');
const expensePayerSelect = document.getElementById('expensePayer');
const balancesList = document.getElementById('balancesList');
const expensesList = document.getElementById('expensesList');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchUsers();
    fetchExpenses();
    fetchBalances();
    
    // Add user form submission
    addUserForm.addEventListener('submit', handleAddUser);
    
    // Add expense form submission
    addExpenseForm.addEventListener('submit', handleAddExpense);
    
    // Add split button click
    addSplitBtn.addEventListener('click', addSplitRow);
    
    // Add initial split row
    addSplitRow();
});

// Fetch all users
async function fetchUsers() {
    try {
        const response = await fetch('/api/users');
        users = await response.json();
        updateUserDropdowns();
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

// Fetch all expenses
async function fetchExpenses() {
    try {
        const response = await fetch('/api/expenses');
        const expenses = await response.json();
        renderExpenses(expenses);
    } catch (error) {
        console.error('Error fetching expenses:', error);
    }
}

// Fetch balances
async function fetchBalances() {
    try {
        const response = await fetch('/api/balances');
        const balances = await response.json();
        renderBalances(balances);
    } catch (error) {
        console.error('Error fetching balances:', error);
    }
}

// Handle add user form submission
async function handleAddUser(e) {
    e.preventDefault();
    
    const userData = {
        name: document.getElementById('userName').value,
        email: document.getElementById('userEmail').value
    };
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        
        if (response.ok) {
            // Reset form and refresh users
            addUserForm.reset();
            fetchUsers();
            fetchBalances();
        }
    } catch (error) {
        console.error('Error adding user:', error);
    }
}

// Handle add expense form submission
async function handleAddExpense(e) {
    e.preventDefault();
    
    // Collect split data
    const splitRows = document.querySelectorAll('.split-row');
    const splits = [];
    let totalSplit = 0;
    
    splitRows.forEach(row => {
        const userId = row.querySelector('select').value;
        const amount = parseFloat(row.querySelector('input').value) || 0;
        
        if (userId) {
            splits.push({
                user_id: parseInt(userId),
                amount: amount
            });
            totalSplit += amount;
        }
    });
    
    const expenseData = {
        description: document.getElementById('expenseDesc').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        payer_id: parseInt(expensePayerSelect.value),
        splits: splits
    };
    
    // Validate total split equals expense amount
    if (Math.abs(totalSplit - expenseData.amount) > 0.01) {
        alert('Total split amount must equal the expense amount');
        return;
    }
    
    try {
        const response = await fetch('/api/expenses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(expenseData)
        });
        
        if (response.ok) {
            // Reset form and refresh data
            addExpenseForm.reset();
            splitsContainer.innerHTML = '';
            addSplitRow();
            fetchExpenses();
            fetchBalances();
        }
    } catch (error) {
        console.error('Error adding expense:', error);
    }
}

// Add a new split row
function addSplitRow() {
    const splitRow = document.createElement('div');
    splitRow.className = 'split-row mb-2';
    
    const userSelect = document.createElement('select');
    userSelect.className = 'form-select split-user';
    userSelect.required = true;
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select User';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    userSelect.appendChild(defaultOption);
    
    // Add user options
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.step = '0.01';
    amountInput.min = '0';
    amountInput.className = 'form-control split-amount';
    amountInput.placeholder = 'Amount';
    amountInput.required = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-split';
    removeBtn.innerHTML = '&times;';
    removeBtn.onclick = function() {
        if (document.querySelectorAll('.split-row').length > 1) {
            this.parentElement.remove();
        }
    };
    
    splitRow.appendChild(userSelect);
    splitRow.appendChild(amountInput);
    splitRow.appendChild(removeBtn);
    
    splitsContainer.appendChild(splitRow);
}

// Update user dropdowns in the form
function updateUserDropdowns() {
    // Update payer dropdown
    expensePayerSelect.innerHTML = '<option value="" disabled selected>Select Payer</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        expensePayerSelect.appendChild(option);
    });
    
    // Update split user dropdowns
    const userSelects = document.querySelectorAll('.split-user');
    userSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="" disabled selected>Select User</option>';
        
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Render expenses list
function renderExpenses(expenses) {
    if (expenses.length === 0) {
        expensesList.innerHTML = '<p class="text-muted">No expenses yet. Add your first expense!</p>';
        return;
    }
    
    expensesList.innerHTML = '';
    
    expenses.forEach(expense => {
        const expenseEl = document.createElement('div');
        expenseEl.className = 'expense-item';
        
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between';
        header.innerHTML = `
            <h6>${expense.description}</h6>
            <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
        `;
        
        const details = document.createElement('div');
        details.className = 'text-muted small';
        details.textContent = `Paid by ${expense.payer} - ${new Date(expense.date).toLocaleDateString()}`;
        
        const splits = document.createElement('div');
        splits.className = 'mt-2';
        
        const splitList = document.createElement('ul');
        splitList.className = 'list-unstyled mb-0';
        
        expense.splits.forEach(split => {
            const user = users.find(u => u.id === split.user_id);
            if (user) {
                const li = document.createElement('li');
                li.textContent = `${user.name} owes $${split.amount.toFixed(2)}`;
                splitList.appendChild(li);
            }
        });
        
        splits.appendChild(splitList);
        
        expenseEl.appendChild(header);
        expenseEl.appendChild(details);
        expenseEl.appendChild(splits);
        
        expensesList.appendChild(expenseEl);
    });
}

// Render balances list
function renderBalances(balances) {
    if (Object.keys(balances).length === 0) {
        balancesList.innerHTML = '<p class="text-muted">No balances to display.</p>';
        return;
    }
    
    balancesList.innerHTML = '';
    
    // Create a list of users with their balances
    const balanceItems = [];
    
    for (const [userId, data] of Object.entries(balances)) {
        balanceItems.push({
            id: userId,
            name: data.name,
            balance: data.balance
        });
    }
    
    // Sort by balance (highest to lowest)
    balanceItems.sort((a, b) => b.balance - a.balance);
    
    // Render each balance item
    balanceItems.forEach(item => {
        const balanceEl = document.createElement('div');
        balanceEl.className = 'balance-item';
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.name;
        
        const amountSpan = document.createElement('span');
        amountSpan.className = item.balance >= 0 ? 'balance-positive' : 'balance-negative';
        
        if (item.balance > 0) {
            amountSpan.textContent = `Gets back $${item.balance.toFixed(2)}`;
        } else if (item.balance < 0) {
            amountSpan.textContent = `Owes $${Math.abs(item.balance).toFixed(2)}`;
        } else {
            amountSpan.textContent = 'Settled up';
            amountSpan.className = 'text-muted';
        }
        
        balanceEl.appendChild(nameSpan);
        balanceEl.appendChild(amountSpan);
        
        balancesList.appendChild(balanceEl);
    });
}
