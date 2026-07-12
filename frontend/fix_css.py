import os

directory = r"D:\Personal Projects\Antigravity-projects\family-finance-doc-vault\frontend\src"

files_to_update = [
    os.path.join(directory, "components", "DashboardLayout.tsx"),
    os.path.join(directory, "pages", "Projects.tsx"),
    os.path.join(directory, "pages", "BankAccounts.tsx"),
    os.path.join(directory, "pages", "Deposits.tsx"),
    os.path.join(directory, "pages", "Investments.tsx"),
    os.path.join(directory, "pages", "Loans.tsx"),
    os.path.join(directory, "pages", "ChitFunds.tsx"),
    os.path.join(directory, "pages", "PeerLending.tsx"),
    os.path.join(directory, "pages", "SideIncome.tsx"),
    os.path.join(directory, "pages", "PortfolioOverview.tsx"),
]

replacements = {
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
    'text-blue-700 text-blue-700': 'text-primary', # fix double
    'bg-black/50': 'bg-background/80 backdrop-blur-sm'
}

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Styles updated successfully!")
