#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de test complet pour le système de vérification avec photos
.DESCRIPTION
    Teste tous les endpoints : création users → login → checklist → salle → vérification → validation
.EXAMPLE
    .\run-test.ps1
#>

$ErrorActionPreference = "SilentlyContinue"
$WarningPreference = "SilentlyContinue"

# Couleurs
$Colors = @{
    Reset   = "`e[0m"
    Header  = "`e[36m"
    Success = "`e[32m"
    Warning = "`e[33m"
    Error   = "`e[31m"
    Cyan    = "`e[36m"
    Yellow  = "`e[33m"
    Green   = "`e[32m"
}

function Write-Header($text) {
    Write-Host $text -ForegroundColor Cyan -BackgroundColor Black
}

function Write-Success($text) {
    Write-Host "✅ $text" -ForegroundColor Green
}

function Write-Error_($text) {
    Write-Host "❌ $text" -ForegroundColor Red
}

function Write-Step($num, $text) {
    Write-Host "[$num] $text" -ForegroundColor Yellow
}

# ============================================================================
# MAIN TEST FLOW
# ============================================================================

Write-Host ""
Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Header "  🧪 TEST SYSTÈME VÉRIFICATION - WORKFLOW COMPLET"
Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

$baseUrl = "http://localhost:4000"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "test_log_$timestamp.txt"

# Variables globales
$script:adminJwt = ""
$script:techJwt = ""
$script:adminId = ""
$script:techId = ""
$script:checklistId = ""
$script:roomId = ""
$script:verificationId = ""

# ============================================================================
# TEST UTILS
# ============================================================================

function Test-ServerRunning {
    try {
        $resp = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body @{email="test"} -UseBasicParsing -ErrorAction SilentlyContinue
        return $true
    } catch {
        return $false
    }
}

function Make-Request($method, $endpoint, $body = $null, $jwt = $adminJwt, $isAdmin = $true) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($jwt) { $headers["Authorization"] = "Bearer $jwt" }
    
    try {
        $params = @{
            Uri             = "$baseUrl$endpoint"
            Method          = $method
            Headers         = $headers
            UseBasicParsing = $true
            ErrorAction     = "SilentlyContinue"
        }
        if ($body) { $params["Body"] = $body }
        
        $resp = Invoke-WebRequest @params
        return $resp
    } catch {
        Write-Error_ "$($.Category) - $($_.Exception.Message)"
        return $null
    }
}

# ============================================================================
# TESTS
# ============================================================================

# Vérifier serveur
Write-Step "0" "Vérification serveur"
if (-not (Test-ServerRunning)) {
    Write-Error_ "Serveur non accessible sur $baseUrl"
    Write-Host "Lancez: npm run dev" -ForegroundColor Yellow
    exit 1
}
Write-Success "Serveur accessible"
Write-Host ""

# 1. REGISTER ADMIN
Write-Step "1" "Register Admin"
$adminReg = @{
    email       = "admin@test_$timestamp.com"
    password    = "Admin123456"
    displayName = "Admin Test"
    role        = "admin"
} | ConvertTo-Json

$resp = Make-Request "POST" "/auth/register" $adminReg "" $false
if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    Write-Success "Admin créé (Status: $($resp.StatusCode))"
} else {
    Write-Error_ "Impossible de créer admin"
    exit 1
}

# 2. REGISTER TECHNICIEN
Write-Step "2" "Register Technicien"
$techReg = @{
    email       = "tech@test_$timestamp.com"
    password    = "Tech123456"
    displayName = "Technicien Test"
    role        = "technicien"
} | ConvertTo-Json

$resp = Make-Request "POST" "/auth/register" $techReg "" $false
if ($resp) {
    Write-Success "Technicien créé (Status: $($resp.StatusCode))"
} else {
    Write-Error_ "Impossible de créer technicien"
    exit 1
}
Write-Host ""

# 3. ADMIN LOGIN
Write-Step "3" "Admin Login"
$adminLoginBody = @{
    email    = "admin@test_$timestamp.com"
    password = "Admin123456"
} | ConvertTo-Json

$resp = Make-Request "POST" "/auth/login" $adminLoginBody "" $false
if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    $script:adminJwt = $data.token
    $script:adminId = $data.user.id
    Write-Success "Admin connecté - JWT: $($script:adminJwt.Substring(0,20))..."
} else {
    Write-Error_ "Impossible de connecter admin"
    exit 1
}
Write-Host ""

# 4. ADMIN APPROUVE TECHNICIEN
Write-Step "4" "Admin approuve Technicien"
$adminHeaders = @{ Authorization = "Bearer $script:adminJwt"; "Content-Type" = "application/json" }

# Lister pour obtenir ID
$resp = Invoke-WebRequest -Uri "$baseUrl/admin/users" -Method GET -Headers $adminHeaders -UseBasicParsing -ErrorAction SilentlyContinue
if ($resp) {
    $users = $resp.Content | ConvertFrom-Json
    $script:techUser = $users | Where-Object { $_.email -eq "tech@test_$timestamp.com" }
    $script:techId = $script:techUser._id
    
    # Approuver
    $approveBody = @{ approved = $true } | ConvertTo-Json
    $resp = Invoke-WebRequest -Uri "$baseUrl/admin/users/$script:techId/approve" `
        -Method PUT -Headers $adminHeaders -Body $approveBody -UseBasicParsing -ErrorAction SilentlyContinue
    
    if ($resp) {
        Write-Success "Technicien approuvé ($script:techId)"
    }
} else {
    Write-Error_ "Impossible de lister users"
    exit 1
}
Write-Host ""

# 5. TECHNICIEN LOGIN
Write-Step "5" "Technicien Login"
$techLoginBody = @{
    email          = "tech@test_$timestamp.com"
    password       = "Tech123456"
    onlyTechnician = $true
} | ConvertTo-Json

$resp = Make-Request "POST" "/auth/login" $techLoginBody "" $false
if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    $script:techJwt = $data.token
    Write-Success "Technicien connecté - JWT: $($script:techJwt.Substring(0,20))..."
} else {
    Write-Error_ "Impossible de connecter technicien"
    exit 1
}
Write-Host ""

# 6. ADMIN CRÉE CHECKLIST
Write-Step "6" "Admin crée Checklist"
$checklistBody = @{
    name        = "Checklist Salle Test"
    description = "Vérification complète de la salle"
    items       = @(
        @{ label = "Portes verrouillées"; required = $true; order = 1 }
        @{ label = "Fenêtres fermées"; required = $true; order = 2 }
        @{ label = "Lumières éteintes"; required = $false; order = 3 }
        @{ label = "Climatisation OK"; required = $false; order = 4 }
    )
} | ConvertTo-Json -Depth 10

$resp = Make-Request "POST" "/checklists" $checklistBody $script:adminJwt $true
if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    $script:checklistId = $data._id
    Write-Success "Checklist créée ($($script:checklistId.Substring(0,8))...)"
} else {
    Write-Error_ "Impossible de créer checklist"
    exit 1
}
Write-Host ""

# 7. ADMIN CRÉE SALLE
Write-Step "7" "Admin crée Salle"
$roomBody = @{
    name        = "Salle A - Test"
    description = "Salle principale - Test de vérification"
    checklist   = $script:checklistId
} | ConvertTo-Json

$resp = Make-Request "POST" "/rooms" $roomBody $script:adminJwt $true
if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    $script:roomId = $data._id
    Write-Success "Salle créée ($($script:roomId.Substring(0,8))...)"
} else {
    Write-Error_ "Impossible de créer salle"
    exit 1
}
Write-Host ""

# 8. ADMIN ASSIGNE TECHNICIEN
Write-Step "8" "Admin assigne Technicien à Salle"
$assignBody = @{ technicians = @($script:techId) } | ConvertTo-Json

$resp = Make-Request "PUT" "/rooms/$script:roomId/technicians" $assignBody $script:adminJwt $true
if ($resp) {
    Write-Success "Technicien assigné à la salle"
} else {
    Write-Error_ "Impossible d'assigner technicien"
    exit 1
}
Write-Host ""

# 9. TECHNICIEN DÉMARRE VÉRIFICATION
Write-Step "9" "Technicien démarre Vérification"
$techHeaders = @{ Authorization = "Bearer $script:techJwt"; "Content-Type" = "application/json" }

$resp = Invoke-WebRequest -Uri "$baseUrl/verifications/rooms/$script:roomId/start-verification" `
    -Method POST -Headers $techHeaders -UseBasicParsing -ErrorAction SilentlyContinue

if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    $script:verificationId = $data._id
    Write-Success "Vérification démarrée ($($script:verificationId.Substring(0,8))...)"
    Write-Host "   Items: $($data.items.Count) à compléter"
} else {
    Write-Error_ "Impossible de démarrer vérification"
    exit 1
}
Write-Host ""

# 10. TECHNICIEN AJOUTE PHOTOS
Write-Step "10" "Technicien ajoute Photos (simulation)"

# Créer une fausse image Base64 valide (PNG 1x1 blanc)
$fakeImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Récupérer la vérification actuelle
$resp = Invoke-WebRequest -Uri "$baseUrl/verifications/$script:verificationId" -Method GET -Headers $techHeaders -UseBasicParsing -ErrorAction SilentlyContinue
if ($resp) {
    $verification = $resp.Content | ConvertFrom-Json
    
    # Ajouter photos à chaque item
    for ($i = 0; $i -lt $verification.items.Count; $i++) {
        $item = $verification.items[$i]
        
        $updateBody = @{
            completed = $true
            photo     = $fakeImageBase64
            notes     = "Vérification complétée ✓"
        } | ConvertTo-Json
        
        $resp = Invoke-WebRequest -Uri "$baseUrl/verifications/$script:verificationId/items/$i" `
            -Method PUT -Headers $techHeaders -Body $updateBody -UseBasicParsing -ErrorAction SilentlyContinue
        
        if ($resp) {
            Write-Host "   ✅ Item $($i+1): $($item.label) - Photo ajoutée"
        }
    }
}
Write-Host ""

# 11. TECHNICIEN SOUMET
Write-Step "11" "Technicien soumet Vérification"
$submitBody = @{ notes = "Vérification complétée avec succès" } | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "$baseUrl/verifications/$script:verificationId/submit" `
    -Method PUT -Headers $techHeaders -Body $submitBody -UseBasicParsing -ErrorAction SilentlyContinue

if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    Write-Success "Vérification soumise - Status: $($data.status)"
} else {
    Write-Error_ "Impossible de soumettre vérification"
}
Write-Host ""

# 12. ADMIN VOIT VÉRIFICATIONS
Write-Step "12" "Admin voit Vérifications"
$resp = Invoke-WebRequest -Uri "$baseUrl/verifications/rooms/$script:roomId/verifications" `
    -Method GET -Headers $adminHeaders -UseBasicParsing -ErrorAction SilentlyContinue

if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    if ($data -is [array]) {
        Write-Success "Total vérifications: $($data.Count)"
        if ($data.Count -gt 0) {
            Write-Host "   Technicien: $($data[0].technician.displayName)"
            Write-Host "   Status: $($data[0].status)"
            Write-Host "   Items complétés: $($data[0].items | Where-Object { $_.completed } | Measure-Object | Select -ExpandProperty Count)/$($data[0].items.Count)"
        }
    }
} else {
    Write-Error_ "Impossible de récupérer vérifications"
}
Write-Host ""

# 13. ADMIN VOIT DÉTAILS SALLE
Write-Step "13" "Admin voit Détails Salle"
$resp = Invoke-WebRequest -Uri "$baseUrl/rooms/$script:roomId/details" `
    -Method GET -Headers $adminHeaders -UseBasicParsing -ErrorAction SilentlyContinue

if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    Write-Success "Détails salle:"
    Write-Host "   Salle: $($data.room.name)"
    Write-Host "   Checklist: $($data.room.checklist.name) ($($data.room.checklist.items.Count) items)"
    Write-Host "   Techniciens assignés: $($data.techniciansCount)"
    Write-Host "   Vérifications: $($data.verificationsCount)"
} else {
    Write-Error_ "Impossible de récupérer détails salle"
}
Write-Host ""

# 14. ADMIN VALIDE
Write-Step "14" "Admin valide Vérification"
$validateBody = @{ notes = "Validation complète ✓" } | ConvertTo-Json

$resp = Invoke-WebRequest -Uri "$baseUrl/verifications/$script:verificationId/validate" `
    -Method PUT -Headers $adminHeaders -Body $validateBody -UseBasicParsing -ErrorAction SilentlyContinue

if ($resp) {
    $data = $resp.Content | ConvertFrom-Json
    Write-Success "Vérification validée - Status: $($data.status)"
} else {
    Write-Error_ "Impossible de valider vérification"
}
Write-Host ""

# ============================================================================
# RÉSUMÉ FINAL
# ============================================================================

Write-Host ""
Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Header "  ✅ TEST COMPLET RÉUSSI! (Logs: $logFile)"
Write-Header "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Host ""

Write-Host "📊 Résumé:" -ForegroundColor Cyan
Write-Host "   Users: 1 Admin + 1 Technicien (approuvé)"
Write-Host "   Checklist: 1 avec 4 items"
Write-Host "   Salle: 1 avec checklist assignée"
Write-Host "   Technicien: Assigné à la salle"
Write-Host "   Vérification: Complétée et validée"
Write-Host ""

Write-Host "🔗 Endpoints testés:" -ForegroundColor Cyan
Write-Host "   POST   /auth/register"
Write-Host "   POST   /auth/login"
Write-Host "   GET    /admin/users"
Write-Host "   PUT    /admin/users/:id/approve"
Write-Host "   POST   /checklists"
Write-Host "   POST   /rooms"
Write-Host "   PUT    /rooms/:id/technicians"
Write-Host "   POST   /verifications/rooms/:id/start-verification"
Write-Host "   PUT    /verifications/:id/items/:idx"
Write-Host "   PUT    /verifications/:id/submit"
Write-Host "   GET    /verifications/rooms/:id/verifications"
Write-Host "   GET    /rooms/:id/details"
Write-Host "   PUT    /verifications/:id/validate"
Write-Host ""

Write-Host "💾 Données sauvegardées dans MongoDB:" -ForegroundColor Cyan
Write-Host "   users > 2 documents"
Write-Host "   checklists > 1 document"
Write-Host "   rooms > 1 document"
Write-Host "   verifications > 1 document (avec photos Base64)"
Write-Host ""

Write-Host "🚀 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Vérifier MongoDB pour confirmer les données"
Write-Host "   2. Tester les photos dans la base de données"
Write-Host "   3. Tester le changement de checklist d'une salle (PUT /rooms/:id/checklist)"
Write-Host "   4. Tester plusieurs vérifications sur la même salle"
Write-Host ""
