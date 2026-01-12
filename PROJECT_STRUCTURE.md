# Ayushman Web Project - Clean Structure

## 📁 Project Structure

```
📦 Ayushman_web/
├── 🏠 index.html              # Main homepage
├── 🔐 login.html              # Login page
├── 📱 manifest.json           # PWA manifest
├── 🚀 deploy.js               # Build script
├── 📦 package.json            # Dependencies
│
├── 📄 pages/                  # Application pages
│   ├── add-material.html      # Add material entry
│   ├── all-materials.html     # View all materials
│   ├── product-price.html     # Product calculator
│   ├── all-product-prices.html # View all products
│   ├── drug-entry.html        # Add drug entry
│   └── all-drugs.html         # View all drugs
│
├── 🎨 css/                    # Stylesheets
│   └── styles.css
│
├── 📜 js/                     # JavaScript files
│   ├── firebase-config.js     # Firebase configuration
│   ├── add-material.js        # Material management
│   ├── all-materials.js       # Materials listing
│   ├── product-price.js       # Price calculation
│   ├── all-product-prices.js  # Products listing
│   ├── all-drugs.js           # Drugs listing
│   ├── app.js                 # Main app logic
│   └── service-worker.js      # PWA service worker
│
├── 🖼️ assets/                 # Static assets
│   ├── vasavi-logo.png        # Main logo
│   ├── owner.jpg              # Owner image
│   ├── burger-menu.js         # Menu component
│   └── *.png                  # Other images
│
└── 🔧 Firebase & Config Files
    ├── dataconnect/           # Firebase Data Connect
    ├── functions/             # Firebase Functions
    └── web_data/              # Additional data configs
```

## 🔧 Build Process

### Development
- Edit files directly in their respective directories
- All HTML pages are in `/pages/` except `index.html` and `login.html`
- CSS files are in `/css/`
- JavaScript files are in `/js/`
- Assets are in `/assets/`

### Production Build
```bash
npm run build
```

This will:
- Copy all files to `/build/` directory
- Maintain the correct directory structure
- Include all assets and dependencies
- Generate deployment-ready files

### What Was Cleaned Up

#### ❌ Removed Duplicates
- Duplicate HTML files in `/public/` directory
- Duplicate JavaScript files in `/src/` directory
- Conflicting Firebase configs
- Redundant asset files

#### ✅ Organized Structure
- **Pages**: All HTML pages (except main entry points) in `/pages/`
- **Scripts**: All JavaScript in `/js/`
- **Styles**: All CSS in `/css/`
- **Assets**: All images and static files in `/assets/`
- **Root**: Only essential entry files (`index.html`, `login.html`, config files)

#### 🔧 Updated References
- Fixed all asset paths to use relative references
- Updated JavaScript import paths
- Corrected navigation links between pages
- Ensured consistent file structure

## 🚀 Deployment

The build process creates a `/build/` directory with the complete application ready for deployment to any web server.

## 📝 File Paths Reference

| From Pages Directory | Asset Path | Script Path | Home Link |
|---------------------|------------|-------------|-----------|
| `pages/*.html` | `../assets/` | `../js/` | `../index.html` |

All paths are now consistently relative and work correctly in both development and production environments.