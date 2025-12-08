# NexusPOS - Inventory Management & Point of Sale System

A modern, full-featured Inventory Management and Point of Sale (POS) system built with **PocketBase** (backend) and **React + TypeScript** (frontend).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PocketBase](https://img.shields.io/badge/PocketBase-0.34.2-green.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)

---

## 🚀 Features

### Core Functionality
- ✅ **Multi-User Authentication** - Role-based access control (Admin, Manager, Cashier)
- ✅ **Product Management** - Complete inventory with categories, SKUs, pricing, and images
- ✅ **Point of Sale** - Fast, intuitive sales interface with cart management
- ✅ **Sales Tracking** - Complete sales history with receipts
- ✅ **Dashboard** - Real-time analytics, low stock alerts, recent sales
- ✅ **Multi-Location Support** - Manage inventory across multiple locations
- ✅ **Supplier Management** - Track suppliers and purchase orders
- ✅ **Purchase Orders** - Create, manage, and receive purchase orders
- ✅ **Stock Adjustments** - Manual inventory adjustments with audit trail
- ✅ **Reporting** - Sales, inventory, and purchase reports with export (Excel, CSV, PDF)
- ✅ **Settings** - Configurable company info, tax rates, and system settings

### Technical Features
- 🎨 **Modern UI** - Beautiful, responsive design with dark/light theme support
- 🔒 **Secure** - Role-based permissions, secure authentication
- 📱 **Responsive** - Works on desktop, tablet, and mobile
- ⚡ **Fast** - Optimized performance with React Query caching
- 🗄️ **Database** - PocketBase with automated migrations
- 📊 **Charts** - Visual analytics with Recharts

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PocketBase** (included in project)

---

## 🛠️ Installation & Setup

### 1. Clone or Download the Project

```bash
git clone <your-repo-url>
cd pocketbase_0.34.2
```

### 2. Backend Setup (PocketBase)

The backend uses PocketBase, which is included in the project.

#### Windows:
```powershell
# Start PocketBase server
.\pocketbase.exe serve
```

#### Linux/Mac:
```bash
# Make executable (first time only)
chmod +x pocketbase

# Start PocketBase server
./pocketbase serve
```

**What happens on first run:**
- Database is created automatically
- Migrations are applied (creates all collections with proper schemas)
- Default categories are created
- Server starts on `http://127.0.0.1:8090`

#### Create Your First Admin User

Visit the admin dashboard:
```
http://127.0.0.1:8090/_/
```

Or use the command line:
```bash
.\pocketbase.exe superuser upsert admin@example.com YourSecurePassword123
```

### 3. Frontend Setup (React)

Open a **new terminal** (keep PocketBase running in the first one):

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### 4. Access the Application

1. Open your browser and navigate to: `http://localhost:5173`
2. Login with your admin credentials
3. Start using the application!

---

## 🚀 Deployment

### Production Build

#### Frontend:
```bash
cd frontend
npm run build
```

The production build will be in `frontend/dist/`

#### Serve Frontend with PocketBase:

1. Copy the built frontend to PocketBase's public directory:
```bash
# Windows
xcopy /E /I frontend\dist pb_public

# Linux/Mac
cp -r frontend/dist/* pb_public/
```

2. Start PocketBase:
```bash
.\pocketbase.exe serve --http="0.0.0.0:8090"
```

Now your entire application (frontend + backend) runs on `http://your-server:8090`

### Environment Variables

Create `frontend/.env.production`:
```env
VITE_POCKETBASE_URL=http://your-production-server:8090
```

### Deployment Platforms

#### Deploy to VPS (Ubuntu/Debian):

1. **Install Node.js**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Upload your project**:
```bash
scp -r pocketbase_0.34.2 user@your-server:/var/www/
```

3. **Setup systemd service** (`/etc/systemd/system/nexuspos.service`):
```ini
[Unit]
Description=NexusPOS Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/pocketbase_0.34.2
ExecStart=/var/www/pocketbase_0.34.2/pocketbase serve --http="0.0.0.0:8090"
Restart=always

[Install]
WantedBy=multi-user.target
```

4. **Start service**:
```bash
sudo systemctl enable nexuspos
sudo systemctl start nexuspos
```

5. **Setup Nginx reverse proxy** (optional but recommended):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## ⚙️ Configuration

### Application Settings

Navigate to **Settings** in the application to configure:

- **Company Information** - Name, address, phone, email
- **Tax Rate** - Default tax rate for sales
- **Currency** - Currency code (USD, EUR, etc.)

### Database Backup

#### Manual Backup:
```bash
# Backup the entire database
cp -r pb_data pb_data_backup_$(date +%Y%m%d)
```

#### Automated Backup (Google Drive):

1. Create a Google Cloud Service Account
2. Download `credentials.json`
3. Place it in the project root
4. Run the backup script:
```bash
node scripts/backup_to_cloud.js
```

### User Roles & Permissions

| Feature | Admin | Manager | Cashier |
|---------|-------|---------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| POS (Sales) | ✅ | ✅ | ✅ |
| View Products | ✅ | ✅ | ✅ |
| Add/Edit Products | ✅ | ✅ | ❌ |
| Delete Products | ✅ | ❌ | ❌ |
| Suppliers | ✅ | ✅ | ❌ |
| Purchase Orders | ✅ | ✅ | ❌ |
| Stock Adjustments | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

---

## 📁 Project Structure

```
pocketbase_0.34.2/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # PocketBase client
│   │   ├── stores/          # Zustand stores
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── pb_migrations/           # Database migrations
│   └── 1700000001_main_schema.js  # Main schema migration
├── pb_data/                 # PocketBase database (auto-created)
├── pocketbase.exe           # PocketBase executable (Windows)
├── pocketbase               # PocketBase executable (Linux/Mac)
├── README.md                # This file
└── USER_MANUAL.md           # User guide
```

---

## 🔧 Development

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

PocketBase migrations are in `pb_migrations/`. To create a new migration:

```bash
# Create a new migration file
touch pb_migrations/$(date +%s)_your_migration_name.js
```

Migration template:
```javascript
migrate((app) => {
    // Your migration code here
}, (app) => {
    // Rollback code here
});
```

### Database Schema

The database schema is defined in `pb_migrations/1700000001_main_schema.js`. It creates:

- **users** - User accounts with roles
- **locations** - Store locations
- **suppliers** - Supplier information
- **categories** - Product categories
- **products** - Product catalog
- **sales** - Sales transactions
- **sales_items** - Sale line items
- **receipts** - Receipt data
- **inventory_entries** - Inventory movements
- **purchase_orders** - Purchase orders
- **purchase_order_items** - PO line items
- **stock_adjustments** - Stock adjustments
- **settings** - Application settings

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: PocketBase won't start
- **Solution**: Check if port 8090 is already in use. Change port with `--http` flag:
  ```bash
  .\pocketbase.exe serve --http="127.0.0.1:8091"
  ```

**Problem**: Migration errors
- **Solution**: Delete `pb_data` folder and restart PocketBase (⚠️ This deletes all data!)

### Frontend Issues

**Problem**: "Failed to fetch" errors
- **Solution**: Ensure PocketBase is running on `http://127.0.0.1:8090`
- Check `frontend/src/lib/pocketbase.ts` for correct URL

**Problem**: Build errors
- **Solution**: Delete `node_modules` and reinstall:
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

---

## 📚 Additional Resources

- [PocketBase Documentation](https://pocketbase.io/docs/)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For issues and questions:
1. Check the [USER_MANUAL.md](USER_MANUAL.md)
2. Review the troubleshooting section above
3. Check PocketBase logs in `pb_data/logs/`

---

## 🎯 Quick Start Checklist

- [ ] Install Node.js (v18+)
- [ ] Start PocketBase: `.\pocketbase.exe serve`
- [ ] Create admin user at `http://127.0.0.1:8090/_/`
- [ ] Install frontend: `cd frontend && npm install`
- [ ] Start frontend: `npm run dev`
- [ ] Access app: `http://localhost:5173`
- [ ] Login and start using!

**Happy selling! 🛒**
