const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, "src");

const filesToUpdate = [
    path.join(directory, "components", "DashboardLayout.tsx"),
    path.join(directory, "pages", "Projects.tsx"),
    path.join(directory, "pages", "BankAccounts.tsx"),
    path.join(directory, "pages", "Deposits.tsx"),
    path.join(directory, "pages", "Investments.tsx"),
    path.join(directory, "pages", "Loans.tsx"),
    path.join(directory, "pages", "ChitFunds.tsx"),
    path.join(directory, "pages", "PeerLending.tsx"),
    path.join(directory, "pages", "SideIncome.tsx"),
    path.join(directory, "pages", "PortfolioOverview.tsx"),
];

const replacements = {
    'bg-gray-50': 'bg-background',
    'bg-white': 'bg-card',
    'border-gray-200': 'border-border',
    'border-gray-100': 'border-border',
    'text-gray-900': 'text-foreground',
    'text-gray-700': 'text-muted-foreground hover:text-foreground',
    'text-gray-600': 'text-muted-foreground',
    'text-gray-500': 'text-muted-foreground',
    'text-gray-400': 'text-muted-foreground',
    'bg-gray-100': 'bg-muted',
    'bg-gray-200': 'bg-muted',
    'bg-blue-600': 'bg-primary',
    'bg-blue-700': 'bg-primary/90',
    'text-blue-700': 'text-primary',
    'bg-blue-50': 'bg-primary/10',
    'text-indigo-600': 'text-primary',
    'bg-indigo-50': 'bg-primary/10',
    'border-indigo-200': 'border-primary/20',
    'hover:bg-indigo-50': 'hover:bg-primary/10',
    'text-gray-600 hover:bg-gray-100': 'text-muted-foreground hover:bg-muted',
    'w-full border rounded p-2': 'w-full p-3 rounded-md bg-muted text-foreground border border-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all',
    'bg-black/50': 'bg-background/80 backdrop-blur-sm'
};

filesToUpdate.forEach(filepath => {
    if (fs.existsSync(filepath)) {
        let content = fs.readFileSync(filepath, 'utf8');
        for (const [oldStr, newStr] of Object.entries(replacements)) {
            content = content.split(oldStr).join(newStr);
        }
        fs.writeFileSync(filepath, content, 'utf8');
        console.log("Updated", filepath);
    }
});

console.log("Styles updated successfully!");
