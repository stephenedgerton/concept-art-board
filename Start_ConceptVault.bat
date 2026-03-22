@echo off
title ConceptVault Server
echo =======================================================
echo          Starting ConceptVault Server & App
echo =======================================================
echo.
echo Checking and installing dependencies (this may take a moment on first run)...
call npm install

:: --- STORAGE CONFIGURATION ---
:: If you want to store your assets and database on a shared drive (like Egnyte),
:: uncomment the lines below and set them to your shared folder paths.
:: Ensure the paths exist and you have write permissions.
::
set CONCEPT_DATA_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\data
set CONCEPT_UPLOADS_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\uploads
set CONCEPT_BACKGROUNDS_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\backgrounds
set CONCEPT_PORTRAITS_DIR=Z:\Shared\Pixion Games\01_Fableborne\011_Game\Content\Characters\Concept_Vault_Assets\portraits
:: -----------------------------

echo.
echo Launching the application...
echo.
start http://localhost:5173
echo Leave this window open to keep the server running!
echo Press Ctrl+C in this window to stop the server when you are done.
echo =======================================================
echo.

call npm run dev
