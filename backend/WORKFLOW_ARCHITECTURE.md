# 🔄 WORKFLOW COMPLET — Architecture des 15 endpoints

Diagramme interactif du flux complet de test avec toutes les requêtes.

---

## **🎬 FLUX GLOBAL EN 4 ÉTAPES**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ÉTAPE 1️⃣ : AUTHENTIFICATION                       │
└─────────────────────────────────────────────────────────────────────┘

    ├─ 1.1 : Register Admin
    │        POST /auth/register
    │        Body: { email: "admin@test.com", password: "admin123", },
    │        Response: { token, user: { id, email, role: "admin" } }
    │        ↓ SAVE: admin_jwt, admin_id
    │
    ├─ 1.2 : Register Technicien (en attente d'approbation)
    │        POST /auth/register
    │        Body: { email: "tech@test.com", password: "tech123" }
    │        Response: { token, user: { id, email, approved: false } }
    │        ↓ SAVE: tech_jwt, tech_id
    │
    ├─ 1.3 : Admin Login
    │        POST /auth/login
    │        Body: { email: "admin@test.com", password: "admin123" }
    │        Response: { token, user: { id, email } }
    │        ↓ REÇOIT TOKEN VALIDE (statut 200)
    │
    └─ 3.0 : Tech Login (tente connexion avant approbation)
             POST /auth/login
             Body: { email: "tech@test.com", password: "tech123" }
             Response: { error: "Technician not approved" }
             ↓ STATUT 403 (attendu ✅)


┌─────────────────────────────────────────────────────────────────────┐
│              ÉTAPE 2️⃣ : CONFIGURATION ADMIN (Setup)                  │
└─────────────────────────────────────────────────────────────────────┘

    ├─ 2.1 : List Users
    │        GET /admin/users
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Response: [ { id, email, role, approved }, ... ]
    │        ↓ VÉRIFIER QUE TECH_ID EXISTE + approved: false
    │
    ├─ 2.2 : Approve Technician
    │        PUT /admin/users/{{tech_id}}/approve
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Response: { message: "Approved", user: { approved: true } }
    │        ↓ MAINTENANT TECH PEUT SE CONNECTER
    │
    ├─ 2.3 : Create Checklist
    │        POST /checklists
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Body: { 
    │          name: "Room 101 Checklist",
    │          items: [
    │            { name: "Check 1", completed: false },
    │            { name: "Check 2", completed: false },
    │            { name: "Check 3", completed: false },
    │            { name: "Check 4", completed: false },
    │            { name: "Check 5", completed: false }
    │          ]
    │        }
    │        Response: { _id: checklist_id, name, items }
    │        ↓ SAVE: checklist_id
    │
    ├─ 2.4 : Create Room
    │        POST /rooms
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Body: {
    │          roomNumber: "101",
    │          checklist: "{{checklist_id}}"
    │        }
    │        Response: { _id: room_id, roomNumber, checklist }
    │        ↓ SAVE: room_id
    │
    ├─ 2.5 : Assign Technician to Room
    │        PUT /rooms/{{room_id}}/technicians
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Body: { technicians: ["{{tech_id}}"] }
    │        Response: { message: "Assigned", technicians: [...] }
    │        ↓ TECH PEUT VOIR LA ROOM
    │
    └─ 2.6 : View Room Details (Admin vérifie setup)
             GET /rooms/{{room_id}}/details
             Header: Authorization: Bearer {{admin_jwt}}
             Response: { 
               room: { _id, roomNumber, technicians },
               checklist: { items: [...] },
               verifications: []
             }
             ↓ STATUS 200 + room prête pour verification


┌─────────────────────────────────────────────────────────────────────┐
│         ÉTAPE 3️⃣ : VERIFICATION PAR TECHNICIEN (Photo upload)        │
└─────────────────────────────────────────────────────────────────────┘

    ├─ 3.1 : Start Verification (Créer draft)
    │        POST /verifications/rooms/{{room_id}}/start-verification
    │        Header: Authorization: Bearer {{tech_jwt}} (NEW: Tech connecté ✅)
    │        Response: { 
    │          _id: verification_id,
    │          status: "draft",
    │          items: [
    │            { index: 0, itemName: "Check 1", photo: null },
    │            { index: 1, itemName: "Check 2", photo: null },
    │            { index: 2, itemName: "Check 3", photo: null },
    │            { index: 3, itemName: "Check 4", photo: null },
    │            { index: 4, itemName: "Check 5", photo: null }
    │          ]
    │        }
    │        ↓ SAVE: verification_id
    │
    ├─ 3.2 : Add Photo Item 1 (Base64)
    │        PUT /verifications/{{verification_id}}/items/0
    │        Header: Authorization: Bearer {{tech_jwt}}
    │        Body: {
    │          photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    │        }
    │        Response: { status: "draft", items: [...] }
    │        ↓ PHOTO STOCKÉE COMME BASE64
    │
    ├─ 3.3 : Add Photo Item 2
    │        PUT /verifications/{{verification_id}}/items/1
    │        Header: Authorization: Bearer {{tech_jwt}}
    │        Body: { photo: "data:image/jpeg;base64,...}" }
    │        Response: { status: "draft", items: [...] }
    │
    ├─ 3.4 : Add Photo Item 3
    │        PUT /verifications/{{verification_id}}/items/2
    │        Header: Authorization: Bearer {{tech_jwt}}
    │        Body: { photo: "data:image/jpeg;base64,...}" }
    │        Response: { status: "draft", items: [...] }
    │
    ├─ 3.5 : Add Photo Item 4
    │        PUT /verifications/{{verification_id}}/items/3
    │        Header: Authorization: Bearer {{tech_jwt}}
    │        Body: { photo: "data:image/jpeg;base64,...}" }
    │        Response: { status: "draft", items: [...] }
    │
    ├─ 3.6 : Add Photo Item 5
    │        PUT /verifications/{{verification_id}}/items/4
    │        Header: Authorization: Bearer {{tech_jwt}}
    │        Body: { photo: "data:image/jpeg;base64,...}" }
    │        Response: { status: "draft", items: [...] }
    │        ↓ TOUTES 5 PHOTOS AJOUTÉES
    │
    └─ 3.7 : Submit Verification (Passer de draft → submitted)
             PUT /verifications/{{verification_id}}/submit
             Header: Authorization: Bearer {{tech_jwt}}
             Body: {}
             Response: { 
               _id, status: "submitted", items: [...],
               submittedAt: "2024-01-15T10:30:00Z"
             }
             ↓ TECHNICIAN A FINI → EN ATTENTE DE VALIDATION ADMIN


┌─────────────────────────────────────────────────────────────────────┐
│       ÉTAPE 4️⃣ : VALIDATION PAR ADMIN (Approval final)               │
└─────────────────────────────────────────────────────────────────────┘

    ├─ 4.1 : List Verifications pour cette Room (Admin)
    │        GET /verifications/rooms/{{room_id}}/verifications
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Response: [ 
    │          { 
    │            _id: verification_id,
    │            status: "submitted", ← À VALIDER
    │            items: [ 
    │              { index: 0, itemName: "Check 1", photo: "base64..." },
    │              ...
    │            ],
    │            submittedAt
    │          }
    │        ]
    │        ↓ ADMIN VOIT LA VERIFICATION EN ATTENTE
    │
    ├─ 4.2 : Admin Validate Verification
    │        PUT /verifications/{{verification_id}}/validate
    │        Header: Authorization: Bearer {{admin_jwt}}
    │        Body: {}
    │        Response: { 
    │          _id, status: "validated", items: [...],
    │          validatedAt: "2024-01-15T10:31:00Z"
    │        }
    │        ↓ VERIFICATION APPROUVÉE ✅
    │
    └─ 4.3 : View Final Room Details (Confirmation)
             GET /rooms/{{room_id}}/details
             Header: Authorization: Bearer {{admin_jwt}}
             Response: { 
               room: { _id, roomNumber, technicians },
               checklist: { items: [...] },
               verifications: [
                 {
                   _id, status: "validated",
                   items: [ { photo: "base64..." } ]
                 }
               ]
             }
             ↓ STATUS 200 + VERIFICATION TERMINÉE


┌─────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW COMPLET                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## **📊 MATRICE DE STATUTS**

```
Request     | Status | Auth Required | Role Required | Response Preview
─────────────────────────────────────────────────────────────────────
1.1 Register | 201    | ✅ No         | ✅ No         | { token, user }
1.2 Register | 201    | ✅ No         | ✅ No         | { token, user }
1.3 Login    | 200    | ✅ No         | ✅ No         | { token, user }
3.0 Login    | 403    | ✅ No         | ✅ No         | { error: "..." }
─────────────────────────────────────────────────────────────────────
2.1 List U.  | 200    | ✅ Yes (JWT)  | ✅ Admin      | [ users ]
2.2 Approve  | 200    | ✅ Yes (JWT)  | ✅ Admin      | { message }
2.3 Create C | 201    | ✅ Yes (JWT)  | ✅ Admin      | { _id, items }
2.4 Create R | 201    | ✅ Yes (JWT)  | ✅ Admin      | { _id, room }
2.5 Assign T | 200    | ✅ Yes (JWT)  | ✅ Admin      | { technicians }
2.6 View R   | 200    | ✅ Yes (JWT)  | ✅ Admin      | { room, check }
─────────────────────────────────────────────────────────────────────
3.1 Start V  | 201    | ✅ Yes (JWT)  | ✅ Tech       | { _id, items }
3.2-3.6 Pho  | 200    | ✅ Yes (JWT)  | ✅ Tech       | { items }
3.7 Submit   | 200    | ✅ Yes (JWT)  | ✅ Tech       | { submitted }
─────────────────────────────────────────────────────────────────────
4.1 List V   | 200    | ✅ Yes (JWT)  | ✅ Admin      | [ verific ]
4.2 Validate | 200    | ✅ Yes (JWT)  | ✅ Admin      | { validated }
4.3 View R   | 200    | ✅ Yes (JWT)  | ✅ Admin      | { room, verif }
```

---

## **🔐 FLOW AUTHENTIFICATION**

```
AVANT APPROBATION:
─────────────────

Technician enregistre (1.2)
       ↓
tech_jwt créé (mais approved: false)
       ↓
Tech essaie login (3.0) 
       ↓
❌ ERREUR 403 (not approved)
       ↓
Admin approuve (2.2)
       ↓
tech_jwt now valide ✅


APRÈS APPROBATION:
──────────────────

Tech login (3.0) 
       ↓
✅ Login réussit
       ↓
Tech utilise nouveau JWT (3.1-3.7)
       ↓
Toutes requêtes 3.x autorisées
```

---

## **📁 DONNÉES SAUVEGARDÉES DANS ENVIRONMENT**

```
Après chaque étape, Postman sauvegarde automatiquement:

Étape 1.1 (Register Admin) → Sauve:
  ├─ admin_jwt = Response.token
  ├─ admin_id = Response.user.id
  └─ base_url = "http://localhost:4000"

Étape 1.2 (Register Tech) → Sauve:
  ├─ tech_jwt = Response.token (encore invalide)
  └─ tech_id = Response.user.id

Étape 2.3 (Create Checklist) → Sauve:
  └─ checklist_id = Response._id

Étape 2.4 (Create Room) → Sauve:
  └─ room_id = Response._id

Étape 2.2 (Approve Tech) → Sauvegarde aussi:
  └─ tech_jwt_updated = Nouveau token valide

Étape 3.1 (Start Verification) → Sauve:
  └─ verification_id = Response._id

S'adapter au fur et à mesure...
```

---

## **🗄️ DONNÉES MONGODB APRÈS COMPLET**

```
collections.users:
{
  _id: ObjectId("..."),             ← admin_id
  email: "admin@test.com",
  role: "admin",
  approved: true,
  password: "$2b$10..."
}
{
  _id: ObjectId("..."),             ← tech_id
  email: "tech@test.com",
  role: "technician",
  approved: true,                   ← Changed from false
  password: "$2b$10..."
}

collections.checklists:
{
  _id: ObjectId("..."),             ← checklist_id
  name: "Room 101 Checklist",
  items: [
    { name: "Check 1", completed: false },
    { name: "Check 2", completed: false },
    { name: "Check 3", completed: false },
    { name: "Check 4", completed: false },
    { name: "Check 5", completed: false }
  ]
}

collections.rooms:
{
  _id: ObjectId("..."),             ← room_id
  roomNumber: "101",
  checklist: ObjectId("..."),       ← checklist_id
  technicians: [ ObjectId("...") ]  ← tech_id
}

collections.verifications:
{
  _id: ObjectId("..."),             ← verification_id
  room: ObjectId("..."),            ← room_id
  technician: ObjectId("..."),      ← tech_id
  status: "validated",              ← Changed: draft → submitted → validated
  items: [
    { 
      index: 0,
      itemName: "Check 1",
      photo: "data:image/jpeg;base64,/9j/4AAQSk..."  ← Base64
    },
    { 
      index: 1,
      itemName: "Check 2",
      photo: "data:image/jpeg;base64,/9j/4AAQSk..."
    },
    ... (3 autres items avec photos)
  ],
  submittedAt: "2024-01-15T10:30:00Z",
  validatedAt: "2024-01-15T10:31:00Z"
}
```

---

## **⏱️ TIMELINE ESTIMÉE**

```
Étape 1 (Auth) .................. 2 min
  1.1 Register Admin ............ 10 sec
  1.2 Register Tech ............ 10 sec
  1.3 Admin Login ............. 10 sec
  3.0 Tech Login (expect 403) .. 10 sec

Étape 2 (Setup Admin) ........... 3 min
  2.1 List Users .............. 10 sec
  2.2 Approve Tech ............ 10 sec
  2.3 Create Checklist ........ 20 sec
  2.4 Create Room ............ 20 sec
  2.5 Assign Technician ...... 10 sec
  2.6 View Room .............. 10 sec

Étape 3 (Verification Tech) ..... 5 min
  3.1 Start Verification ...... 20 sec
  3.2-3.6 Add Photos (5x) ... 2 min 40 sec (30 sec chaque)
  3.7 Submit ................. 10 sec

Étape 4 (Validation Admin) ....... 1 min
  4.1 List Verifications ...... 10 sec
  4.2 Validate ............... 10 sec
  4.3 View Room Final ........ 10 sec

─────────────────────────────────
TOTAL ....................... 11 minutes
```

---

## **✅ CHECKLIST EXÉCUTION**

```
ÉTAPE 1 - AUTH
─────────────
□ 1.1 Register Admin → Status 201 + Sauvegarde admin_jwt, admin_id
□ 1.2 Register Tech → Status 201 + Sauvegarde tech_jwt, tech_id  
□ 1.3 Admin Login → Status 200
□ 3.0 Tech Login → Status 403 (approuvé? pas encore)

ÉTAPE 2 - SETUP ADMIN
─────────────────────
□ 2.1 List Users → Voir 2 users (admin + tech non approuvé)
□ 2.2 Approve Tech → tech.approved = true maintenant
□ 2.3 Create Checklist → Sauvegarde checklist_id
□ 2.4 Create Room → Sauvegarde room_id
□ 2.5 Assign Technician → room.technicians = [tech_id]
□ 2.6 View Room → Room + Checklist + (empty verifications)

ÉTAPE 3 - VERIFICATION TECH
──────────────────────────
□ 3.1 Start Verification → Status 201, sauvegarde verification_id
□ 3.2 Add Photo Item 1 → Status 200 ✅
□ 3.3 Add Photo Item 2 → Status 200 ✅
□ 3.4 Add Photo Item 3 → Status 200 ✅
□ 3.5 Add Photo Item 4 → Status 200 ✅
□ 3.6 Add Photo Item 5 → Status 200 ✅
□ 3.7 Submit Verification → Status: "submitted"

ÉTAPE 4 - VALIDATION ADMIN
──────────────────────────
□ 4.1 List Verifications → 1 verification "submitted"
□ 4.2 Validate Verification → Status: "validated"
□ 4.3 View Room Final → Room + 5 photos stored

MONGODB VERIFY
──────────────
□ users: 2 documents (admin + tech approuvé)
□ checklists: 1 document (5 items)
□ rooms: 1 document (technician assigné)
□ verifications: 1 document (5 items avec Base64 photos)
```

---

## **🎯 CLÉS DES SUCCÈS**

### **Erreur fréquente #1: Tech ne peut pas se connecter**
```
Raison: Tech non approuvé (status 3.0 = 403)
Solution: Exécuter 2.2 (Approve) avant de refaire 3.0
```

### **Erreur fréquente #2: Photos ne se sauvegardent pas**
```
Raison: Format Base64 incorrect ou missing "data:image/jpeg;base64,"
Solution: Copier exactement le format du guide POSTMAN_COMPLETE_GUIDE.md
```

### **Erreur fréquente #3: Variables non trouvées**
```
Raison: {{verification_id}} non sauvegardé
Solution: Vérifier que 3.1 a bien exécuté avant de faire 3.2
```

---

## **🚀 QUICK REFERENCE**

### **URLs Endpoint**
```
Auth:
  POST http://localhost:4000/auth/register
  POST http://localhost:4000/auth/login

Admin:
  GET http://localhost:4000/admin/users
  PUT http://localhost:4000/admin/users/{{tech_id}}/approve
  POST http://localhost:4000/checklists
  POST http://localhost:4000/rooms
  PUT http://localhost:4000/rooms/{{room_id}}/technicians
  GET http://localhost:4000/rooms/{{room_id}}/details

Verification:
  POST http://localhost:4000/verifications/rooms/{{room_id}}/start-verification
  PUT http://localhost:4000/verifications/{{verification_id}}/items/0
  PUT http://localhost:4000/verifications/{{verification_id}}/items/1
  PUT http://localhost:4000/verifications/{{verification_id}}/items/2
  PUT http://localhost:4000/verifications/{{verification_id}}/items/3
  PUT http://localhost:4000/verifications/{{verification_id}}/items/4
  PUT http://localhost:4000/verifications/{{verification_id}}/submit
  GET http://localhost:4000/verifications/rooms/{{room_id}}/verifications
  PUT http://localhost:4000/verifications/{{verification_id}}/validate
```

### **Headers (From 2.1 onwards)**
```
Authorization: Bearer {{admin_jwt}}        ← For Admin requests
Authorization: Bearer {{tech_jwt}}         ← For Tech requests (after approved)
Content-Type: application/json             ← For all requests
```

### **Bodies (Copy-paste ready)**

**1.1 Register Admin**:
```json
{
  "email": "admin@test.com",
  "password": "admin123"
}
```

**1.2 Register Tech**:
```json
{
  "email": "tech@test.com",
  "password": "tech123"
}
```

**3.2-3.6 Add Photo**:
```json
{
  "photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
}
```

---

## **📞 SUPPORT**

- Erreurs 401/403 → Vérifier JWT dans Authorization header
- Erreurs 404 → Vérifier que l'ID (room_id, verification_id) est bon
- Erreurs 400 → Vérifier format JSON du body (sans typos)
- Photos base64 ne se sauvent pas → Vérifier format data:image/...

**Tous les détails** : Voir POSTMAN_COMPLETE_GUIDE.md

---

*Diagramme généré automatiquement pour clarté du workflow*  
*Mettre à jour si endpoints changent*  
*Maintenu pour version 2.0*

