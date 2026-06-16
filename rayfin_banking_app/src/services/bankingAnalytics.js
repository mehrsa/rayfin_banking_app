function toDate(value) {
    return new Date(value);
}
function monthKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}`;
}
function isCurrentMonth(date) {
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}
function isExpense(transaction) {
    return (transaction.transactionType === 'payment' ||
        transaction.transactionType === 'withdrawal');
}
function getBudgetStatus(utilization) {
    if (utilization >= 1) {
        return 'exceeded';
    }
    if (utilization >= 0.85) {
        return 'watch';
    }
    return 'on-track';
}
export function getTransactionImpact(transaction, accountId) {
    const incoming = transaction.toAccount_id === accountId ? transaction.amount : 0;
    const outgoing = transaction.fromAccount_id === accountId ? transaction.amount : 0;
    return incoming - outgoing;
}
export function buildAccountSummaries(accounts, transactions) {
    return [...accounts]
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((account) => {
        const netChange = transactions.reduce((total, transaction) => total + getTransactionImpact(transaction, account.id), 0);
        return {
            ...account,
            netChange,
            currentBalance: account.openingBalance + netChange,
        };
    });
}
function buildMonthlyCashFlow(transactions) {
    return Array.from({ length: 6 }, (_, index) => {
        const monthsBack = 5 - index;
        const cursor = new Date();
        cursor.setMonth(cursor.getMonth() - monthsBack, 1);
        const matchingTransactions = transactions.filter((transaction) => {
            const postedAt = toDate(transaction.postedAt);
            return monthKey(postedAt) === monthKey(cursor);
        });
        const income = matchingTransactions
            .filter((transaction) => transaction.transactionType === 'deposit')
            .reduce((total, transaction) => total + transaction.amount, 0);
        const expenses = matchingTransactions
            .filter(isExpense)
            .reduce((total, transaction) => total + transaction.amount, 0);
        const transfers = matchingTransactions
            .filter((transaction) => transaction.transactionType === 'transfer')
            .reduce((total, transaction) => total + transaction.amount, 0);
        return {
            monthLabel: cursor.toLocaleString('en-US', { month: 'short' }),
            income,
            expenses,
            transfers,
            net: income - expenses,
        };
    });
}
function buildCategorySpend(categories, transactions) {
    const expenseTransactions = transactions.filter((transaction) => isExpense(transaction) && isCurrentMonth(toDate(transaction.postedAt)));
    return categories
        .filter((category) => category.kind === 'expense')
        .map((category) => {
        const spent = expenseTransactions
            .filter((transaction) => transaction.category_id === category.id)
            .reduce((total, transaction) => total + transaction.amount, 0);
        const utilization = category.monthlyBudget > 0 ? spent / category.monthlyBudget : 0;
        const exceededAmount = category.monthlyBudget > 0 ? Math.max(spent - category.monthlyBudget, 0) : 0;
        return {
            categoryId: category.id,
            name: category.name,
            accentColor: category.accentColor,
            budget: category.monthlyBudget,
            spent,
            utilization,
            remaining: Math.max(category.monthlyBudget - spent, 0),
            exceededAmount,
            status: getBudgetStatus(utilization),
        };
    })
        .sort((left, right) => {
        const statusRank = { exceeded: 3, watch: 2, 'on-track': 1 };
        return (statusRank[right.status] - statusRank[left.status] ||
            right.utilization - left.utilization ||
            right.spent - left.spent);
    });
}
function buildTopMerchants(transactions) {
    const merchantMap = new Map();
    const totalExpenses = transactions
        .filter(isExpense)
        .reduce((total, transaction) => total + transaction.amount, 0);
    transactions.filter(isExpense).forEach((transaction) => {
        const merchantName = transaction.merchantName?.trim();
        if (!merchantName)
            return;
        const current = merchantMap.get(merchantName) ?? {
            merchantName,
            amount: 0,
            transactionCount: 0,
            shareOfExpenses: 0,
        };
        current.amount += transaction.amount;
        current.transactionCount += 1;
        merchantMap.set(merchantName, current);
    });
    return [...merchantMap.values()]
        .map((merchant) => ({
        ...merchant,
        shareOfExpenses: totalExpenses > 0 ? (merchant.amount / totalExpenses) * 100 : 0,
    }))
        .sort((left, right) => right.amount - left.amount)
        .slice(0, 5);
}
function buildBudgetHealthSummary(categorySpend) {
    const totalBudget = categorySpend.reduce((total, item) => total + item.budget, 0);
    const totalSpent = categorySpend.reduce((total, item) => total + item.spent, 0);
    return {
        totalBudget,
        totalSpent,
        totalRemaining: Math.max(totalBudget - totalSpent, 0),
        overallUtilization: totalBudget > 0 ? totalSpent / totalBudget : 0,
        exceededCount: categorySpend.filter((item) => item.status === 'exceeded').length,
        watchCount: categorySpend.filter((item) => item.status === 'watch').length,
    };
}
export function buildBankingAnalytics(snapshot) {
    const accountSummaries = buildAccountSummaries(snapshot.accounts, snapshot.transactions);
    const totalBalance = accountSummaries.reduce((total, account) => total + account.currentBalance, 0);
    const monthlyCashFlow = buildMonthlyCashFlow(snapshot.transactions);
    const categorySpend = buildCategorySpend(snapshot.categories, snapshot.transactions);
    const currentMonth = monthlyCashFlow[monthlyCashFlow.length - 1] ?? {
        income: 0,
        expenses: 0,
        transfers: 0,
        net: 0,
        monthLabel: '',
    };
    const averageMonthlyIncome = monthlyCashFlow.reduce((total, point) => total + point.income, 0) /
        Math.max(monthlyCashFlow.length, 1);
    const averageMonthlyExpenses = monthlyCashFlow.reduce((total, point) => total + point.expenses, 0) /
        Math.max(monthlyCashFlow.length, 1);
    const averageMonthlyNet = monthlyCashFlow.reduce((total, point) => total + point.net, 0) /
        Math.max(monthlyCashFlow.length, 1);
    return {
        accountSummaries,
        totalBalance,
        monthlyIncome: currentMonth.income,
        monthlyExpenses: currentMonth.expenses,
        savingsRate: currentMonth.income > 0
            ? ((currentMonth.income - currentMonth.expenses) / currentMonth.income) *
                100
            : 0,
        averageMonthlyIncome,
        averageMonthlyExpenses,
        averageMonthlyNet,
        monthlyCashFlow,
        categorySpend,
        topMerchants: buildTopMerchants(snapshot.transactions),
        recentTransactions: [...snapshot.transactions].sort((left, right) => toDate(right.postedAt).getTime() - toDate(left.postedAt).getTime()),
        budgetHealth: buildBudgetHealthSummary(categorySpend),
    };
}
//# sourceMappingURL=bankingAnalytics.js.map