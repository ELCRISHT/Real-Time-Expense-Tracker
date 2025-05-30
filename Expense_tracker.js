// Data storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budget = parseFloat(localStorage.getItem('budget')) || 0;
let currentChart = null;

// DOM Elements
const transactionForm = document.getElementById('transaction-form');
const budgetForm = document.getElementById('budget-form');
const transactionTypeSelect = document.getElementById('transaction-type');
const categorySelect = document.getElementById('category');
const amountInput = document.getElementById('amount');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('date');
const transactionsList = document.getElementById('transactions-list');
const totalBalanceElement = document.getElementById('total-balance');
const totalIncomeElement = document.getElementById('total-income');
const totalExpensesElement = document.getElementById('total-expenses');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const chartButtons = document.querySelectorAll('.chart-btn');
const mainChart = document.getElementById('main-chart');
const budgetSection = document.querySelector('.budget-section');
const budgetDisplay = document.getElementById('budget-display');
const currentExpenses = document.getElementById('current-expenses');
const remainingBudget = document.getElementById('remaining-budget');
const budgetProgressBar = document.getElementById('budget-progress-bar');
const budgetAmountInput = document.getElementById('budget-amount');

// Set today's date as default
const today = new Date();
dateInput.value = today.toISOString().substr(0, 10);

// Initialize
function init() {
    updateCategoryOptions();
    updateTransactionsList();
    updateSummary();
    updateBudgetDisplay();
    renderChart('overview');
    
    // Set budget input value
    budgetAmountInput.value = budget.toFixed(2);
}

// Event Listeners
transactionForm.addEventListener('submit', addTransaction);
budgetForm.addEventListener('submit', setBudget);
transactionTypeSelect.addEventListener('change', updateCategoryOptions);

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');
        
        tab.classList.add('active');
        document.getElementById(tabId).style.display = 'block';
    });
});

chartButtons.forEach(button => {
    button.addEventListener('click', () => {
        const chartType = button.getAttribute('data-chart');
        
        chartButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        renderChart(chartType);
    });
});

// Add Transaction Function
function addTransaction(e) {
    e.preventDefault();
    
    const type = transactionTypeSelect.value;
    const category = categorySelect.value;
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value;
    const date = dateInput.value;
    
    const transaction = {
        id: generateID(),
        type,
        category,
        amount,
        description,
        date
    };
    
    transactions.push(transaction);
    
    // Save to localStorage
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Update UI
    updateTransactionsList();
    updateSummary();
    updateBudgetDisplay();
    renderChart(document.querySelector('.chart-btn.active').getAttribute('data-chart'));
    
    // Reset form
    transactionForm.reset();
    dateInput.value = today.toISOString().substr(0, 10);
    updateCategoryOptions();
}

// Set Budget Function
function setBudget(e) {
    e.preventDefault();
    
    budget = parseFloat(budgetAmountInput.value);
    localStorage.setItem('budget', budget);
    
    updateBudgetDisplay();
    
    // Show budget section if budget is set
    if (budget > 0) {
        budgetSection.style.display = 'block';
    }
}

// Update Category Options based on Transaction Type
function updateCategoryOptions() {
    const type = transactionTypeSelect.value;
    const incomeCategories = document.querySelectorAll('.income-category');
    const expenseCategories = document.querySelectorAll('.expense-category');
    
    if (type === 'income') {
        incomeCategories.forEach(option => option.style.display = 'block');
        expenseCategories.forEach(option => option.style.display = 'none');
        categorySelect.value = 'salary';
    } else {
        incomeCategories.forEach(option => option.style.display = 'none');
        expenseCategories.forEach(option => option.style.display = 'block');
        categorySelect.value = 'rent';
    }
}

// Update Transactions List
function updateTransactionsList() {
    if (transactions.length === 0) {
        transactionsList.innerHTML = '<tr><td colspan="5" class="empty-state">No transactions yet. Add your first transaction above.</td></tr>';
        return;
    }
    
    transactionsList.innerHTML = '';
    
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        const formattedDate = new Date(transaction.date).toLocaleDateString();
        const formattedAmount = formatCurrency(transaction.amount);
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const sign = transaction.type === 'income' ? '+' : '-';
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${transaction.description}</td>
            <td>${formatCategory(transaction.category)}</td>
            <td class="${amountClass}">${sign} ${formattedAmount}</td>
            <td><button class="delete-btn" data-id="${transaction.id}">Delete</button></td>
        `;
        
        transactionsList.appendChild(row);
    });
    
    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const id = button.getAttribute('data-id');
            deleteTransaction(id);
        });
    });
}

// Delete Transaction
function deleteTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    
    // Save to localStorage
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Update UI
    updateTransactionsList();
    updateSummary();
    updateBudgetDisplay();
    renderChart(document.querySelector('.chart-btn.active').getAttribute('data-chart'));
}

// Update Summary
function updateSummary() {
    const totalIncome = transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0);
        
    const totalExpenses = transactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0);
        
    const balance = totalIncome - totalExpenses;
    
    totalBalanceElement.textContent = formatCurrency(balance);
    totalIncomeElement.textContent = formatCurrency(totalIncome);
    totalExpensesElement.textContent = formatCurrency(totalExpenses);
    
    // Add class based on balance
    totalBalanceElement.className = 'value';
    if (balance > 0) totalBalanceElement.classList.add('positive');
    if (balance < 0) totalBalanceElement.classList.add('negative');
}

// Update Budget Display
function updateBudgetDisplay() {
    if (budget <= 0) {
        budgetSection.style.display = 'none';
        return;
    }
    
    budgetSection.style.display = 'block';
    
    // Get current month expenses
    const currentMonthExpenses = getCurrentMonthExpenses();
    const remaining = budget - currentMonthExpenses;
    const percentage = (currentMonthExpenses / budget) * 100;
    
    budgetDisplay.textContent = formatCurrency(budget);
    currentExpenses.textContent = formatCurrency(currentMonthExpenses);
    remainingBudget.textContent = formatCurrency(remaining);
    
    // Update progress bar
    budgetProgressBar.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update progress bar color based on budget usage
    budgetProgressBar.className = 'progress-bar';
    if (percentage >= 80 && percentage < 100) {
        budgetProgressBar.classList.add('warning');
    } else if (percentage >= 100) {
        budgetProgressBar.classList.add('danger');
    }
}

// Get current month expenses
function getCurrentMonthExpenses() {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return transactions
        .filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transaction.type === 'expense' && 
                   transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        })
        .reduce((total, transaction) => total + transaction.amount, 0);
}

// Render Chart
function renderChart(chartType) {
    if (currentChart) {
        currentChart.destroy();
    }
    
    switch(chartType) {
        case 'overview':
            renderOverviewChart();
            break;
        case 'expenses':
            renderExpensesCategoryChart();
            break;
        case 'income':
            renderIncomeCategoryChart();
            break;
        case 'trend':
            renderTrendChart();
            break;
    }
}

// Render Overview Chart
function renderOverviewChart() {
    const totalIncome = transactions
        .filter(transaction => transaction.type === 'income')
        .reduce((total, transaction) => total + transaction.amount, 0);
        
    const totalExpenses = transactions
        .filter(transaction => transaction.type === 'expense')
        .reduce((total, transaction) => total + transaction.amount, 0);
    
    const data = {
        labels: ['Income', 'Expenses'],
        datasets: [{
            data: [totalIncome, totalExpenses],
            backgroundColor: [
                'rgba(40, 167, 69, 0.7)',
                'rgba(220, 53, 69, 0.7)'
            ],
            borderColor: [
                'rgba(40, 167, 69, 1)',
                'rgba(220, 53, 69, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    currentChart = new Chart(mainChart, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Income vs Expenses Overview',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Render Expenses by Category Chart
function renderExpensesCategoryChart() {
    // Group expenses by category
    const expensesByCategory = {};
    
    transactions
        .filter(transaction => transaction.type === 'expense')
        .forEach(transaction => {
            if (!expensesByCategory[transaction.category]) {
                expensesByCategory[transaction.category] = 0;
            }
            expensesByCategory[transaction.category] += transaction.amount;
        });
    
    const categories = Object.keys(expensesByCategory);
    const amounts = Object.values(expensesByCategory);
    
    // Colors for categories
    const backgroundColors = [
        'rgba(220, 53, 69, 0.7)',
        'rgba(255, 193, 7, 0.7)',
        'rgba(13, 110, 253, 0.7)',
        'rgba(40, 167, 69, 0.7)',
        'rgba(111, 66, 193, 0.7)',
        'rgba(23, 162, 184, 0.7)',
        'rgba(255, 102, 0, 0.7)',
        'rgba(108, 117, 125, 0.7)',
        'rgba(0, 123, 255, 0.7)'
    ];
    
    const data = {
        labels: categories.map(category => formatCategory(category)),
        datasets: [{
            data: amounts,
            backgroundColor: backgroundColors.slice(0, categories.length),
            borderWidth: 1
        }]
    };
    
    currentChart = new Chart(mainChart, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Expenses by Category',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Render Monthly Trend Chart
function renderTrendChart() {
    // Get last 6 months
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear();
        months.push({ 
            name: `${monthName} ${year}`, 
            month: date.getMonth(), 
            year: date.getFullYear() 
        });
    }
    
    // Calculate income and expenses for each month
    const incomeData = [];
    const expenseData = [];
    
    months.forEach(monthData => {
        const monthIncome = transactions
            .filter(transaction => {
                const date = new Date(transaction.date);
                return transaction.type === 'income' && 
                       date.getMonth() === monthData.month && 
                       date.getFullYear() === monthData.year;
            })
            .reduce((total, transaction) => total + transaction.amount, 0);
            
        const monthExpenses = transactions
            .filter(transaction => {
                const date = new Date(transaction.date);
                return transaction.type === 'expense' && 
                       date.getMonth() === monthData.month && 
                       date.getFullYear() === monthData.year;
            })
            .reduce((total, transaction) => total + transaction.amount, 0);
        
        incomeData.push(monthIncome);
        expenseData.push(monthExpenses);
    });
    
    const data = {
        labels: months.map(month => month.name),
        datasets: [
            {
                label: 'Income',
                data: incomeData,
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: 'rgba(40, 167, 69, 1)',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'Expenses',
                data: expenseData,
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 2,
                tension: 0.4
            }
        ]
    };
    
    currentChart = new Chart(mainChart, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Income and Expenses Trend',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Render Income by Category Chart
function renderIncomeCategoryChart() {
    // Group income by category
    const incomeByCategory = {};
    
    transactions
        .filter(transaction => transaction.type === 'income')
        .forEach(transaction => {
            if (!incomeByCategory[transaction.category]) {
                incomeByCategory[transaction.category] = 0;
            }
            incomeByCategory[transaction.category] += transaction.amount;
        });
    
    const categories = Object.keys(incomeByCategory);
    const amounts = Object.values(incomeByCategory);
    
    // Colors for categories
    const backgroundColors = [
        'rgba(40, 167, 69, 0.7)',
        'rgba(13, 110, 253, 0.7)',
        'rgba(23, 162, 184, 0.7)',
        'rgba(111, 66, 193, 0.7)',
        'rgba(255, 193, 7, 0.7)'
    ];
    
    const data = {
        labels: categories.map(category => formatCategory(category)),
        datasets: [{
            data: amounts,
            backgroundColor: backgroundColors.slice(0, categories.length),
            borderWidth: 1
        }]
    };
    
    currentChart = new Chart(mainChart, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                title: {
                    display: true,
                    text: 'Income by Category',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.raw);
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.raw / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Helper Functions
function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function formatCategory(category) {
    return category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function generateID() {
    return Math.random().toString(36).substr(2, 9);
}

// Initialize the app
init();
