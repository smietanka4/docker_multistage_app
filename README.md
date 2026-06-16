# Event Manage

Autor: Karol Włoczewski

## Wymagania przed uruchomieniem

Zanim rozpoczniesz, upewnij się, że posiadasz zainstalowane na swoim komputerze:

- **Docker**
- Przeglądarkę internetową :)

---

## Instrukcja Uruchomienia Krok po Kroku

Ponieważ ze względów bezpieczeństwa pliki z hasłami i zmiennymi środowiskowymi (tzw. sekrety) nie są załączane do repozytorium kodu, musisz wygenerować je ręcznie.

### 1. Stworzenie folderu z Sekretami (Docker Secrets)

Aby zabezpieczyć bazy danych przed wstrzykiwaniem haseł w otwartym tekście, potrzebny nam jest folder `secrets`.

W głównym katalogu projektu utwórz folder o nazwie `secrets`. Następnie stwórz w nim 4 pliki tekstowe, a do każdego z nich wpisz hasło, tak jak pokazano poniżej (bez dodatkowych spacji na końcu):

1. `secrets/db_user.txt` (np. wpisz w nim: `app_user`)
2. `secrets/db_password.txt` (np. wpisz w nim: `app_pass_123`)
3. `secrets/keycloak_db_user.txt` (np. wpisz w nim: `keycloak`)
4. `secrets/keycloak_db_password.txt` (np. wpisz w nim: `keycloak_pass`)

_(Możesz to zrobić automatycznie w terminalu używając poniższych komend w systemach Unix/Linux):_

```bash
mkdir -p secrets
echo -n "app_user" > secrets/db_user.txt
echo -n "app_pass_123" > secrets/db_password.txt
echo -n "keycloak" > secrets/keycloak_db_user.txt
echo -n "keycloak_pass" > secrets/keycloak_db_password.txt
```

### 2. Utworzenie pliku konfiguracyjnego `.env`

W głównym katalogu projektu stwórz plik `.env` i po prostu skopiuj do niego zawartość z pliku .env.example i ustaw konfiguracje wedle swoich założeń

```env
# --- SERVER SETTINGS ---
BACKEND_PORT=3001
BACKEND2_PORT=3002
FRONTEND_PORT=8080

# --- DATABASE SETTINGS ---
DB_HOST=postgres-db
DB_PORT=5432
DB_NAME=events_db

# --- REDIS SETTINGS ---
REDIS_HOST=redis-cache
REDIS_PORT=6379

# --- KEYCLOAK SETTINGS ---
KEYCLOAK_HOST=keycloak:8080
KEYCLOAK_REALM=myapp
KEYCLOAK_PUBLIC_URL=http://localhost:8080
```

### 3. Zbudowanie i odpalenie kontenerów

Gdy pliki konfiguracyjne są na miejscu, całą architekturę postawisz za pomocą jednej komendy. W głównym katalogu wykonaj (docker_multistage_app/):

```bash
docker-compose up --build -d
```

Parametr `-d` uruchomi całą chmarę w tle, nie blokując Twojego terminala.

### 4. Konfiguracja Keycloaka (Authorization Server)

Podniesienie środowiska to jeszcze nie koniec! Ze względu na brak pre-zbudowanego pliku bazy Keycloaka, musisz na szybko stworzyć tzw. Realm, w którym aplikacja będzie się logować:

1. Otwórz w przeglądarce: **http://localhost:8080/admin**
2. Zaloguj się domyślnym kontem administratora: **Login:** `admin` | **Hasło:** `admin` (te dane są zdefiniowane na twardo w pliku _docker-compose.yml_).
3. W lewym górnym rogu, pod logo Keycloak najedź na "Master" i kliknij **Create Realm**.
4. Wpisz nazwę **`myapp`** (nazwa ta musi być identyczna jak ta w Twoim pliku `.env`) i utwórz realm.
5. Z menu po lewej wybierz **Clients**, kliknij **Create client**.
   - **Client ID**: wpisz `frontend`
   - Kliknij _Next_.
   - Upewnij się, że włączone jest **Standard flow**, kliknij _Next_.
   - W sekcji **Valid redirect URIs** dodaj dwa adresy: `http://localhost/callback` oraz `http://localhost/*`.
   - W sekcji **Web origins** koniecznie dodaj znak plusa: `+`. Zapisz klienta.
6. Z menu po lewej wybierz **Users**, kliknij **Add user**. Wpisz mu jakiś _Username_, kliknij _Create_. Następnie przejdź do jego zakładki **Credentials**, ustaw mu jakieś hasło i **odznacz** _Temporary_.
7. Aby przetestować w pełni zabezpieczenia aplikacji, upewnij się, że w zakładce **Realm Roles** (po lewej stronie) dodałeś rolę o nazwie `admin`, a następnie w zakładce **Role Mapping** na konkretnym użytkowniku, przypisałeś mu tę rolę (dzięki temu będzie mógł usuwać posty w systemie).

---

## Gratulacje!

Wszystko jest gotowe! Wejdź na **http://localhost** aby podziwiać swoją zapezbieczoną aplikacje.
Do bazy danych możesz zajrzeć lokalnie wchodząc na **http://localhost:5050** (pgAdmin). Po uprzednim odpaleniu go komendą:

```bash
docker compose --profile debug up -d
```

W razie pytań, przejrzyj plik _docker-compose.yml_ - jest on mapą całej tej infrastruktury.
