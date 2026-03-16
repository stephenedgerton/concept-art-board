# ConceptVault

A high-performance asset management board for Concept Art, Animations, and VFX. Built with React + TypeScript, Vite, and Express, specifically designed to bridge local workflows with shared cloud storage (Egnyte).

## 🚀 Quick Start (Team Members)

Follow these steps to get the ConceptVault running on your machine:

### 1. Prerequisites
*   **Node.js**: Install [Node.js v18+](https://nodejs.org/).
*   **Egnyte Desktop App**: Ensure you have the Egnyte Desktop App installed and you are logged in.
*   **Access**: You must have read/write access to the `Concept_Vault_Assets` folder on Egnyte.

### 2. Installation
1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/[YOUR-ORG]/concept-art-board.git
    cd concept-art-board
    ```
2.  **Install Dependencies**:
    Open a terminal in the folder and run:
    ```bash
    npm install
    ```

### 3. Configuration
The application needs to know where your Egnyte drive is located.
1.  Open `Start_ConceptVault.bat` in a text editor (like Notepad).
2.  Find the lines starting with `set CONCEPT_DATA_DIR` and `set CONCEPT_UPLOADS_DIR`.
3.  Update the drive letter (e.g., `Z:`) to match your Egnyte drive mapping:
    ```batch
    set CONCEPT_DATA_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\data
    set CONCEPT_UPLOADS_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\uploads
    ```
4.  Save the file.

### 4. Running the App
Simply double-click **`Start_ConceptVault.bat`**.

This script will:
*   Automatically run `npm install` to ensure you are up to date.
*   Start the local bridge server (connects the app to your Egnyte files).
*   Launch the ConceptVault in your default web browser at `http://localhost:5173`.

---

## 🛠 Features
*   **Shared Storage**: All data and assets are stored directly on Egnyte, meaning changes you make are instantly available to the whole team.
*   **Smart Uploads**: Automatically generates low-res video previews (using FFmpeg) to save bandwidth.
*   **Bulk Editing**: Tag multiple assets at once to keep the library organized.
*   **Global Search**: Instant filtering by name or categories (Faction, Combat Type, Rarity, etc.).

## 🏗 Architecture
*   **Frontend**: React + Vite (Fast and responsive UI).
*   **Local Bridge**: A lightweight Express server (`server.js`) that acts as a secure tunnel between your web browser and the Egnyte folder on your hard drive.
*   **Data Structure**:
    *   `/data`: Contains `artworks.json` (the database) and `categories.json` (the tag list).
    *   `/uploads`: Contains the actual image and video files.

## ⚠️ Troubleshooting
*   **"Unable to connect to Egnyte"**: Ensure your Egnyte Desktop App is running and the drive letter in the `.bat` file is correct.
*   **Port Conflicts**: If the app fails to start, ensure port `5173` and `3001` are not being used by other applications.
