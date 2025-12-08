# NexusPOS User Manual

**Version 1.0** | Complete Guide for All Users

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Point of Sale (POS)](#3-point-of-sale-pos)
4. [Inventory Management](#4-inventory-management)
5. [Suppliers](#5-suppliers)
6. [Purchase Orders](#6-purchase-orders)
7. [Stock Adjustments](#7-stock-adjustments)
8. [Sales History](#8-sales-history)
9. [Reports](#9-reports)
10. [User Management](#10-user-management-admin-only)
11. [Settings](#11-settings-admin-only)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Getting Started

### 1.1 Accessing the Application

1. Open your web browser
2. Navigate to the application URL (e.g., `http://localhost:5173` for development)
3. You'll see the login screen

### 1.2 Logging In

1. Enter your **email address**
2. Enter your **password**
3. Click **"Sign In"**

**First Time Setup:**
- The system administrator will create your account
- You'll receive your login credentials
- Change your password after first login (recommended)

### 1.3 User Roles

The system has three user roles with different permissions:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Admin** | Full system access | All features |
| **Manager** | Inventory and sales management | Most features except user management |
| **Cashier** | Sales operations only | POS, view products, view reports |

### 1.4 Navigation

- **Sidebar Menu** - Main navigation on the left side
- **Top Bar** - Shows current user and theme toggle
- **Breadcrumbs** - Shows your current location in the app

---

## 2. Dashboard

The Dashboard is your home screen showing key business metrics.

### 2.1 Dashboard Widgets

**Top Statistics Cards:**
- **Total Revenue** - Total sales amount
- **Total Sales** - Number of completed sales
- **Low Stock Items** - Products below reorder point
- **Active Users** - Number of system users

**Sales Chart:**
- Shows sales trend for the last 7 days
- Hover over bars to see exact amounts

**Recent Sales:**
- Displays the last 5 sales transactions
- Shows sale number, date/time, total, and payment method

**Date & Time:**
- Live clock in the top-right corner
- Current date display

### 2.2 Quick Actions

From the dashboard, you can quickly navigate to:
- **POS** - Start a new sale
- **Inventory** - Manage products
- **Reports** - View detailed analytics

---

## 3. Point of Sale (POS)

The POS is where you process customer sales.

### 3.1 Starting a Sale

1. Click **"POS"** in the sidebar
2. You'll see the product grid and empty cart

### 3.2 Adding Products to Cart

**Method 1: Click Product Card**
- Click on any product in the grid
- Product is added to cart with quantity 1

**Method 2: Search**
- Use the search bar at the top
- Type product name or SKU
- Click the product to add it

**Product Grid Features:**
- Product image
- Product name
- Price
- Current stock level
- Out-of-stock items are grayed out

### 3.3 Managing the Cart

**Adjust Quantity:**
- Click **"+"** to increase quantity
- Click **"-"** to decrease quantity
- Or type quantity directly in the input field

**Remove Item:**
- Click **"Remove"** next to the item

**Clear Cart:**
- Click **"Clear Cart"** to remove all items

**Cart Summary:**
- **Subtotal** - Sum of all items
- **Tax** - Calculated based on tax rate in settings
- **Total** - Final amount to pay

### 3.4 Processing Payment

1. Review cart items and total
2. Click **"Proceed to Payment"**
3. Select payment method:
   - **Cash** - Customer pays with cash
   - **Card** - Credit/debit card payment
   - **Mobile** - Mobile payment (e.g., mobile money)
4. Click **"Complete Sale"**
5. Sale is recorded and receipt is generated

### 3.5 After Sale

- Cart is automatically cleared
- You can view the receipt
- Sale appears in Sales History
- Stock is automatically updated

---

## 4. Inventory Management

Manage your product catalog and stock levels.

### 4.1 Viewing Products

1. Click **"Inventory"** in the sidebar
2. View all products in a grid or list view
3. Use the search bar to find specific products

**Product Information Displayed:**
- Product image
- Name and SKU
- Category
- Cost price and sale price
- Current stock
- Reorder point

### 4.2 Adding a New Product

1. Click **"Add Product"** button
2. Fill in the product details:
   - **Product Name*** (required)
   - **SKU*** (required, must be unique)
   - **Barcode** (optional)
   - **Category*** (required, select from dropdown)
   - **Cost Price*** (what you pay)
   - **Sale Price*** (what customers pay)
   - **Stock** (current quantity)
   - **Reorder Point** (low stock alert threshold)
   - **Image** (optional, click to upload)
3. Click **"Create Product"**

**Tips:**
- SKU must be unique across all products
- Sale price should be higher than cost price
- Set reorder point to get low stock alerts
- Supported image formats: JPG, PNG, WebP

### 4.3 Editing a Product

1. Find the product in the list
2. Click the **Edit** icon (pencil)
3. Modify the fields you want to change
4. Click **"Update Product"**

### 4.4 Deleting a Product

1. Find the product in the list
2. Click the **Delete** icon (trash)
3. Confirm deletion
4. Product is permanently removed

⚠️ **Warning**: Deleting a product cannot be undone!

### 4.5 Categories

Products are organized into categories. Default categories include:
- General
- Electronics
- Clothing
- Food & Beverages
- Home & Garden
- Health & Beauty
- Sports & Outdoors
- Books & Media

**Adding Categories:**
- Currently done via PocketBase admin panel
- Navigate to `http://127.0.0.1:8090/_/`
- Go to Collections → categories
- Add new category

---

## 5. Suppliers

Manage your supplier information (Admin/Manager only).

### 5.1 Viewing Suppliers

1. Click **"Suppliers"** in the sidebar
2. View all suppliers in a grid
3. Search by name, email, or phone

### 5.2 Adding a Supplier

1. Click **"Add Supplier"**
2. Fill in supplier details:
   - **Name*** (required)
   - **Email**
   - **Phone**
   - **Contact Person**
   - **Address**
   - **Payment Terms** (e.g., "Net 30 days")
   - **Notes**
   - **Active** (checkbox)
3. Click **"Create Supplier"**

### 5.3 Editing/Deleting Suppliers

- Click **Edit** icon to modify supplier details
- Click **Delete** icon to remove supplier
- Inactive suppliers can be filtered out

---

## 6. Purchase Orders

Create and manage purchase orders from suppliers (Admin/Manager only).

### 6.1 Creating a Purchase Order

1. Click **"Purchase Orders"** in the sidebar
2. Click **"Create Purchase Order"**
3. Fill in PO details:
   - **PO Number*** (auto-generated or manual)
   - **Supplier*** (select from dropdown)
   - **Order Date*** (date you're creating the PO)
   - **Expected Date** (when you expect delivery)
   - **Status*** (Draft, Sent, Partial, Received, Cancelled)
   - **Notes**
4. Add line items:
   - Click **"Add Item"**
   - Select **Product**
   - Enter **Quantity**
   - Enter **Unit Cost**
   - Total is calculated automatically
5. Click **"Create Purchase Order"**

### 6.2 Receiving a Purchase Order

1. Find the PO in the list
2. Click **"View"** to open PO details
3. Click **"Receive Items"**
4. For each item, enter **Quantity Received**
5. Click **"Confirm Receipt"**
6. Stock is automatically updated
7. PO status changes to "Received" or "Partial"

### 6.3 PO Status Workflow

- **Draft** - PO is being created
- **Sent** - PO sent to supplier
- **Partial** - Some items received
- **Received** - All items received
- **Cancelled** - PO cancelled

---

## 7. Stock Adjustments

Manually adjust stock levels (Admin/Manager only).

### 7.1 Creating a Stock Adjustment

1. Navigate to **Stock Adjustments** (if available in menu)
2. Click **"New Adjustment"**
3. Fill in details:
   - **Product*** (select product)
   - **Adjustment Type***:
     - **Add** - Increase stock
     - **Remove** - Decrease stock
     - **Set** - Set to specific quantity
   - **Quantity*** (amount to adjust)
   - **Reason*** (e.g., "Damaged goods", "Found in warehouse")
   - **Notes**
4. Click **"Create Adjustment"**

**Use Cases:**
- Damaged or expired products (Remove)
- Found inventory during stocktake (Add)
- Correcting inventory errors (Set)

---

## 8. Sales History

View all past sales transactions.

### 8.1 Viewing Sales

1. Click **"Sales"** in the sidebar
2. View list of all sales
3. Each sale shows:
   - Sale number
   - Date and time
   - Total amount
   - Payment method
   - Status

### 8.2 Viewing Sale Details

1. Click on a sale to view details
2. See:
   - Customer information (if captured)
   - Items sold with quantities and prices
   - Payment information
   - Receipt data

### 8.3 Filtering Sales

- Use date range picker to filter by date
- Search by sale number
- Filter by payment method
- Filter by status

---

## 9. Reports

Generate and export business reports.

### 9.1 Available Reports

**Sales Report:**
- Total sales by date range
- Sales by payment method
- Top selling products
- Sales trends

**Inventory Report:**
- Current stock levels
- Low stock items
- Stock value
- Products by category

**Purchase Report:**
- Purchase orders by date range
- Purchases by supplier
- Purchase order status summary

### 9.2 Generating a Report

1. Click **"Reports"** in the sidebar
2. Select report type (Sales, Inventory, Purchase)
3. Set date range (if applicable)
4. Click **"Generate Report"**
5. View report data in table format

### 9.3 Exporting Reports

Reports can be exported in three formats:

**Excel (.xlsx):**
- Click **"Export to Excel"**
- Opens in Excel or compatible software
- Fully formatted with headers

**CSV (.csv):**
- Click **"Export to CSV"**
- Plain text format
- Can be imported into any spreadsheet software

**PDF (.pdf):**
- Click **"Export to PDF"**
- Professional formatted document
- Ready for printing or sharing

---

## 10. User Management (Admin Only)

Manage system users and their access.

### 10.1 Viewing Users

1. Click **"Users"** in the sidebar
2. View all system users
3. See user name, email, and role

### 10.2 Adding a New User

1. Click **"Add User"**
2. Fill in user details:
   - **Name*** (required)
   - **Email*** (required, must be unique)
   - **Password*** (required, minimum 8 characters)
   - **Confirm Password*** (must match)
   - **Role*** (Admin, Manager, or Cashier)
3. Click **"Create User"**

**Password Requirements:**
- Minimum 8 characters
- Should include letters and numbers
- User should change password after first login

### 10.3 Editing Users

1. Click **Edit** icon next to user
2. Modify user details
3. Click **"Update User"**

**Note**: You cannot edit your own role

### 10.4 Deleting Users

1. Click **Delete** icon
2. Confirm deletion
3. User is permanently removed

⚠️ **Warning**: Cannot delete your own account

---

## 11. Settings (Admin Only)

Configure system-wide settings.

### 11.1 Company Information

1. Click **"Settings"** in the sidebar
2. Update company details:
   - **Company Name**
   - **Address**
   - **Phone Number**
   - **Email Address**
   - **Tax Rate** (percentage, e.g., 16 for 16%)
   - **Currency Code** (e.g., USD, EUR, NGN)
3. Click **"Save Changes"**

**Tax Rate:**
- Applied to all sales automatically
- Enter as percentage (e.g., 16 for 16%)
- Set to 0 for no tax

**Currency:**
- Affects how prices are displayed
- Use standard currency codes (USD, EUR, GBP, etc.)

### 11.2 Receipt Settings

Configure receipt appearance and content:
- Receipt header text
- Receipt footer text
- Show/hide logo
- Show/hide tax breakdown

---

## 12. Troubleshooting

### 12.1 Login Issues

**Problem**: "Invalid credentials" error
- **Solution**: Check email and password are correct
- Try resetting password (contact admin)
- Ensure caps lock is off

**Problem**: Cannot access login page
- **Solution**: Check if backend server is running
- Verify URL is correct
- Clear browser cache and cookies

### 12.2 Data Not Loading

**Problem**: Products/Sales not showing
- **Solution**: 
  - Refresh the page (F5)
  - Check internet connection
  - Ensure you're logged in
  - Contact admin if problem persists

### 12.3 Permission Errors

**Problem**: "You don't have permission" message
- **Solution**: 
  - Check your user role
  - Contact admin to request access
  - Some features are role-restricted

### 12.4 Sale Processing Issues

**Problem**: Cannot complete sale
- **Solution**:
  - Ensure all products are in stock
  - Check cart is not empty
  - Verify payment method is selected
  - Try refreshing the page

### 12.5 Image Upload Issues

**Problem**: Product image won't upload
- **Solution**:
  - Check file size (max 5MB)
  - Use supported formats (JPG, PNG, WebP)
  - Try a different image
  - Check internet connection

### 12.6 Report Export Issues

**Problem**: Export button not working
- **Solution**:
  - Disable popup blocker for this site
  - Try a different browser
  - Check if report has data
  - Clear browser cache

---

## Quick Reference

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search | `Ctrl + K` or `/` |
| New Sale (POS) | `Ctrl + N` |
| Focus Search | `Ctrl + F` |

### Common Tasks

**Make a Sale:**
1. Go to POS
2. Add products to cart
3. Proceed to payment
4. Select payment method
5. Complete sale

**Add Product:**
1. Go to Inventory
2. Click Add Product
3. Fill in details
4. Upload image (optional)
5. Save

**Generate Report:**
1. Go to Reports
2. Select report type
3. Set date range
4. Generate
5. Export if needed

---

## Support & Help

**For Technical Issues:**
- Check this manual first
- Review troubleshooting section
- Contact your system administrator

**For Training:**
- Review relevant sections of this manual
- Practice in a test environment
- Ask your manager or admin for guidance

**For Feature Requests:**
- Contact your system administrator
- Provide detailed description of needed feature
- Explain business use case

---

## Glossary

- **SKU** - Stock Keeping Unit, unique product identifier
- **POS** - Point of Sale, where sales are processed
- **PO** - Purchase Order
- **Reorder Point** - Stock level that triggers low stock alert
- **Cost Price** - What you pay for the product
- **Sale Price** - What customers pay
- **Subtotal** - Total before tax
- **Tax** - Sales tax/VAT
- **Total** - Final amount including tax

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Application Version**: NexusPOS 1.0

For the latest version of this manual, contact your system administrator.
