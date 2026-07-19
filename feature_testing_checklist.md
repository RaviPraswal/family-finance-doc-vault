# FinNest — Complete Feature Testing Checklist

Use this checklist to test every feature end-to-end with real data.

---

## 1. 🔐 Authentication & Family Setup

- [ ] **Register a new family** — provide Family Name, Address, Phone
- [ ] **Add family members** during registration (name, email, password, phone)
- [ ] **Designate one member as Admin** (👑 Owner role)
- [ ] **Login** with the admin account
- [ ] **Login** with a non-admin member account
- [ ] **Logout** works correctly
- [ ] **Theme toggle** — switch between Dark Mode and Light Mode

---

## 2. 📄 Document Vault (Digital)

> Sidebar: **Document Vault**

- [ ] **Upload a document** — click Upload, fill in name, category, tags, expiry date
- [ ] **AI auto-extraction** — verify extracted metadata appears after upload (e.g., policy number, dates)
- [ ] **Search documents** by name/keyword
- [ ] **Preview a document** (eye icon)
- [ ] **Download a document**
- [ ] **Share a document** with another family member
- [ ] **Delete a document**
- [ ] **Expiry notifications** — upload a doc with a near-future expiry date and check the 🔔 notification bell

---

## 3. 🏛️ Physical Almirah (Physical Document Tracker)

> Sidebar: **Physical Almirah**

- [ ] **Assign physical location** to a document (Almirah ID, Shelf, Holder, Folder, Sub-folder, Slot)
- [ ] **Mark original as present/absent**
- [ ] **Borrow a document** — log who borrowed it
- [ ] **Return a document** — mark it as returned
- [ ] **Search physical documents** by location or name
- [ ] **View borrow/return log history** for a document

---

## 4. 📒 Ledger & AI Scheduler

> Sidebar: **Ledger & AI Scheduler**

- [ ] **View pending scheduled payments** (EMIs, premiums, subscriptions)
- [ ] **Mark a payment as paid**
- [ ] **AI Schedule Parser** — upload a document (e.g., loan schedule PDF) and verify AI extracts payment dates
- [ ] **Confirm and save** the AI-parsed schedule

---

## 5. 📊 Portfolio Overview

> Sidebar: **Portfolio Overview**

- [ ] **View aggregated net worth** — total across all asset types
- [ ] **Verify breakdown** by category (bank accounts, deposits, investments, loans, chit funds, etc.)
- [ ] **Check values update** as you add/modify data in other sections

---

## 6. 🏦 Bank Accounts

> Sidebar: **Bank Accounts**

- [ ] **Add a bank account** — Bank name, account number, type (Savings/Current), balance
- [ ] **View all accounts** listed
- [ ] **Edit an account**
- [ ] **Delete an account**

---

## 7. 💰 Deposits (FD / RD)

> Sidebar: **Deposits (FD/RD)**

- [ ] **Add a Fixed Deposit** — bank, amount, interest rate, start date, maturity date
- [ ] **Add a Recurring Deposit**
- [ ] **View all deposits** with maturity info
- [ ] **Edit a deposit**
- [ ] **Delete a deposit**
- [ ] **Verify maturity notifications** are generated as scheduled payments

---

## 8. 📈 Investments

> Sidebar: **Investments**

- [ ] **Add an investment** — type (Mutual Fund, Stocks, PPF, Gold, etc.), name, amount, date
- [ ] **View all investments**
- [ ] **Edit an investment**
- [ ] **Delete an investment**

---

## 9. 💳 Loans & EMI

> Sidebar: **Loans & EMI**

- [ ] **Add a loan** — type (Home/Car/Personal), bank, principal, interest rate, EMI, tenure, start date
- [ ] **View all loans** with remaining balance
- [ ] **Edit a loan**
- [ ] **Delete a loan**
- [ ] **Verify EMI scheduled payments** appear in the Ledger

---

## 10. 🤝 Chit Funds

> Sidebar: **Chit Funds**

- [ ] **Add a chit fund** — organizer, total value, monthly installment, members, start date, duration
- [ ] **View all chit funds**
- [ ] **Edit a chit fund**
- [ ] **Delete a chit fund**
- [ ] **Verify monthly installment payments** appear in the Ledger

---

## 11. 🤲 Udhaar (Peer Lending)

> Sidebar: **Udhaar (Peer Lending)**

- [ ] **Add money lent** — to whom, amount, date, expected return date
- [ ] **Add money borrowed** — from whom, amount, date
- [ ] **View all peer lending entries**
- [ ] **Edit an entry**
- [ ] **Delete an entry**

---

## 12. 💵 Side Income

> Sidebar: **Side Income**

- [ ] **Add an income source** — name, type (Freelance/Rental/Dividend/etc.), amount, frequency
- [ ] **View all income sources**
- [ ] **Edit an income source**
- [ ] **Delete an income source**

---

## 13. 🏗️ Projects & Expenses

> Sidebar: **Projects & Expenses**

- [ ] **Create a project** — name, budget, description
- [ ] **Add expenses to a project** — item, amount, date
- [ ] **View project-wise expense breakdown**
- [ ] **Edit/delete project expenses**
- [ ] **Delete a project**

---

## 14. 🛒 Daily Expenses

> Sidebar: **Daily Expenses**

- [ ] **Add a daily expense** — category, amount, date, description
- [ ] **View expense list** with filtering
- [ ] **Edit an expense**
- [ ] **Delete an expense**

---

## 15. 🎯 Goals

> Sidebar: **Goals**

- [ ] **Create a financial goal** — name, target amount, target date, category, priority
- [ ] **Make a contribution** toward a goal
- [ ] **View progress bar** for each goal
- [ ] **Get AI recommendations** — click the AI insights button
- [ ] **Edit a goal**
- [ ] **Delete a goal**

---

## 16. 👨‍👩‍👧‍👦 Family Members

> Sidebar: **Family Members**

- [ ] **View all family members** in the household
- [ ] **Add a new family member** (Admin only)
- [ ] **Edit member details**
- [ ] **Remove a family member** (Admin only)
- [ ] **Verify role-based access** — members see limited options vs. Admin

---

## 17. 🔔 Notifications

- [ ] **Check notification bell** on the dashboard for unread alerts
- [ ] **Verify document expiry alerts** appear
- [ ] **Verify scheduled payment reminders** appear
- [ ] **Mark notifications as read**

---

## 18. 🌗 General UI / UX

- [ ] **Responsive layout** — test on different screen widths
- [ ] **Sidebar navigation** — all 15 menu items are accessible
- [ ] **Mobile header** — shows on small screens with logout and theme toggle
- [ ] **Dark / Light mode** persists across page navigation
- [ ] **Landing page** — accessible at `/` before login

---

> [!TIP]
> **Suggested testing order**: Start with **#1 (Register)** → **#6 (Bank Accounts)** → **#9 (Loans)** → **#7 (Deposits)** → **#10 (Chit Funds)** → **#8 (Investments)** → then check **#5 (Portfolio Overview)** to see everything aggregated. After that, test the remaining modules in any order.
